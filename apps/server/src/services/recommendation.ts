export interface WeightedCandidate {
  trackId: string;
  originWeight: number;
  needWeight: number;
}

export function rankRecommendations<T extends WeightedCandidate>(
  candidates: T[],
  excludedTrackIds: string[],
): T[] {
  const excluded = new Set(excludedTrackIds);
  return candidates
    .filter((candidate) => !excluded.has(candidate.trackId))
    .sort((left, right) => {
      const scoreDifference =
        right.originWeight * 0.45 +
        right.needWeight * 0.55 -
        (left.originWeight * 0.45 + left.needWeight * 0.55);
      return scoreDifference || left.trackId.localeCompare(right.trackId);
    });
}
