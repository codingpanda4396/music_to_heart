export interface WeightedCandidate {
  trackId: string;
  weight: number;
}

export function chooseRecommendation<T extends WeightedCandidate>(
  candidates: T[],
  excludedTrackIds: string[],
  random: () => number = Math.random,
): T {
  if (candidates.length === 0) throw new Error('没有可推荐的曲目');

  const excluded = new Set(excludedTrackIds);
  const available = candidates.filter((candidate) => !excluded.has(candidate.trackId));
  const pool = [...(available.length > 0 ? available : candidates)]
    .sort((left, right) => right.weight - left.weight)
    .slice(0, 3);
  const index = Math.min(Math.floor(random() * pool.length), pool.length - 1);
  return pool[index]!;
}
