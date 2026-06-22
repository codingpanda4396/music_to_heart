import { createHmac, timingSafeEqual } from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import argon2 from 'argon2';
import { z } from 'zod';

const loginSchema = z.object({
  username: z.string().trim().min(1).max(80),
  password: z.string().min(12).max(200),
});

export const adminTrackSchema = z
  .object({
    id: z.string().optional(),
    title: z.string().trim().min(1).max(200),
    composer: z.string().trim().min(1).max(160),
    performer: z.string().trim().max(160).nullable().optional(),
    category: z.string().trim().min(1).max(80),
    period: z.string().trim().max(80).nullable().optional(),
    durationText: z.string().trim().min(1).max(40),
    bilibiliUrl: z
      .string()
      .url()
      .refine((value) => {
        const hostname = new URL(value).hostname;
        return hostname === 'bilibili.com' || hostname.endsWith('.bilibili.com');
      }, '必须是 B站链接'),
    bilibiliBvid: z.string().trim().max(32).nullable().optional(),
    searchKeywords: z.string().trim().min(1).max(300),
    difficulty: z.number().int().min(1).max(5),
    status: z.enum(['DRAFT', 'PUBLISHED']),
    origins: z
      .array(
        z.object({
          originId: z.string().min(1),
          weight: z.number().int().min(1).max(5),
          reason: z.string().trim().min(1).max(300),
        }),
      )
      .min(1),
    needs: z
      .array(
        z.object({
          needId: z.string().min(1),
          weight: z.number().int().min(1).max(5),
          reason: z.string().trim().min(1).max(300),
        }),
      )
      .min(1),
    guide: z.object({
      title: z.string().trim().min(1).max(160),
      intro: z.string().trim().min(1).max(1200),
      firstImpression: z.string().trim().min(1).max(1200),
      background: z.string().trim().min(1).max(2000),
      listeningPoints: z.string().trim().min(1).max(2000),
      emotionalInterpretation: z.string().trim().min(1).max(2000),
      reflectionQuestion: z.string().trim().min(1).max(300),
      takeaway: z.string().trim().min(1).max(300),
    }),
  })
  .superRefine((value, context) => {
    if (value.status === 'PUBLISHED' && (value.origins.length < 1 || value.needs.length < 1)) {
      context.addIssue({
        code: 'custom',
        path: ['origins'],
        message: '发布曲目必须同时关联起点与去向',
      });
    }
  });

export type AdminTrackInput = z.infer<typeof adminTrackSchema>;

export interface AdminRepository {
  findAdminByUsername(username: string): Promise<{
    id: string;
    username: string;
    passwordHash: string;
  } | null>;
  listTracks(): Promise<unknown[]>;
  saveTrack(input: AdminTrackInput): Promise<{ id: string }>;
  listReflections(): Promise<unknown[]>;
  metrics(): Promise<{
    visitors: number;
    reflections: number;
    shareIntents: number;
    shareVisits: number;
  }>;
  catalogCoverage(): Promise<{ total: number; covered: number; errors: string[] }>;
}

function signSession(adminId: string, secret: string): string {
  const expiresAt = Date.now() + 8 * 60 * 60 * 1000;
  const payload = `${adminId}.${expiresAt}`;
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function verifySession(value: string | undefined, secret: string): boolean {
  if (!value) return false;
  const [adminId, expires, signature] = value.split('.');
  if (!adminId || !expires || !signature || Number(expires) < Date.now()) return false;
  const expected = createHmac('sha256', secret).update(`${adminId}.${expires}`).digest('base64url');
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function registerAdminRoutes(
  app: FastifyInstance,
  repository: AdminRepository,
  options: { cookieSecret: string; origin: string },
) {
  const requireOrigin = (request: FastifyRequest) => {
    if (request.headers.origin && request.headers.origin !== options.origin) {
      const error = new Error('来源无效') as Error & { statusCode?: number };
      error.statusCode = 403;
      throw error;
    }
  };
  const requireAdmin = (request: FastifyRequest) =>
    verifySession(request.cookies.qj_admin, options.cookieSecret);

  app.post(
    '/api/admin/login',
    { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } },
    async (request, reply) => {
      requireOrigin(request);
      const input = loginSchema.parse(request.body);
      const admin = await repository.findAdminByUsername(input.username);
      if (!admin || !(await argon2.verify(admin.passwordHash, input.password))) {
        return reply.code(401).send({ error: '用户名或密码错误' });
      }
      reply.setCookie('qj_admin', signSession(admin.id, options.cookieSecret), {
        path: '/',
        httpOnly: true,
        secure: options.origin.startsWith('https://'),
        sameSite: 'strict',
        maxAge: 8 * 60 * 60,
      });
      return reply.code(204).send();
    },
  );

  app.post('/api/admin/logout', async (request, reply) => {
    requireOrigin(request);
    reply.clearCookie('qj_admin', { path: '/' });
    return reply.code(204).send();
  });

  app.addHook('preHandler', async (request, reply) => {
    if (!request.url.startsWith('/api/admin/') || request.url.endsWith('/login')) return;
    if (!requireAdmin(request)) return reply.code(401).send({ error: '请先登录' });
    if (request.method !== 'GET') requireOrigin(request);
  });

  app.get('/api/admin/tracks', async () => repository.listTracks());
  app.post('/api/admin/tracks', async (request, reply) => {
    const result = await repository.saveTrack(adminTrackSchema.parse(request.body));
    return reply.code(201).send(result);
  });
  app.put<{ Params: { id: string } }>('/api/admin/tracks/:id', async (request) =>
    repository.saveTrack(
      adminTrackSchema.parse({ ...(request.body as object), id: request.params.id }),
    ),
  );
  app.get('/api/admin/reflections', async () => repository.listReflections());
  app.get('/api/admin/metrics', async () => repository.metrics());
  app.get('/api/admin/catalog-coverage', async () => repository.catalogCoverage());
}
