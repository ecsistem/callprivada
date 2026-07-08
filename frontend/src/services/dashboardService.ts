import api from './api';

export interface DashboardSummary {
  calls_count: number;
  active_links: number;
  total_views: number;
  plan: {
    id: string;
    name: string;
    price_cents: number;
    interval: string;
  } | null;
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const { data } = await api.get<{ data: DashboardSummary }>('/dashboard/summary');
  return data.data;
}
