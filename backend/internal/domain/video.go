package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

const (
	VideoStatusUploading = "uploading"
	VideoStatusReady     = "ready"
	VideoStatusFailed    = "failed"

	VideoMaxBytes = 2 * 1024 * 1024 * 1024 // 2 GB
)

var AllowedVideoMIMEs = map[string]bool{
	"video/mp4":       true,
	"video/quicktime": true, // .mov
	"video/webm":      true,
}

type Video struct {
	ID              uuid.UUID
	UserID          uuid.UUID
	StorageKey      string
	OriginalName    string
	MimeType        string
	SizeBytes       int64
	DurationSeconds *float64
	Status          string
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

type VideoRepository interface {
	Create(ctx context.Context, v *Video) error
	Update(ctx context.Context, v *Video) error
	FindByID(ctx context.Context, id uuid.UUID) (*Video, error)
	FindByUserID(ctx context.Context, userID uuid.UUID) ([]Video, error)
	Delete(ctx context.Context, id uuid.UUID) error
}
