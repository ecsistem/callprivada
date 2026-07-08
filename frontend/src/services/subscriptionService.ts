import api from './api';

export interface Plan {
  id: string;
  name: string;
  price_cents: number;
  interval: string;
  abacate_pay_product_id?: string;
  active: boolean;
  max_calls: number;
  max_presells: number;
  max_videos: number;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  current_period_end: string | null;
}

export async function listPlans(): Promise<Plan[]> {
  const { data } = await api.get<{ data: Plan[] }>('/plans');
  return data.data;
}

export async function checkout(planId: string): Promise<string> {
  const { data } = await api.post<{ checkout_url: string }>('/subscriptions/checkout', { plan_id: planId });
  return data.checkout_url;
}

export async function getMySubscription(): Promise<Subscription> {
  const { data } = await api.get<{ data: Subscription }>('/subscriptions/me');
  return data.data;
}

export async function cancelSubscription(): Promise<void> {
  await api.post('/subscriptions/cancel');
}
