export interface Journey {
  originId: string;
  needId: string;
  note: string;
  journeyId: string;
  shownTrackIds: string[];
  recommendedTrackId?: string;
  recommendationContext?: string;
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
    start(originId: string, needId: string, note: string): Journey {
      const journey = {
        originId,
        needId,
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
        const parsed = JSON.parse(value) as Partial<Journey>;
        if (
          !parsed.originId ||
          !parsed.needId ||
          !parsed.journeyId ||
          !Array.isArray(parsed.shownTrackIds)
        ) {
          storage.removeItem(journeyKey);
          return null;
        }
        return parsed as Journey;
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
    setRecommendationContext(trackId: string, recommendationContext: string) {
      const current = this.current();
      if (!current) return;
      storage.setItem(
        journeyKey,
        JSON.stringify({ ...current, recommendedTrackId: trackId, recommendationContext }),
      );
    },
  };
}
