import api from './api';

export interface PaymentConfig {
  zuckpay_client_id: string;
  zuckpay_client_secret: string;
  configured: boolean;
}

export async function getPaymentConfig(): Promise<PaymentConfig> {
  const { data } = await api.get<{ data: PaymentConfig }>('/settings/payment');
  return data.data;
}

export async function savePaymentConfig(clientId: string, clientSecret: string): Promise<PaymentConfig> {
  const { data } = await api.put<{ data: PaymentConfig }>('/settings/payment', {
    zuckpay_client_id: clientId,
    zuckpay_client_secret: clientSecret,
  });
  return data.data;
}
