ALTER TABLE user_tracking_configs ADD COLUMN IF NOT EXISTS clarity_project_id VARCHAR(32) NOT NULL DEFAULT '';
