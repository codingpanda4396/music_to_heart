export function validateCatalog(
  moods: Array<{ id: string; name: string }>,
  relations: Array<{ moodId: string; trackId: string; published: boolean; hasGuide: boolean }>,
): string[] {
  return moods.flatMap((mood) => {
    const count = new Set(
      relations
        .filter((item) => item.moodId === mood.id && item.published && item.hasGuide)
        .map((item) => item.trackId),
    ).size;
    return count >= 3 ? [] : [`${mood.name}：只有 ${count} 个可用候选，至少需要 3 个`];
  });
}
