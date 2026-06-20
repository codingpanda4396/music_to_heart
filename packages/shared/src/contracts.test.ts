import { describe, expect, it } from 'vitest';
import { createReflectionSchema, eventSchema, recommendRequestSchema } from './index.js';

describe('public contracts', () => {
  it('requires one mood and a journey when requesting a recommendation', () => {
    expect(
      recommendRequestSchema.parse({ moodId: 'mood-1', journeyId: 'journey-12345678' }),
    ).toEqual({ moodId: 'mood-1', journeyId: 'journey-12345678', excludeTrackIds: [] });
    expect(() => recommendRequestSchema.parse({ moodId: '', journeyId: 'short' })).toThrow();
  });

  it('accepts only allow-listed analytics events', () => {
    expect(
      eventSchema.parse({
        eventName: 'mood_selected',
        anonymousId: 'anonymous-12345678',
        journeyId: 'journey-12345678',
      }).eventName,
    ).toBe('mood_selected');
    expect(() =>
      eventSchema.parse({
        eventName: 'arbitrary_event',
        anonymousId: 'anonymous-12345678',
        journeyId: 'journey-12345678',
      }),
    ).toThrow();
  });

  it('rejects blank and overlong reflections', () => {
    expect(
      createReflectionSchema.parse({
        trackId: 'track-1',
        moodId: 'mood-1',
        anonymousId: 'anonymous-12345678',
        journeyId: 'journey-12345678',
        idempotencyKey: 'idempotency-12345678',
        content: ' 可以慢一点。 ',
      }).content,
    ).toBe('可以慢一点。');
    expect(() =>
      createReflectionSchema.parse({
        trackId: 'track-1',
        moodId: 'mood-1',
        anonymousId: 'anonymous-12345678',
        journeyId: 'journey-12345678',
        idempotencyKey: 'idempotency-12345678',
        content: '心'.repeat(121),
      }),
    ).toThrow();
  });
});
