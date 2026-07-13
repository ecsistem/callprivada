CREATE TABLE IF NOT EXISTS app_settings (
    key        VARCHAR(64) PRIMARY KEY,
    value      TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
