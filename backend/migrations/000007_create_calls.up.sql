CREATE TABLE calls (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    video_id            UUID NOT NULL REFERENCES videos(id),
    slug                VARCHAR(100) NOT NULL,
    title               VARCHAR(255) NOT NULL,
    display_name        VARCHAR(100) NOT NULL,
    contact_photo_key   VARCHAR(500),
    thumbnail_key       VARCHAR(500),
    start_time_seconds  INTEGER NOT NULL DEFAULT 0,
    expires_at          TIMESTAMPTZ,
    status              VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_calls_slug    ON calls (slug);
CREATE        INDEX idx_calls_user_id ON calls (user_id);
