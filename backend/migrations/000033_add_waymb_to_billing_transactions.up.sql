ALTER TABLE billing_transactions
    ADD COLUMN IF NOT EXISTS gateway              TEXT NOT NULL DEFAULT 'zuckpay',
    ADD COLUMN IF NOT EXISTS waymb_txn_id        TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS waymb_method        TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS multibanco_entity   TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS multibanco_reference TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS multibanco_expires_at BIGINT NOT NULL DEFAULT 0;
