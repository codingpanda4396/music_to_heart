import { describe, expect, it } from 'vitest';
import { validateCatalog } from './catalog-validation.js';

describe('catalog validation', () => {
  it('requires three published guided candidates for every mood', () => {
    expect(
      validateCatalog(
        [{ id: 'mood-1', name: '焦虑' }],
        [
          { moodId: 'mood-1', trackId: 'a', published: true, hasGuide: true },
          { moodId: 'mood-1', trackId: 'b', published: true, hasGuide: true },
        ],
      ),
    ).toEqual(['焦虑：只有 2 个可用候选，至少需要 3 个']);
  });

  it('accepts a complete mood catalog', () => {
    expect(
      validateCatalog(
        [{ id: 'mood-1', name: '焦虑' }],
        ['a', 'b', 'c'].map((trackId) => ({
          moodId: 'mood-1',
          trackId,
          published: true,
          hasGuide: true,
        })),
      ),
    ).toEqual([]);
  });
});
