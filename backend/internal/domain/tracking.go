package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type UserTrackingConfig struct {
	ID                uuid.UUID `json:"id"`
	UserID            uuid.UUID `json:"user_id"`
	FacebookPixelID   string    `json:"facebook_pixel_id"`
	TikTokPixelID     string    `json:"tiktok_pixel_id"`
	GoogleAnalyticsID string    `json:"google_analytics_id"`
	GTMContainerID    string    `json:"gtm_container_id"`
	UTMifyToken       string    `json:"utmify_token"`
	DracofyToken      string    `json:"dracofy_token"`
	CustomHeadScript  string    `json:"custom_head_script"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

type TrackingConfigRepository interface {
	Upsert(ctx context.Context, cfg *UserTrackingConfig) error
	FindByUserID(ctx context.Context, userID uuid.UUID) (*UserTrackingConfig, error)
}
