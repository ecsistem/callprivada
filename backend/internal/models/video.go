package models

import (
	"time"

	"github.com/google/uuid"

	"github.com/callprivada/fwlc-backend/internal/domain"
)

type Video struct {
	ID              uuid.UUID `gorm:"type:uuid;primaryKey"`
	UserID          uuid.UUID `gorm:"type:uuid;not null;index"`
	StorageKey      string    `gorm:"not null"`
	OriginalName    string    `gorm:"not null"`
	MimeType        string    `gorm:"not null"`
	SizeBytes       int64     `gorm:"not null;default:0"`
	DurationSeconds *float64
	Status          string    `gorm:"not null;default:'uploading'"`
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

func (Video) TableName() string { return "videos" }

func (v Video) ToDomain() *domain.Video {
	return &domain.Video{
		ID:              v.ID,
		UserID:          v.UserID,
		StorageKey:      v.StorageKey,
		OriginalName:    v.OriginalName,
		MimeType:        v.MimeType,
		SizeBytes:       v.SizeBytes,
		DurationSeconds: v.DurationSeconds,
		Status:          v.Status,
		CreatedAt:       v.CreatedAt,
		UpdatedAt:       v.UpdatedAt,
	}
}

func VideoFromDomain(v *domain.Video) Video {
	return Video{
		ID:              v.ID,
		UserID:          v.UserID,
		StorageKey:      v.StorageKey,
		OriginalName:    v.OriginalName,
		MimeType:        v.MimeType,
		SizeBytes:       v.SizeBytes,
		DurationSeconds: v.DurationSeconds,
		Status:          v.Status,
		CreatedAt:       v.CreatedAt,
		UpdatedAt:       v.UpdatedAt,
	}
}
