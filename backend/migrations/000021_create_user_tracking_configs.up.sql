CREATE TABLE IF NOT EXISTS user_tracking_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    facebook_pixel_id VARCHAR(64) NOT NULL DEFAULT '',
    tiktok_pixel_id VARCHAR(64) NOT NULL DEFAULT '',
    google_analytics_id VARCHAR(32) NOT NULL DEFAULT '',
    gtm_container_id VARCHAR(32) NOT NULL DEFAULT '',
    utmify_token VARCHAR(128) NOT NULL DEFAULT '',
    custom_head_script TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
