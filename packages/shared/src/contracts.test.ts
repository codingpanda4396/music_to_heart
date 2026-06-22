import { describe, expect, it } from 'vitest';
import { createReflectionSchema, eventSchema, recommendRequestSchema } from './index.js';

describe('public contracts', () => {
  it('requires an origin, a need and a journey when requesting a recommendation', () => {
    expect(
      recommendRequestSchema.parse({
        originId: 'origin-racing-mind',
        needId: 'need-calm',
        journeyId: 'journey-12345678',
      }),
    ).toEqual({
      originId: 'origin-racing-mind',
      needId: 'need-calm',
      journeyId: 'journey-12345678',
      excludeTrackIds: [],
    });
    expect(() =>
      recommendRequestSchema.parse({
        originId: 'origin-racing-mind',
        journeyId: 'journey-12345678',
      }),
    ).toThrow();
  });

  it('accepts only allow-listed analytics events', () => {
    expect(
      eventSchema.parse({
        eventName: 'origin_selected',
        anonymousId: 'anonymous-12345678',
        journeyId: 'journey-12345678',
        originId: 'origin-racing-mind',
      }).eventName,
    ).toBe('origin_selected');
    expect(() =>
      eventSchema.parse({
        eventName: 'arbitrary_event',
        anonymousId: 'anonymous-12345678',
        journeyId: 'journey-12345678',
      }),
    ).toThrow();
    expect(() =>
      eventSchema.parse({
        eventName: 'need_selected',
        anonymousId: 'anonymous-12345678',
        journeyId: 'journey-12345678',
        originId: 'origin-racing-mind',
      }),
    ).toThrow();
  });

  it('rejects blank and overlong reflections', () => {
    expect(
      createReflectionSchema.parse({
        trackId: 'track-1',
        originId: 'origin-racing-mind',
        needId: 'need-calm',
        anonymousId: 'anonymous-12345678',
        journeyId: 'journey-12345678',
        idempotencyKey: 'idempotency-12345678',
        content: ' 可以慢一点。 ',
      }).content,
    ).toBe('可以慢一点。');
    expect(() =>
      createReflectionSchema.parse({
        trackId: 'track-1',
        originId: 'origin-racing-mind',
        needId: 'need-calm',
        anonymousId: 'anonymous-12345678',
        journeyId: 'journey-12345678',
        idempotencyKey: 'idempotency-12345678',
        content: '心'.repeat(121),
      }),
    ).toThrow();
  });
});
