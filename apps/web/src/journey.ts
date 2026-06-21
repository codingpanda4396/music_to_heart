export interface Journey {
  moodId: string;
  note: string;
  journeyId: string;
  shownTrackIds: string[];
}

const anonymousKey = 'qj_anonymous_id';
const journeyKey = 'qj_current_journey';

export function createJourneyStore(storage: Storage) {
  return {
    anonymousId() {
      const existing = storage.getItem(anonymousKey);
      if (existing) return existing;
      const value = `anonymous-${crypto.randomUUID()}`;
      storage.setItem(anonymousKey, value);
      return value;
    },
    start(moodId: string, note: string): Journey {
      const journey = {
        moodId,
        note,
        journeyId: `journey-${crypto.randomUUID()}`,
        shownTrackIds: [],
      };
      storage.setItem(journeyKey, JSON.stringify(journey));
      return journey;
    },
    current(): Journey | null {
      const value = storage.getItem(journeyKey);
      if (!value) return null;
      try {
        return JSON.parse(value) as Journey;
      } catch {
        storage.removeItem(journeyKey);
        return null;
      }
    },
    addShownTrack(trackId: string) {
      const current = this.current();
      if (!current || current.shownTrackIds.includes(trackId)) return;
      storage.setItem(
        journeyKey,
        JSON.stringify({ ...current, shownTrackIds: [...current.shownTrackIds, trackId] }),
      );
    },
  };
}
