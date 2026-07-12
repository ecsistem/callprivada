ALTER TABLE user_payment_configs
    DROP COLUMN IF EXISTS waymb_client_id,
    DROP COLUMN IF EXISTS waymb_client_secret,
    DROP COLUMN IF EXISTS waymb_account_email,
    DROP COLUMN IF EXISTS active_gateway;
