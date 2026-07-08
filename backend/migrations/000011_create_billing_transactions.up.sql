CREATE TABLE IF NOT EXISTS billing_transactions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id             UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    zuckpay_txn_id      TEXT NOT NULL DEFAULT '',
    amount_cents        INTEGER NOT NULL,
    status              TEXT NOT NULL DEFAULT 'PENDING',
    payer_name          TEXT NOT NULL DEFAULT '',
    payer_document      TEXT NOT NULL DEFAULT '',
    payer_email         TEXT NOT NULL DEFAULT '',
    qr_code             TEXT NOT NULL DEFAULT '',
    qr_code_url         TEXT NOT NULL DEFAULT '',
    checkout_url        TEXT NOT NULL DEFAULT '',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_transactions_call_id ON billing_transactions(call_id);
CREATE INDEX IF NOT EXISTS idx_billing_transactions_zuckpay_txn_id ON billing_transactions(zuckpay_txn_id);
