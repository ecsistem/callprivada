ALTER TABLE call_events
    ADD COLUMN IF NOT EXISTS billing_payer_name     TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS billing_payer_document TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS billing_payer_phone    TEXT NOT NULL DEFAULT '';
