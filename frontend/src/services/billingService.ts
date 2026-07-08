import api from './api';

export interface BillingResult {
  transaction_id: string;
  qr_code: string;
  qr_code_url: string;
  checkout_url: string;
  amount_cents: number;
}

export interface CreatePixPayload {
  payer_name: string;
  payer_document: string;
  payer_email: string;
  payer_phone?: string;
}

export async function createPixPayment(
  slug: string,
  amountCents: number,
  payload: CreatePixPayload,
): Promise<BillingResult> {
  const { data } = await api.post<{ data: BillingResult }>(
    `/public/calls/${slug}/billing/pix?amount_cents=${amountCents}`,
    payload,
  );
  return data.data;
}

export interface PixStatusResult {
  status: string;
  amount_cents: number;
  paid: boolean;
}

export async function checkPixStatus(transactionId: string): Promise<PixStatusResult> {
  const { data } = await api.get<{ data: PixStatusResult }>(
    `/public/billing/transactions/${transactionId}/status`,
  );
  return data.data;
}
