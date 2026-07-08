import api from './api';

export interface CallAnalytics {
  call_id: string;
  total_visits: number;
  avg_watched: number;
  devices: Record<string, number>;
  browsers: Record<string, number>;
  os_list: Record<string, number>;
  top_referrers: { source: string; count: number }[];
}

export async function getCallAnalytics(callId: string): Promise<CallAnalytics> {
  const res = await api.get(`/calls/${callId}/analytics`);
  return res.data.data as CallAnalytics;
}
