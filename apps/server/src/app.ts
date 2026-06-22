import { randomBytes } from 'node:crypto';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import { createReflectionSchema, eventSchema, recommendRequestSchema } from '@qujing/shared';
import argon2 from 'argon2';
import Fastify from 'fastify';
import { ZodError } from 'zod';
import { registerAdminRoutes, type AdminRepository } from './admin.js';
import type { Repository } from './repository.js';
import { rankRecommendations } from './services/recommendation.js';
import { renderShareCard, renderShareHtml } from './services/share-card.js';

export interface AppOptions {
  repository: Repository;
  version?: string;
  origin?: string;
  logger?: boolean;
  adminRepository?: AdminRepository;
  cookieSecret?: string;
  staticDir?: string;
}

export async function buildApp(options: AppOptions) {
  const app = Fastify({
    logger: options.logger
      ? {
          serializers: {
            req(request) {
              return {
                method: request.method,
                url: request.url,
                host: request.headers.host,
              };
            },
          },
        }
      : false,
    trustProxy: true,
  });
  const origin = options.origin ?? 'http://localhost:3000';
  await app.register(cookie);
  await app.register(rateLimit, { max: 120, timeWindow: '1 minute' });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({ error: '请求内容无效', details: error.issues });
    }
    const reportedStatus =
      typeof error === 'object' && error !== null && 'statusCode' in error
        ? error.statusCode
        : undefined;
    const statusCode =
      typeof reportedStatus === 'number' && reportedStatus >= 400 && reportedStatus < 500
        ? reportedStatus
        : 500;
    const message = error instanceof Error ? error.message : '请求无效';
    if (statusCode === 500) app.log.error(error);
    return reply.code(statusCode).send({ error: statusCode === 500 ? '服务暂时不可用' : message });
  });

  app.get('/healthz', async () => ({ status: 'ok' }));
  app.get('/readyz', async (_request, reply) => {
    await options.repository.ping?.();
    return reply.send({ status: 'ready' });
  });
  app.get('/version', async () => ({ version: options.version ?? 'dev' }));

  app.get('/api/origins', async () => options.repository.listOrigins());
  app.get('/api/needs', async () => options.repository.listNeeds());

  app.post('/api/recommend', async (request, reply) => {
    const input = recommendRequestSchema.parse(request.body);
    const candidates = await options.repository.recommendationCandidates(
      input.originId,
      input.needId,
    );
    const selected = rankRecommendations(candidates, input.excludeTrackIds)[0];
    if (!selected) return reply.code(404).send({ error: '适合这段旅程的曲目已经看完了' });
    return {
      track: selected.track,
      reason: `${selected.originReason}\n\n${selected.needReason}`,
    };
  });

  app.get<{ Params: { id: string } }>('/api/tracks/:id', async (request, reply) => {
    const track = await options.repository.getTrack(request.params.id);
    return track ?? reply.code(404).send({ error: '没有找到这首曲目' });
  });

  app.post('/api/events', async (request, reply) => {
    const event = eventSchema.parse(request.body);
    await options.repository.createEvent(event);
    return reply.code(202).send({ accepted: true });
  });

  app.post('/api/reflections', async (request, reply) => {
    const input = createReflectionSchema.parse(request.body);
    const existing = await options.repository.findReflectionByIdempotency(input.idempotencyKey);
    if (existing) {
      return reply.send({
        reflectionId: existing.id,
        shareCode: existing.shareCode,
        shareUrl: `${origin}/s/${existing.shareCode}`,
      });
    }

    const shareCode = randomBytes(18).toString('base64url');
    const deletionToken = randomBytes(24).toString('base64url');
    const reflection = await options.repository.createReflection({
      ...input,
      shareCode,
      deletionTokenHash: await argon2.hash(deletionToken),
    });
    return reply.code(201).send({
      reflectionId: reflection.id,
      shareCode,
      shareUrl: `${origin}/s/${shareCode}`,
      deletionToken,
    });
  });

  app.delete<{ Params: { shareCode: string } }>(
    '/api/reflections/:shareCode',
    async (request, reply) => {
      const reflection = await options.repository.getReflectionByShareCode(
        request.params.shareCode,
      );
      if (!reflection) return reply.code(404).send({ error: '听感不存在' });
      const token = request.headers.authorization?.replace(/^Bearer\s+/i, '') ?? '';
      if (!token || !(await argon2.verify(reflection.deletionTokenHash, token))) {
        return reply.code(403).send({ error: '删除凭证无效' });
      }
      await options.repository.deleteReflection(reflection.id);
      return reply.code(204).send();
    },
  );

  app.get<{ Params: { shareCode: string } }>('/s/:shareCode', async (request, reply) => {
    const reflection = await options.repository.getReflectionByShareCode(request.params.shareCode);
    if (!reflection) return reply.code(404).type('text/html').send('<h1>这张听感已不存在</h1>');
    const anonymousId = request.cookies.qj_aid ?? `anonymous-${randomBytes(12).toString('hex')}`;
    if (!request.cookies.qj_aid) {
      reply.setCookie('qj_aid', anonymousId, {
        httpOnly: true,
        sameSite: 'lax',
        secure: origin.startsWith('https://'),
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
      });
    }
    void options.repository
      .createEvent({
        eventName: 'share_visit',
        anonymousId,
        journeyId: `journey-${randomBytes(12).toString('hex')}`,
        shareCode: reflection.shareCode,
      })
      .catch((error: unknown) => app.log.warn({ error }, 'share visit event failed'));
    return reply.type('text/html; charset=utf-8').send(renderShareHtml(reflection, origin));
  });

  app.get<{ Params: { shareCode: string } }>('/s/:shareCode/card.png', async (request, reply) => {
    const reflection = await options.repository.getReflectionByShareCode(request.params.shareCode);
    if (!reflection) return reply.code(404).send({ error: '听感不存在' });
    const image = await renderShareCard(reflection);
    return reply
      .header('Cache-Control', 'public, max-age=86400, immutable')
      .type('image/png')
      .send(image);
  });

  if (options.adminRepository) {
    await registerAdminRoutes(app, options.adminRepository, {
      cookieSecret: options.cookieSecret ?? 'development-cookie-secret-change-me',
      origin,
    });
  }

  if (options.staticDir) {
    await app.register(fastifyStatic, { root: options.staticDir, prefix: '/' });
    app.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith('/api/') || request.url.startsWith('/s/')) {
        return reply.code(404).send({ error: '没有找到这个地址' });
      }
      return reply.sendFile('index.html');
    });
  }

  await app.ready();
  return app;
}
