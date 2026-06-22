import { describe, expect, it } from 'vitest';
import { validateCatalog } from './catalog-validation.js';

describe('catalog validation', () => {
  it('requires three published guided candidates for every origin and need combination', () => {
    expect(
      validateCatalog(
        [{ id: 'origin-1', name: '脑子停不下来' }],
        [{ id: 'need-1', name: '先安静下来' }],
        [
          { originId: 'origin-1', trackId: 'a', published: true, hasGuide: true },
          { originId: 'origin-1', trackId: 'b', published: true, hasGuide: true },
        ],
        [
          { needId: 'need-1', trackId: 'a', published: true, hasGuide: true },
          { needId: 'need-1', trackId: 'b', published: true, hasGuide: true },
        ],
      ),
    ).toEqual(['脑子停不下来 → 先安静下来：只有 2 个可用候选，至少需要 3 个']);
  });

  it('counts only tracks present in both sides of the combination', () => {
    expect(
      validateCatalog(
        [{ id: 'origin-1', name: '脑子停不下来' }],
        [{ id: 'need-1', name: '先安静下来' }],
        ['a', 'b', 'c', 'origin-only'].map((trackId) => ({
          originId: 'origin-1',
          trackId,
          published: true,
          hasGuide: true,
        })),
        ['a', 'b', 'c', 'need-only'].map((trackId) => ({
          needId: 'need-1',
          trackId,
          published: true,
          hasGuide: true,
        })),
      ),
    ).toEqual([]);
  });
});
