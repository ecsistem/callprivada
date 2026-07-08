package models

import (
	"time"

	"github.com/google/uuid"

	"github.com/callprivada/fwlc-backend/internal/domain"
)

type Call struct {
	ID               uuid.UUID  `gorm:"type:uuid;primaryKey"`
	UserID           uuid.UUID  `gorm:"type:uuid;not null;index"`
	VideoID          uuid.UUID  `gorm:"type:uuid;not null"`
	Slug             string     `gorm:"uniqueIndex;not null"`
	Title            string     `gorm:"not null"`
	DisplayName      string     `gorm:"not null"`
	ContactPhotoKey  string
	ThumbnailKey     string
	StartTimeSeconds int        `gorm:"not null;default:0"`
	EndTimeSeconds   int        `gorm:"not null;default:0"`
	PlaybackRate     float64    `gorm:"not null;default:1.0"`
	VideoZoom        float64    `gorm:"not null;default:1.0"`
	VideoX           float64    `gorm:"not null;default:0.0"`
	VideoY           float64    `gorm:"not null;default:0.0"`
	EntryPriceCents  int        `gorm:"not null;default:0"`
	LoopVideo        bool       `gorm:"not null;default:true"`
	CallMode           string     `gorm:"not null;default:'incoming'"`
	BillingMode        string     `gorm:"not null;default:'none'"`
	EndCallRedirectURL string     `gorm:"not null;default:''"`
	ExpiresAt            *time.Time
	Status           string     `gorm:"not null;default:'active'"`
	CreatedAt        time.Time
	UpdatedAt        time.Time
}

func (Call) TableName() string { return "calls" }

func (c Call) ToDomain() *domain.Call {
	return &domain.Call{
		ID:               c.ID,
		UserID:           c.UserID,
		VideoID:          c.VideoID,
		Slug:             c.Slug,
		Title:            c.Title,
		DisplayName:      c.DisplayName,
		ContactPhotoKey:  c.ContactPhotoKey,
		ThumbnailKey:     c.ThumbnailKey,
		StartTimeSeconds: c.StartTimeSeconds,
		EndTimeSeconds:   c.EndTimeSeconds,
		PlaybackRate:     c.PlaybackRate,
		VideoZoom:        c.VideoZoom,
		VideoX:           c.VideoX,
		VideoY:           c.VideoY,
		EntryPriceCents:  c.EntryPriceCents,
		LoopVideo:        c.LoopVideo,
		CallMode:           c.CallMode,
		BillingMode:        c.BillingMode,
		EndCallRedirectURL: c.EndCallRedirectURL,
		ExpiresAt:          c.ExpiresAt,
		Status:             c.Status,
		CreatedAt:          c.CreatedAt,
		UpdatedAt:          c.UpdatedAt,
	}
}

func CallFromDomain(c *domain.Call) Call {
	mode := c.CallMode
	if mode == "" {
		mode = domain.CallModeIncoming
	}
	billingMode := c.BillingMode
	if billingMode == "" {
		billingMode = "none"
	}
	return Call{
		ID:               c.ID,
		UserID:           c.UserID,
		VideoID:          c.VideoID,
		Slug:             c.Slug,
		Title:            c.Title,
		DisplayName:      c.DisplayName,
		ContactPhotoKey:  c.ContactPhotoKey,
		ThumbnailKey:     c.ThumbnailKey,
		StartTimeSeconds: c.StartTimeSeconds,
		EndTimeSeconds:   c.EndTimeSeconds,
		PlaybackRate:     c.PlaybackRate,
		VideoZoom:        c.VideoZoom,
		VideoX:           c.VideoX,
		VideoY:           c.VideoY,
		EntryPriceCents:  c.EntryPriceCents,
		LoopVideo:        c.LoopVideo,
		CallMode:         mode,
		BillingMode:      billingMode,
		EndCallRedirectURL: c.EndCallRedirectURL,
		ExpiresAt:            c.ExpiresAt,
		Status:           c.Status,
		CreatedAt:        c.CreatedAt,
		UpdatedAt:        c.UpdatedAt,
	}
}
