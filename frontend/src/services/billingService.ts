import api from './api';

export interface BillingResult {
  transaction_id: string;
  zuckpay_txn_id: string;
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

export async function checkPixStatus(
  transactionId: string,
  opts?: { zuckpayTxnId?: string; slug?: string },
): Promise<PixStatusResult> {
  const params = new URLSearchParams();
  if (opts?.zuckpayTxnId) params.set('zuckpay_txn_id', opts.zuckpayTxnId);
  if (opts?.slug) params.set('slug', opts.slug);
  const qs = params.toString() ? `?${params}` : '';
  const { data } = await api.get<{ data: PixStatusResult }>(
    `/public/billing/transactions/${transactionId}/status${qs}`,
  );
  return data.data;
}
