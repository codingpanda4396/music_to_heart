import { Prisma, PrismaClient } from '@prisma/client';
import type { AnalyticsEvent } from '@qujing/shared';
import type { AdminRepository, AdminTrackInput } from './admin.js';
import type { Repository, StoredReflection } from './repository.js';
import { validateCatalog } from './services/catalog-validation.js';

export class PrismaRepository implements Repository, AdminRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async ping() {
    await this.prisma.$queryRaw`SELECT 1`;
  }

  listOrigins() {
    return this.prisma.originCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true, slug: true, description: true },
    });
  }

  listNeeds() {
    return this.prisma.needCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        reflectionPrompt: true,
      },
    });
  }

  async recommendationCandidates(originId: string, needId: string) {
    const items = await this.prisma.trackOrigin.findMany({
      where: {
        originId,
        track: {
          status: 'PUBLISHED',
          guide: { isNot: null },
          trackNeeds: { some: { needId } },
        },
      },
      orderBy: { weight: 'desc' },
      include: { track: { include: { trackNeeds: { where: { needId } } } } },
    });
    return items.map(({ track, weight, reason }) => ({
      trackId: track.id,
      originWeight: weight,
      needWeight: track.trackNeeds[0]!.weight,
      originReason: reason,
      needReason: track.trackNeeds[0]!.reason,
      track: {
        id: track.id,
        title: track.title,
        composer: track.composer,
        performer: track.performer,
        category: track.category,
        durationText: track.durationText,
        bilibiliUrl: track.bilibiliUrl,
        searchKeywords: track.searchKeywords,
      },
    }));
  }

  async getTrack(id: string) {
    const track = await this.prisma.track.findFirst({
      where: { id, status: 'PUBLISHED', guide: { isNot: null } },
      include: { guide: true },
    });
    if (!track?.guide) return null;
    return {
      id: track.id,
      title: track.title,
      composer: track.composer,
      performer: track.performer,
      category: track.category,
      durationText: track.durationText,
      bilibiliUrl: track.bilibiliUrl,
      searchKeywords: track.searchKeywords,
      guide: {
        title: track.guide.title,
        intro: track.guide.intro,
        firstImpression: track.guide.firstImpression,
        background: track.guide.background,
        listeningPoints: track.guide.listeningPoints,
        emotionalInterpretation: track.guide.emotionalInterpretation,
        reflectionQuestion: track.guide.reflectionQuestion,
        takeaway: track.guide.takeaway,
      },
    };
  }

  findReflectionByIdempotency(key: string) {
    return this.prisma.reflection.findUnique({ where: { idempotencyKey: key } });
  }

  createReflection(data: Omit<StoredReflection, 'id' | 'createdAt'>) {
    return this.prisma.reflection.create({
      data: {
        trackId: data.trackId,
        originId: data.originId,
        needId: data.needId,
        anonymousId: data.anonymousId,
        journeyId: data.journeyId,
        idempotencyKey: data.idempotencyKey,
        content: data.content,
        shareCode: data.shareCode,
        deletionTokenHash: data.deletionTokenHash,
      },
    });
  }

  getReflectionByShareCode(code: string) {
    return this.prisma.reflection.findUnique({
      where: { shareCode: code },
      include: { track: { select: { title: true, composer: true } } },
    });
  }

  async deleteReflection(id: string) {
    await this.prisma.reflection.delete({ where: { id } });
  }

  async createEvent(event: AnalyticsEvent) {
    await this.prisma.event.create({
      data: {
        ...event,
        metadata: event.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  }

  findAdminByUsername(username: string) {
    return this.prisma.adminUser.findUnique({ where: { username } });
  }

  listTracks() {
    return this.prisma.track.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        guide: true,
        trackOrigins: { include: { origin: true }, orderBy: { weight: 'desc' } },
        trackNeeds: { include: { need: true }, orderBy: { weight: 'desc' } },
      },
    });
  }

  async saveTrack(input: AdminTrackInput) {
    const { id, origins, needs, guide, ...track } = input;
    return this.prisma.$transaction(async (transaction) => {
      const saved = id
        ? await transaction.track.update({ where: { id }, data: track })
        : await transaction.track.create({ data: track });
      await transaction.guide.upsert({
        where: { trackId: saved.id },
        create: { trackId: saved.id, ...guide },
        update: guide,
      });
      await transaction.trackOrigin.deleteMany({ where: { trackId: saved.id } });
      await transaction.trackOrigin.createMany({
        data: origins.map((origin) => ({ trackId: saved.id, ...origin })),
      });
      await transaction.trackNeed.deleteMany({ where: { trackId: saved.id } });
      await transaction.trackNeed.createMany({
        data: needs.map((need) => ({ trackId: saved.id, ...need })),
      });
      if (track.status === 'PUBLISHED') {
        const [allOrigins, allNeeds, originRelations, needRelations] = await Promise.all([
          transaction.originCategory.findMany({ select: { id: true, name: true } }),
          transaction.needCategory.findMany({ select: { id: true, name: true } }),
          transaction.trackOrigin.findMany({
            select: {
              originId: true,
              trackId: true,
              track: { select: { status: true, guide: true } },
            },
          }),
          transaction.trackNeed.findMany({
            select: {
              needId: true,
              trackId: true,
              track: { select: { status: true, guide: true } },
            },
          }),
        ]);
        const errors = validateCatalog(
          allOrigins,
          allNeeds,
          originRelations.map(({ track: relatedTrack, ...relation }) => ({
            ...relation,
            published: relatedTrack.status === 'PUBLISHED',
            hasGuide: Boolean(relatedTrack.guide),
          })),
          needRelations.map(({ track: relatedTrack, ...relation }) => ({
            ...relation,
            published: relatedTrack.status === 'PUBLISHED',
            hasGuide: Boolean(relatedTrack.guide),
          })),
        );
        if (errors.length > 0) {
          const error = new Error(errors.join('\n')) as Error & { statusCode: number };
          error.statusCode = 400;
          throw error;
        }
      }
      return { id: saved.id };
    });
  }

  listReflections() {
    return this.prisma.reflection.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true,
        content: true,
        shareCode: true,
        createdAt: true,
        track: { select: { title: true, composer: true } },
      },
    });
  }

  async metrics() {
    const [visitorGroups, reflections, shareIntents, shareVisits] = await Promise.all([
      this.prisma.event.groupBy({ by: ['anonymousId'] }),
      this.prisma.reflection.count(),
      this.prisma.event.count({ where: { eventName: 'share_intent' } }),
      this.prisma.event.count({ where: { eventName: 'share_visit' } }),
    ]);
    return { visitors: visitorGroups.length, reflections, shareIntents, shareVisits };
  }

  async catalogCoverage() {
    const [origins, needs, originRelations, needRelations] = await Promise.all([
      this.prisma.originCategory.findMany({ select: { id: true, name: true } }),
      this.prisma.needCategory.findMany({ select: { id: true, name: true } }),
      this.prisma.trackOrigin.findMany({
        select: { originId: true, trackId: true, track: { select: { status: true, guide: true } } },
      }),
      this.prisma.trackNeed.findMany({
        select: { needId: true, trackId: true, track: { select: { status: true, guide: true } } },
      }),
    ]);
    const errors = validateCatalog(
      origins,
      needs,
      originRelations.map(({ track, ...relation }) => ({
        ...relation,
        published: track.status === 'PUBLISHED',
        hasGuide: Boolean(track.guide),
      })),
      needRelations.map(({ track, ...relation }) => ({
        ...relation,
        published: track.status === 'PUBLISHED',
        hasGuide: Boolean(track.guide),
      })),
    );
    const total = origins.length * needs.length;
    return { total, covered: total - errors.length, errors };
  }
}
