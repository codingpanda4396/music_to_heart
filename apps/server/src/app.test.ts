import { describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import type { Repository, StoredReflection } from './repository.js';

function repositoryFixture(): Repository {
  const reflections = new Map<string, StoredReflection>();
  return {
    listMoods: async () => [
      { id: 'mood-anxiety', name: '焦虑', slug: 'anxiety', description: '我停不下来' },
    ],
    recommendationCandidates: async () => [
      {
        trackId: 'track-bach',
        weight: 90,
        reason: '让秩序缓慢回来。',
        track: {
          id: 'track-bach',
          title: '《哥德堡变奏曲》咏叹调',
          composer: 'J. S. Bach',
          performer: null,
          category: '西方古典',
          durationText: '约 5 分钟',
          bilibiliUrl: 'https://www.bilibili.com/video/BVtest',
          searchKeywords: '巴赫 哥德堡变奏曲 咏叹调',
        },
      },
    ],
    getTrack: async (id) =>
      id === 'track-bach'
        ? {
            id: 'track-bach',
            title: '《哥德堡变奏曲》咏叹调',
            composer: 'J. S. Bach',
            performer: null,
            category: '西方古典',
            durationText: '约 5 分钟',
            bilibiliUrl: 'https://www.bilibili.com/video/BVtest',
            searchKeywords: '巴赫 哥德堡变奏曲 咏叹调',
            moods: [{ id: 'mood-anxiety', name: '焦虑', slug: 'anxiety' }],
            guide: {
              title: '先别急着听懂它',
              intro: '让声音先抵达。',
              firstImpression: '稳定而清晰。',
              background: '一个咏叹调与三十个变奏。',
              listeningPoints: '听低音如何托住变化。',
              emotionalInterpretation: '秩序并不意味着僵硬。',
              reflectionQuestion: '你想先恢复哪一种秩序？',
              takeaway: '慢慢回来。',
            },
          }
        : null,
    findReflectionByIdempotency: async (key) =>
      [...reflections.values()].find((item) => item.idempotencyKey === key) ?? null,
    createReflection: async (data) => {
      const value = { id: 'reflection-1', createdAt: new Date(), ...data };
      reflections.set(value.shareCode, value);
      return value;
    },
    getReflectionByShareCode: async (code) => reflections.get(code) ?? null,
    deleteReflection: async (id) => {
      const entry = [...reflections.entries()].find(([, value]) => value.id === id);
      if (entry) reflections.delete(entry[0]);
    },
    createEvent: async () => undefined,
  };
}

describe('public API', () => {
  it('reports health, readiness and immutable version', async () => {
    const app = await buildApp({ repository: repositoryFixture(), version: 'abc123' });
    expect((await app.inject({ url: '/healthz' })).json()).toEqual({ status: 'ok' });
    expect((await app.inject({ url: '/readyz' })).statusCode).toBe(200);
    expect((await app.inject({ url: '/version' })).json()).toEqual({ version: 'abc123' });
    await app.close();
  });

  it('returns a mood recommendation and full guide', async () => {
    const app = await buildApp({ repository: repositoryFixture() });
    const recommendation = await app.inject({
      method: 'POST',
      url: '/api/recommend',
      payload: { moodId: 'mood-anxiety', journeyId: 'journey-12345678' },
    });
    expect(recommendation.statusCode).toBe(200);
    expect(recommendation.json().track.id).toBe('track-bach');
    const track = await app.inject({ url: '/api/tracks/track-bach' });
    expect(track.json().guide.reflectionQuestion).toContain('秩序');
    await app.close();
  });

  it('creates an idempotent reflection and deletes it only with its secret', async () => {
    const app = await buildApp({
      repository: repositoryFixture(),
      origin: 'https://pandaprivate.top',
    });
    const payload = {
      trackId: 'track-bach',
      moodId: 'mood-anxiety',
      anonymousId: 'anonymous-12345678',
      journeyId: 'journey-12345678',
      idempotencyKey: 'idempotency-12345678',
      content: '可以慢一点。',
    };
    const created = await app.inject({ method: 'POST', url: '/api/reflections', payload });
    expect(created.statusCode).toBe(201);
    expect(created.json().shareUrl).toMatch(/^https:\/\/pandaprivate\.top\/s\//);
    expect(created.json().deletionToken).toBeTypeOf('string');
    const duplicate = await app.inject({ method: 'POST', url: '/api/reflections', payload });
    expect(duplicate.json().shareCode).toBe(created.json().shareCode);

    expect(
      (
        await app.inject({
          method: 'DELETE',
          url: `/api/reflections/${created.json().shareCode}`,
          headers: { authorization: 'Bearer wrong-token' },
        })
      ).statusCode,
    ).toBe(403);
    expect(
      (
        await app.inject({
          method: 'DELETE',
          url: `/api/reflections/${created.json().shareCode}`,
          headers: { authorization: `Bearer ${created.json().deletionToken}` },
        })
      ).statusCode,
    ).toBe(204);
    await app.close();
  });
});
