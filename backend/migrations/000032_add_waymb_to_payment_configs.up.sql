ALTER TABLE user_payment_configs
    ADD COLUMN IF NOT EXISTS waymb_client_id      TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS waymb_client_secret  TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS waymb_account_email  TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS active_gateway       TEXT NOT NULL DEFAULT 'zuckpay';
