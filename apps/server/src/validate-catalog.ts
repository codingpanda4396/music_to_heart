import { PrismaClient } from '@prisma/client';
import { validateCatalog } from './services/catalog-validation.js';

const prisma = new PrismaClient();
const [origins, needs, originRelations, needRelations] = await Promise.all([
  prisma.originCategory.findMany({ select: { id: true, name: true } }),
  prisma.needCategory.findMany({ select: { id: true, name: true } }),
  prisma.trackOrigin.findMany({
    select: { originId: true, trackId: true, track: { select: { status: true, guide: true } } },
  }),
  prisma.trackNeed.findMany({
    select: { needId: true, trackId: true, track: { select: { status: true, guide: true } } },
  }),
]);
const errors = validateCatalog(
  origins,
  needs,
  originRelations.map(({ originId, trackId, track }) => ({
    originId,
    trackId,
    published: track.status === 'PUBLISHED',
    hasGuide: Boolean(track.guide),
  })),
  needRelations.map(({ needId, trackId, track }) => ({
    needId,
    trackId,
    published: track.status === 'PUBLISHED',
    hasGuide: Boolean(track.guide),
  })),
);
await prisma.$disconnect();
if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('曲库验证通过：每个起点与去向组合至少有 3 个已发布且有导赏的候选。');
