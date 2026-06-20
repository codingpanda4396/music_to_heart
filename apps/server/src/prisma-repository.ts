import { Prisma, PrismaClient } from '@prisma/client';
import type { AnalyticsEvent } from '@qujing/shared';
import type { AdminRepository, AdminTrackInput } from './admin.js';
import type { Repository, StoredReflection } from './repository.js';

export class PrismaRepository implements Repository, AdminRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async ping() {
    await this.prisma.$queryRaw`SELECT 1`;
  }

  listMoods() {
    return this.prisma.moodCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true, slug: true, description: true },
    });
  }

  async recommendationCandidates(moodId: string) {
    const items = await this.prisma.trackMood.findMany({
      where: { moodId, track: { status: 'PUBLISHED', guide: { isNot: null } } },
      orderBy: { weight: 'desc' },
      include: { track: true },
    });
    return items.map(({ track, weight, reason }) => ({
      trackId: track.id,
      weight,
      reason,
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
      include: { guide: true, trackMoods: { include: { mood: true } } },
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
      moods: track.trackMoods.map(({ mood }) => ({
        id: mood.id,
        name: mood.name,
        slug: mood.slug,
      })),
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
        moodId: data.moodId,
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
      include: {
        track: { select: { title: true, composer: true } },
        mood: { select: { name: true, slug: true } },
      },
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
        trackMoods: { include: { mood: true }, orderBy: { weight: 'desc' } },
      },
    });
  }

  async saveTrack(input: AdminTrackInput) {
    const { id, moods, guide, ...track } = input;
    return this.prisma.$transaction(async (transaction) => {
      const saved = id
        ? await transaction.track.update({ where: { id }, data: track })
        : await transaction.track.create({ data: track });
      await transaction.guide.upsert({
        where: { trackId: saved.id },
        create: { trackId: saved.id, ...guide },
        update: guide,
      });
      await transaction.trackMood.deleteMany({ where: { trackId: saved.id } });
      await transaction.trackMood.createMany({
        data: moods.map((mood) => ({ trackId: saved.id, ...mood })),
      });
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
        mood: { select: { name: true } },
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
}
