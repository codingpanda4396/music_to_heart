// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Journey } from '../journey.js';
import { RecommendationPage } from './RecommendationPage.js';

const mocks = vi.hoisted(() => ({ recommend: vi.fn(), sendEvent: vi.fn() }));

vi.mock('../api.js', () => ({
  api: { recommend: mocks.recommend },
  sendEvent: mocks.sendEvent,
}));

const journey: Journey = {
  originId: 'origin-racing-mind',
  needId: 'need-calm',
  note: '',
  journeyId: 'journey-12345678',
  shownTrackIds: [],
};

describe('RecommendationPage', () => {
  beforeEach(() => {
    const values = new Map<string, string>([['qj_anonymous_id', 'anonymous-12345678']]);
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
      clear: () => values.clear(),
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('does not request another recommendation when saving context updates the parent journey', async () => {
    mocks.recommend.mockResolvedValue({
      track: {
        id: 'track-bach',
        title: '咏叹调',
        composer: 'J. S. Bach',
        performer: null,
        category: '西方古典',
        durationText: '约 5 分钟',
        bilibiliUrl: 'https://www.bilibili.com/video/BVtest',
        searchKeywords: '巴赫 咏叹调',
      },
      reason: '先接住当下，再向安静靠近。',
    });

    function Harness() {
      const [current, setCurrent] = useState(journey);
      return (
        <RecommendationPage
          journey={current}
          addShown={() => undefined}
          saveContext={(trackId, recommendationContext) =>
            setCurrent({ ...current, recommendedTrackId: trackId, recommendationContext })
          }
        />
      );
    }

    render(
      <MemoryRouter>
        <Harness />
      </MemoryRouter>,
    );
    expect(await screen.findByText('此刻推荐')).toBeVisible();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mocks.recommend).toHaveBeenCalledTimes(1);
  });
});
