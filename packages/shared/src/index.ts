import { z } from 'zod';

const publicId = z.string().trim().min(8).max(128);

export const eventNames = [
  'page_view',
  'mood_selected',
  'recommend_generated',
  'track_viewed',
  'bilibili_clicked',
  'broken_link_reported',
  'reflection_created',
  'share_intent',
  'share_visit',
] as const;

export const recommendRequestSchema = z.object({
  moodId: z.string().trim().min(1).max(64),
  journeyId: publicId,
  excludeTrackIds: z.array(z.string().trim().min(1).max(64)).max(12).default([]),
});

export const eventSchema = z.object({
  eventName: z.enum(eventNames),
  anonymousId: publicId,
  journeyId: publicId,
  moodId: z.string().trim().min(1).max(64).optional(),
  trackId: z.string().trim().min(1).max(64).optional(),
  shareCode: z.string().trim().min(16).max(128).optional(),
  metadata: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
    .optional(),
});

export const createReflectionSchema = z.object({
  trackId: z.string().trim().min(1).max(64),
  moodId: z.string().trim().min(1).max(64),
  anonymousId: publicId,
  journeyId: publicId,
  idempotencyKey: publicId,
  content: z.string().trim().min(1).max(120),
});

export type RecommendRequest = z.infer<typeof recommendRequestSchema>;
export type AnalyticsEvent = z.infer<typeof eventSchema>;
export type CreateReflectionRequest = z.infer<typeof createReflectionSchema>;
