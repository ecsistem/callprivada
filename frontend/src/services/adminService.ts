import api from './api';

export interface AdminStats {
  total_users: number;
  active_subscriptions: number;
  total_calls: number;
  total_visits: number;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  is_blocked: boolean;
  created_at: string;
}

export interface AdminSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  created_at: string;
}

export interface AdminCall {
  id: string;
  user_id: string;
  title: string;
  slug: string;
  is_active: boolean;
  created_at: string;
}

export interface AdminAuditLog {
  id: string;
  admin_id: string;
  action: string;
  target: string;
  target_id: string | null;
  detail: string;
  created_at: string;
}

export interface PagedResult<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
}

export async function getAdminStats(): Promise<AdminStats> {
  const res = await api.get('/admin/stats');
  return res.data.data;
}

export async function listAdminUsers(page = 1, search = ''): Promise<PagedResult<AdminUser>> {
  const res = await api.get('/admin/users', { params: { page, per_page: 20, search: search || undefined } });
  return res.data;
}

export async function blockUser(id: string): Promise<void> {
  await api.put(`/admin/users/${id}/block`);
}

export async function unblockUser(id: string): Promise<void> {
  await api.put(`/admin/users/${id}/unblock`);
}

export async function deleteAdminUser(id: string): Promise<void> {
  await api.delete(`/admin/users/${id}`);
}

export async function listAdminSubscriptions(page = 1): Promise<PagedResult<AdminSubscription>> {
  const res = await api.get('/admin/subscriptions', { params: { page, per_page: 20 } });
  return res.data;
}

export async function cancelAdminSubscription(id: string): Promise<void> {
  await api.delete(`/admin/subscriptions/${id}`);
}

export async function listAdminCalls(page = 1): Promise<PagedResult<AdminCall>> {
  const res = await api.get('/admin/calls', { params: { page, per_page: 20 } });
  return res.data;
}

export async function deleteAdminCall(id: string): Promise<void> {
  await api.delete(`/admin/calls/${id}`);
}

export async function listAuditLogs(page = 1): Promise<PagedResult<AdminAuditLog>> {
  const res = await api.get('/admin/audit-logs', { params: { page, per_page: 20 } });
  return res.data;
}

export async function deleteAdminPlan(id: string): Promise<void> {
  await api.delete(`/admin/plans/${id}`);
}

export async function impersonateUser(id: string): Promise<{ access_token: string }> {
  const res = await api.post(`/admin/users/${id}/impersonate`);
  return res.data;
}

export async function changeUserPassword(id: string, password: string): Promise<void> {
  await api.put(`/admin/users/${id}/password`, { password });
}

export interface AppSettings {
  video_cdn_url: string;
  video_cdn_default: string;
  abacatepay_configured: boolean;
  abacatepay_key_masked: string;
}

export async function getAppSettings(): Promise<AppSettings> {
  const res = await api.get('/admin/settings');
  return res.data.data;
}

export async function updateAppSettings(patch: { video_cdn_url?: string; abacatepay_api_key?: string }): Promise<AppSettings> {
  const res = await api.put('/admin/settings', patch);
  return res.data.data;
}

export async function testAbacatePay(): Promise<{ ok: boolean; message: string }> {
  const res = await api.post('/admin/settings/abacatepay/test');
  return res.data.data;
}
