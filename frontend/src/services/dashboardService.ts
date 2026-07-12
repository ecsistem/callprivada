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

export interface PaymentStats {
  generated: number;
  paid: number;
  total_cents: number;
}

export type PaymentPeriod = 'day' | 'month' | 'year' | 'all' | 'custom';

export async function getPaymentStats(
  period: PaymentPeriod,
  from?: string,
  to?: string,
): Promise<PaymentStats> {
  const params: Record<string, string> = { period };
  if (period === 'custom' && from) params.from = from;
  if (period === 'custom' && to) params.to = to;
  const { data } = await api.get<{ data: PaymentStats }>('/billing/stats', { params });
  return data.data;
}
