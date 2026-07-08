import api from './api';

export interface Call {
  id: string;
  slug: string;
  title: string;
  display_name: string;
  video_id: string;
  start_time_seconds: number;
  end_time_seconds: number;
  playback_rate: number;
  video_zoom: number;
  video_x: number;
  video_y: number;
  entry_price_cents: number;
  loop_video: boolean;
  call_mode: 'incoming' | 'outgoing';
  billing_mode?: 'none' | 'credits';
  end_call_redirect_url?: string;
  expires_at: string | null;
  status: 'active' | 'expired' | 'disabled';
  created_at: string;
  contact_photo_url?: string;
}

export interface PublicEvent {
  id: string;
  trigger_at_seconds: number;
  duration_seconds: number;
  type: 'popup' | 'fullscreen' | 'fake_billing' | 'offer_call' | 'countdown' | 'upsell' | 'reconnect_paywall' | 'signal_drop' | 'fake_typing' | 'screenshot_alert' | 'battery_low' | 'incoming_call' | 'fake_gift' | 'viewer_count' | 'social_proof' | 'exclusive_access' | 'tip_jar' | 'video_lock' | 'phone_block';
  title: string;
  description: string;
  button_text?: string;
  button_color?: string;
  offer_call_slug?: string;
  upsell_slug?: string;
  billing_amount_cents: number;
  billing_collect_payer_info?: boolean;
  billing_payer_name?: string;
  billing_payer_document?: string;
  billing_payer_email?: string;
  billing_payer_phone?: string;
}

export interface PublicCall {
  slug: string;
  display_name: string;
  contact_photo_url: string;
  video_url: string;
  start_time_seconds: number;
  end_time_seconds: number;
  playback_rate: number;
  video_zoom: number;
  video_x: number;
  video_y: number;
  entry_price_cents: number;
  loop_video: boolean;
  call_mode: 'incoming' | 'outgoing';
  billing_mode?: 'none' | 'credits';
  end_call_redirect_url?: string;
  events: PublicEvent[];
  tracking?: import('./trackingService').TrackingConfig;
}

export interface CreateCallPayload {
  video_id: string;
  title: string;
  display_name: string;
  start_time_seconds?: number;
  entry_price_cents?: number;
  loop_video?: boolean;
  call_mode?: 'incoming' | 'outgoing';
  expires_at?: string;
}

export interface UpdateCallPayload {
  title?: string;
  display_name?: string;
  video_id?: string;
  start_time_seconds?: number;
  end_time_seconds?: number;
  playback_rate?: number;
  video_zoom?: number;
  video_x?: number;
  video_y?: number;
  entry_price_cents?: number;
  loop_video?: boolean;
  call_mode?: 'incoming' | 'outgoing';
  billing_mode?: 'none' | 'credits';
  end_call_redirect_url?: string;
  expires_at?: string | null;
  status?: 'active' | 'disabled';
}

export async function listCalls(page = 1, perPage = 20): Promise<{ data: Call[]; total: number }> {
  const { data } = await api.get<{ data: Call[]; total: number }>(
    `/calls?page=${page}&per_page=${perPage}`,
  );
  return data;
}

export async function getCall(id: string): Promise<Call> {
  const { data } = await api.get<{ data: Call }>(`/calls/${id}`);
  return data.data;
}

export async function createCall(payload: CreateCallPayload): Promise<Call> {
  const { data } = await api.post<{ data: Call }>('/calls', payload);
  return data.data;
}

export async function updateCall(id: string, payload: UpdateCallPayload): Promise<Call> {
  const { data } = await api.put<{ data: Call }>(`/calls/${id}`, payload);
  return data.data;
}

export async function deleteCall(id: string): Promise<void> {
  await api.delete(`/calls/${id}`);
}

export async function uploadContactPhoto(callId: string, file: File): Promise<{ key: string; url: string }> {
  const form = new FormData();
  form.append('image', file);
  const { data } = await api.post<{ key: string; url: string }>(
    `/calls/${callId}/image/photo`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return data;
}

export async function getPublicCall(slug: string): Promise<PublicCall> {
  const { data } = await api.get<{ data: PublicCall }>(`/public/calls/${slug}`);
  return data.data;
}
