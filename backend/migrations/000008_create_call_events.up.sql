CREATE TABLE call_events (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id             UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    trigger_at_seconds  INTEGER NOT NULL,
    type                VARCHAR(20) NOT NULL,
    title               VARCHAR(255) NOT NULL DEFAULT '',
    description         TEXT NOT NULL DEFAULT '',
    image_key           VARCHAR(500),
    button_text         VARCHAR(100),
    button_color        VARCHAR(7),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_call_events_call_id ON call_events (call_id);
