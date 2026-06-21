import { describe, expect, it } from 'vitest';
import { chooseRecommendation } from './recommendation.js';

const candidates = [
  { trackId: 'a', weight: 90 },
  { trackId: 'b', weight: 80 },
  { trackId: 'c', weight: 70 },
  { trackId: 'd', weight: 20 },
];

describe('chooseRecommendation', () => {
  it('selects from the three strongest non-excluded candidates', () => {
    expect(chooseRecommendation(candidates, ['a'], () => 0).trackId).toBe('b');
    expect(chooseRecommendation(candidates, [], () => 0.999).trackId).toBe('c');
  });

  it('falls back to the full list after all candidates were shown', () => {
    expect(chooseRecommendation(candidates, ['a', 'b', 'c', 'd'], () => 0).trackId).toBe('a');
  });

  it('rejects an empty catalog', () => {
    expect(() => chooseRecommendation([], [], () => 0)).toThrow('没有可推荐的曲目');
  });
});
