import type { AnalyticsEvent, CreateReflectionRequest, RecommendRequest } from '@qujing/shared';

export interface TrackSummary {
  id: string;
  title: string;
  composer: string;
  performer: string | null;
  category: string;
  durationText: string;
  bilibiliUrl: string;
  searchKeywords: string;
}

export interface TrackDetail extends TrackSummary {
  moods: Array<{ id: string; name: string; slug: string }>;
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

export interface AdminTrackListItem extends TrackSummary {
  id: string;
  status: 'DRAFT' | 'PUBLISHED';
  period: string | null;
  bilibiliBvid: string | null;
  difficulty: number;
  trackMoods: Array<{ moodId: string; weight: number; reason: string }>;
  guide: TrackDetail['guide'];
}

export interface AdminReflectionItem {
  id: string;
  content: string;
  mood: { name: string };
  track: { title: string; composer: string };
}

export interface AdminMetrics {
  visitors: number;
  reflections: number;
  shareIntents: number;
  shareVisits: number;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init?.body == null ? {} : { 'Content-Type': 'application/json' }),
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? '请求失败，请稍后再试');
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  moods: () =>
    request<Array<{ id: string; name: string; slug: string; description: string }>>('/api/moods'),
  recommend: (input: RecommendRequest) =>
    request<{ track: TrackSummary; reason: string }>('/api/recommend', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  track: (id: string) => request<TrackDetail>(`/api/tracks/${id}`),
  event: (event: AnalyticsEvent) =>
    request('/api/events', { method: 'POST', body: JSON.stringify(event), keepalive: true }),
  reflect: (input: CreateReflectionRequest) =>
    request<{ reflectionId: string; shareCode: string; shareUrl: string; deletionToken?: string }>(
      '/api/reflections',
      { method: 'POST', body: JSON.stringify(input) },
    ),
  deleteReflection: (shareCode: string, token: string) =>
    request<void>(`/api/reflections/${shareCode}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }),
  adminLogin: (username: string, password: string) =>
    request<void>('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  adminTracks: () => request<AdminTrackListItem[]>('/api/admin/tracks'),
  adminReflections: () => request<AdminReflectionItem[]>('/api/admin/reflections'),
  adminMetrics: () => request<AdminMetrics>('/api/admin/metrics'),
  adminSaveTrack: (track: unknown, id?: string) =>
    request<{ id: string }>(id ? `/api/admin/tracks/${id}` : '/api/admin/tracks', {
      method: id ? 'PUT' : 'POST',
      body: JSON.stringify(track),
    }),
};

export function sendEvent(event: AnalyticsEvent) {
  void api.event(event).catch(() => undefined);
}
