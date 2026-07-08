CREATE TABLE IF NOT EXISTS visits (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id         UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    ip              TEXT NOT NULL DEFAULT '',
    country         TEXT NOT NULL DEFAULT '',
    city            TEXT NOT NULL DEFAULT '',
    device_type     TEXT NOT NULL DEFAULT '',
    browser         TEXT NOT NULL DEFAULT '',
    os              TEXT NOT NULL DEFAULT '',
    referrer        TEXT NOT NULL DEFAULT '',
    watched_seconds INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visits_call_id    ON visits(call_id);
CREATE INDEX IF NOT EXISTS idx_visits_created_at ON visits(created_at);
