import api from './api';

export interface PaymentConfig {
  zuckpay_client_id: string;
  zuckpay_client_secret: string;
  waymb_client_id: string;
  waymb_client_secret: string;
  waymb_account_email: string;
  active_gateway: 'zuckpay' | 'waymb';
  currency: string;
  configured: boolean;
  waymb_configured: boolean;
}

export async function getPaymentConfig(): Promise<PaymentConfig> {
  const { data } = await api.get<{ data: PaymentConfig }>('/settings/payment');
  return data.data;
}

export interface SavePaymentConfigPayload {
  zuckpay_client_id?: string;
  zuckpay_client_secret?: string;
  waymb_client_id?: string;
  waymb_client_secret?: string;
  waymb_account_email?: string;
  active_gateway?: 'zuckpay' | 'waymb';
  currency?: string;
}

export async function savePaymentConfig(payload: SavePaymentConfigPayload): Promise<PaymentConfig> {
  const { data } = await api.put<{ data: PaymentConfig }>('/settings/payment', payload);
  return data.data;
}
