ALTER TABLE call_events
    ADD COLUMN IF NOT EXISTS billing_payer_email TEXT NOT NULL DEFAULT '';
