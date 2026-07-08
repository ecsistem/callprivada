package models

import (
	"time"

	"github.com/google/uuid"

	"github.com/callprivada/fwlc-backend/internal/domain"
)

type UserTrackingConfig struct {
	ID                uuid.UUID `gorm:"type:uuid;primaryKey"`
	UserID            uuid.UUID `gorm:"type:uuid;not null;uniqueIndex"`
	FacebookPixelID   string    `gorm:"not null;default:''"`
	TikTokPixelID     string    `gorm:"not null;default:''"`
	GoogleAnalyticsID string    `gorm:"not null;default:''"`
	GTMContainerID    string    `gorm:"not null;default:''"`
	UTMifyToken       string    `gorm:"not null;default:''"`
	DracofyToken      string    `gorm:"not null;default:''"`
	CustomHeadScript  string    `gorm:"not null;default:''"`
	CreatedAt         time.Time
	UpdatedAt         time.Time
}

func (UserTrackingConfig) TableName() string { return "user_tracking_configs" }

func (m UserTrackingConfig) ToDomain() *domain.UserTrackingConfig {
	return &domain.UserTrackingConfig{
		ID:                m.ID,
		UserID:            m.UserID,
		FacebookPixelID:   m.FacebookPixelID,
		TikTokPixelID:     m.TikTokPixelID,
		GoogleAnalyticsID: m.GoogleAnalyticsID,
		GTMContainerID:    m.GTMContainerID,
		UTMifyToken:       m.UTMifyToken,
		DracofyToken:      m.DracofyToken,
		CustomHeadScript:  m.CustomHeadScript,
		CreatedAt:         m.CreatedAt,
		UpdatedAt:         m.UpdatedAt,
	}
}

func TrackingConfigFromDomain(c *domain.UserTrackingConfig) UserTrackingConfig {
	return UserTrackingConfig{
		ID:                c.ID,
		UserID:            c.UserID,
		FacebookPixelID:   c.FacebookPixelID,
		TikTokPixelID:     c.TikTokPixelID,
		GoogleAnalyticsID: c.GoogleAnalyticsID,
		GTMContainerID:    c.GTMContainerID,
		UTMifyToken:       c.UTMifyToken,
		DracofyToken:      c.DracofyToken,
		CustomHeadScript:  c.CustomHeadScript,
		CreatedAt:         c.CreatedAt,
		UpdatedAt:         c.UpdatedAt,
	}
}
