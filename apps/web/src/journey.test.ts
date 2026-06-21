import { describe, expect, it } from 'vitest';
import { createJourneyStore } from './journey.js';

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

describe('journey store', () => {
  it('keeps anonymous identity stable and starts a fresh journey', () => {
    const storage = memoryStorage();
    const first = createJourneyStore(storage);
    const second = createJourneyStore(storage);
    expect(first.anonymousId()).toBe(second.anonymousId());
    expect(first.start('mood-anxiety', '我现在有点乱').journeyId).not.toBe(
      first.start('mood-anxiety', '另一次').journeyId,
    );
  });

  it('keeps the free-form note local and tracks shown recommendations', () => {
    const storage = memoryStorage();
    const store = createJourneyStore(storage);
    const journey = store.start('mood-anxiety', '只留在这里');
    store.addShownTrack('track-1');
    expect(store.current()).toMatchObject({
      ...journey,
      note: '只留在这里',
      shownTrackIds: ['track-1'],
    });
  });
});
