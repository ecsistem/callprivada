CREATE TABLE IF NOT EXISTS presell_pages (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    call_id       UUID REFERENCES calls(id) ON DELETE SET NULL,
    slug          VARCHAR(32) NOT NULL UNIQUE,
    template_slug VARCHAR(64) NOT NULL DEFAULT 'formal',
    config        JSONB NOT NULL DEFAULT '{}',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_presell_pages_user_id ON presell_pages(user_id);
CREATE INDEX IF NOT EXISTS idx_presell_pages_slug    ON presell_pages(slug);
