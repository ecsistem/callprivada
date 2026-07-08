ALTER TABLE call_events
    DROP COLUMN IF EXISTS billing_payer_name,
    DROP COLUMN IF EXISTS billing_payer_document,
    DROP COLUMN IF EXISTS billing_payer_phone;
