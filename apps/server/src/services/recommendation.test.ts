import { describe, expect, it } from 'vitest';
import { rankRecommendations } from './recommendation.js';

const candidates = [
  { trackId: 'a', originWeight: 5, needWeight: 3 },
  { trackId: 'b', originWeight: 3, needWeight: 5 },
  { trackId: 'c', originWeight: 4, needWeight: 4 },
];

describe('rankRecommendations', () => {
  it('ranks deterministically with the need weighted at 55 percent', () => {
    expect(rankRecommendations(candidates, []).map((item) => item.trackId)).toEqual([
      'b',
      'c',
      'a',
    ]);
  });

  it('uses track id as a stable tie breaker and excludes shown tracks', () => {
    const tied = [
      { trackId: 'z', originWeight: 4, needWeight: 4 },
      { trackId: 'a', originWeight: 4, needWeight: 4 },
    ];
    expect(rankRecommendations(tied, ['a']).map((item) => item.trackId)).toEqual(['z']);
  });

  it('returns an empty list when every eligible track was shown', () => {
    expect(rankRecommendations(candidates, ['a', 'b', 'c'])).toEqual([]);
  });
});
