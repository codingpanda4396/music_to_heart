import { z } from 'zod';

const publicId = z.string().trim().min(8).max(128);

export const eventNames = [
  'page_view',
  'origin_selected',
  'need_selected',
  'recommend_generated',
  'track_viewed',
  'bilibili_clicked',
  'broken_link_reported',
  'reflection_created',
  'share_intent',
  'share_visit',
] as const;

export const recommendRequestSchema = z.object({
  originId: z.string().trim().min(1).max(64),
  needId: z.string().trim().min(1).max(64),
  journeyId: publicId,
  excludeTrackIds: z.array(z.string().trim().min(1).max(64)).max(12).default([]),
});

export const eventSchema = z
  .object({
    eventName: z.enum(eventNames),
    anonymousId: publicId,
    journeyId: publicId,
    originId: z.string().trim().min(1).max(64).optional(),
    needId: z.string().trim().min(1).max(64).optional(),
    trackId: z.string().trim().min(1).max(64).optional(),
    shareCode: z.string().trim().min(16).max(128).optional(),
    metadata: z
      .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
      .optional(),
  })
  .superRefine((event, context) => {
    if (event.eventName === 'origin_selected' && !event.originId) {
      context.addIssue({ code: 'custom', path: ['originId'], message: '必须提供起点' });
    }
    if (
      !['page_view', 'origin_selected', 'share_visit'].includes(event.eventName) &&
      (!event.originId || !event.needId)
    ) {
      context.addIssue({ code: 'custom', path: ['needId'], message: '必须提供起点与去向' });
    }
  });

export const createReflectionSchema = z.object({
  trackId: z.string().trim().min(1).max(64),
  originId: z.string().trim().min(1).max(64),
  needId: z.string().trim().min(1).max(64),
  anonymousId: publicId,
  journeyId: publicId,
  idempotencyKey: publicId,
  content: z.string().trim().min(1).max(120),
});

export type RecommendRequest = z.infer<typeof recommendRequestSchema>;
export type AnalyticsEvent = z.infer<typeof eventSchema>;
export type CreateReflectionRequest = z.infer<typeof createReflectionSchema>;
