export function validateCatalog(
  origins: Array<{ id: string; name: string }>,
  needs: Array<{ id: string; name: string }>,
  originRelations: Array<{
    originId: string;
    trackId: string;
    published: boolean;
    hasGuide: boolean;
  }>,
  needRelations: Array<{
    needId: string;
    trackId: string;
    published: boolean;
    hasGuide: boolean;
  }>,
): string[] {
  return origins.flatMap((origin) =>
    needs.flatMap((need) => {
      const originTracks = new Set(
        originRelations
          .filter((item) => item.originId === origin.id && item.published && item.hasGuide)
          .map((item) => item.trackId),
      );
      const count = new Set(
        needRelations
          .filter(
            (item) =>
              item.needId === need.id &&
              item.published &&
              item.hasGuide &&
              originTracks.has(item.trackId),
          )
          .map((item) => item.trackId),
      ).size;
      return count >= 3
        ? []
        : [`${origin.name} → ${need.name}：只有 ${count} 个可用候选，至少需要 3 个`];
    }),
  );
}
