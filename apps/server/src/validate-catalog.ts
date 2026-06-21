import { PrismaClient } from '@prisma/client';
import { validateCatalog } from './services/catalog-validation.js';

const prisma = new PrismaClient();
const [moods, relations] = await Promise.all([
  prisma.moodCategory.findMany({ select: { id: true, name: true } }),
  prisma.trackMood.findMany({
    select: { moodId: true, trackId: true, track: { select: { status: true, guide: true } } },
  }),
]);
const errors = validateCatalog(
  moods,
  relations.map(({ moodId, trackId, track }) => ({
    moodId,
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
console.log('曲库验证通过：每个心境至少有 3 个已发布且有导赏的候选。');
