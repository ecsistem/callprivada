import api from './api';

export type EventType = 'popup' | 'fullscreen' | 'fake_billing' | 'offer_call' | 'countdown' | 'upsell' | 'reconnect_paywall' | 'signal_drop' | 'fake_typing' | 'screenshot_alert' | 'battery_low' | 'incoming_call' | 'fake_gift' | 'viewer_count' | 'social_proof' | 'exclusive_access' | 'tip_jar' | 'video_lock' | 'phone_block';

export interface CallEvent {
  id: string;
  call_id: string;
  trigger_at_seconds: number;
  duration_seconds: number;
  type: EventType;
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
  created_at: string;
}

export interface UpsertEventPayload {
  trigger_at_seconds: number;
  duration_seconds?: number;
  type: EventType;
  title: string;
  description: string;
  button_text?: string;
  button_color?: string;
  offer_call_slug?: string;
  upsell_slug?: string;
  billing_amount_cents?: number;
  billing_collect_payer_info?: boolean;
  billing_payer_name?: string;
  billing_payer_document?: string;
  billing_payer_email?: string;
  billing_payer_phone?: string;
}

export async function listEvents(callId: string): Promise<CallEvent[]> {
  const { data } = await api.get<{ data: CallEvent[] }>(`/calls/${callId}/events`);
  return data.data;
}

export async function createEvent(callId: string, payload: UpsertEventPayload): Promise<CallEvent> {
  const { data } = await api.post<{ data: CallEvent }>(`/calls/${callId}/events`, payload);
  return data.data;
}

export async function updateEvent(eventId: string, payload: UpsertEventPayload): Promise<CallEvent> {
  const { data } = await api.put<{ data: CallEvent }>(`/events/${eventId}`, payload);
  return data.data;
}

export async function deleteEvent(eventId: string): Promise<void> {
  await api.delete(`/events/${eventId}`);
}
