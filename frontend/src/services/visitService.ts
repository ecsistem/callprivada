import api from './api';

export interface TrackVisitPayload {
  referrer?: string;
}

export async function trackVisit(slug: string, payload?: TrackVisitPayload): Promise<string> {
  const res = await api.post(`/public/calls/${slug}/visits`, payload ?? {});
  return res.data.data.visit_id as string;
}

export async function updateWatched(visitId: string, watchedSeconds: number): Promise<void> {
  await api.patch(`/public/visits/${visitId}`, { watched_seconds: watchedSeconds });
}
