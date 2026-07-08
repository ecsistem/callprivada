ALTER TABLE call_events
  DROP COLUMN IF EXISTS duration_seconds,
  DROP COLUMN IF EXISTS offer_call_slug;
