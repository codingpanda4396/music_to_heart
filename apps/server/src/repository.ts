import type { AnalyticsEvent } from '@qujing/shared';

export interface PublicTrack {
  id: string;
  title: string;
  composer: string;
  performer: string | null;
  category: string;
  durationText: string;
  bilibiliUrl: string;
  searchKeywords: string;
}

export interface TrackDetail extends PublicTrack {
  guide: {
    title: string;
    intro: string;
    firstImpression: string;
    background: string;
    listeningPoints: string;
    emotionalInterpretation: string;
    reflectionQuestion: string;
    takeaway: string;
  };
}

export interface StoredReflection {
  id: string;
  trackId: string;
  originId: string;
  needId: string;
  anonymousId: string;
  journeyId: string;
  idempotencyKey: string;
  content: string;
  shareCode: string;
  deletionTokenHash: string;
  createdAt: Date;
  track?: Pick<PublicTrack, 'title' | 'composer'>;
}

export interface RecommendationCandidate {
  trackId: string;
  originWeight: number;
  needWeight: number;
  originReason: string;
  needReason: string;
  track: PublicTrack;
}

export interface Repository {
  listOrigins(): Promise<Array<{ id: string; name: string; slug: string; description: string }>>;
  listNeeds(): Promise<
    Array<{
      id: string;
      name: string;
      slug: string;
      description: string;
      reflectionPrompt: string;
    }>
  >;
  recommendationCandidates(originId: string, needId: string): Promise<RecommendationCandidate[]>;
  getTrack(id: string): Promise<TrackDetail | null>;
  findReflectionByIdempotency(key: string): Promise<StoredReflection | null>;
  createReflection(data: Omit<StoredReflection, 'id' | 'createdAt'>): Promise<StoredReflection>;
  getReflectionByShareCode(code: string): Promise<StoredReflection | null>;
  deleteReflection(id: string): Promise<void>;
  createEvent(event: AnalyticsEvent): Promise<void>;
  ping?(): Promise<void>;
}
