import argon2 from 'argon2';
import { describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { adminTrackSchema, type AdminRepository } from './admin.js';
import type { Repository } from './repository.js';

const publicRepository = {
  listOrigins: async () => [],
  listNeeds: async () => [],
  recommendationCandidates: async () => [],
  getTrack: async () => null,
  findReflectionByIdempotency: async () => null,
  createReflection: async () => {
    throw new Error('unused');
  },
  getReflectionByShareCode: async () => null,
  deleteReflection: async () => undefined,
  createEvent: async () => undefined,
} satisfies Repository;

describe('admin API', () => {
  it('rejects unauthenticated requests and accepts a valid secure session', async () => {
    const passwordHash = await argon2.hash('correct horse battery staple');
    const adminRepository: AdminRepository = {
      findAdminByUsername: async (username) =>
        username === 'admin' ? { id: 'admin-1', username, passwordHash } : null,
      listTracks: async () => [{ id: 'track-1', title: '测试曲目', status: 'DRAFT' }],
      saveTrack: async () => ({ id: 'track-1' }),
      listReflections: async () => [],
      metrics: async () => ({ visitors: 0, reflections: 0, shareIntents: 0, shareVisits: 0 }),
      catalogCoverage: async () => ({ total: 36, covered: 36, errors: [] }),
    };
    const app = await buildApp({
      repository: publicRepository,
      adminRepository,
      cookieSecret: 'test-secret-with-more-than-thirty-two-characters',
      origin: 'https://pandaprivate.top',
    });

    expect((await app.inject({ url: '/api/admin/tracks' })).statusCode).toBe(401);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/admin/login',
          headers: { origin: 'https://attacker.example' },
          payload: { username: 'admin', password: 'correct horse battery staple' },
        })
      ).statusCode,
    ).toBe(403);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/admin/login',
          headers: { origin: 'https://pandaprivate.top' },
          payload: { username: 'admin', password: 'wrong password' },
        })
      ).statusCode,
    ).toBe(401);
    const login = await app.inject({
      method: 'POST',
      url: '/api/admin/login',
      headers: { origin: 'https://pandaprivate.top' },
      payload: { username: 'admin', password: 'correct horse battery staple' },
    });
    expect(login.statusCode).toBe(204);
    const cookie = login.cookies.find(({ name }) => name === 'qj_admin');
    expect(cookie?.httpOnly).toBe(true);
    const tracks = await app.inject({
      url: '/api/admin/tracks',
      headers: { cookie: `qj_admin=${cookie?.value}` },
    });
    expect(tracks.statusCode).toBe(200);
    expect(tracks.json()[0].title).toBe('测试曲目');
    const coverage = await app.inject({
      url: '/api/admin/catalog-coverage',
      headers: { cookie: `qj_admin=${cookie?.value}` },
    });
    expect(coverage.json()).toEqual({ total: 36, covered: 36, errors: [] });
    await app.close();
  });

  it('rejects lookalike Bilibili hostnames', () => {
    const result = adminTrackSchema.safeParse({
      title: '测试',
      composer: '测试',
      category: '测试',
      durationText: '3 分钟',
      bilibiliUrl: 'https://evilbilibili.com/video/BV1',
      searchKeywords: '测试',
      difficulty: 1,
      status: 'DRAFT',
      origins: [{ originId: 'origin-1', weight: 1, reason: '测试' }],
      needs: [{ needId: 'need-1', weight: 1, reason: '测试' }],
      guide: {
        title: '测试',
        intro: '测试',
        firstImpression: '测试',
        background: '测试',
        listeningPoints: '测试',
        emotionalInterpretation: '测试',
        reflectionQuestion: '测试',
        takeaway: '测试',
      },
    });

    expect(result.success).toBe(false);
  });
});
