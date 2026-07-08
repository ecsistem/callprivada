package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

const (
	CallStatusActive   = "active"
	CallStatusExpired  = "expired"
	CallStatusDisabled = "disabled"

	// CallMode: incoming = modelo liga para o cliente (cliente atende)
	//           outgoing = cliente liga para a modelo (auto-conecta)
	CallModeIncoming = "incoming"
	CallModeOutgoing = "outgoing"
)

type Call struct {
	ID                uuid.UUID  `json:"id"`
	UserID            uuid.UUID  `json:"user_id"`
	VideoID           uuid.UUID  `json:"video_id"`
	Slug              string     `json:"slug"`
	Title             string     `json:"title"`
	DisplayName       string     `json:"display_name"`
	ContactPhotoKey   string     `json:"contact_photo_key,omitempty"`
	ThumbnailKey      string     `json:"thumbnail_key,omitempty"`
	StartTimeSeconds  int        `json:"start_time_seconds"`
	EndTimeSeconds    int        `json:"end_time_seconds"`
	PlaybackRate      float64    `json:"playback_rate"`
	VideoZoom         float64    `json:"video_zoom"`
	VideoX            float64    `json:"video_x"`
	VideoY            float64    `json:"video_y"`
	EntryPriceCents   int        `json:"entry_price_cents"`
	LoopVideo         bool       `json:"loop_video"`
	CallMode          string     `json:"call_mode"`
	BillingMode       string     `json:"billing_mode"`
	EndCallRedirectURL    string     `json:"end_call_redirect_url,omitempty"`
	ExpiresAt             *time.Time `json:"expires_at,omitempty"`
	Status            string     `json:"status"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
}

func (c *Call) IsPubliclyAccessible() bool {
	if c.Status != CallStatusActive {
		return false
	}
	if c.ExpiresAt != nil && time.Now().After(*c.ExpiresAt) {
		return false
	}
	return true
}

type CallRepository interface {
	Create(ctx context.Context, c *Call) error
	Update(ctx context.Context, c *Call) error
	Delete(ctx context.Context, id uuid.UUID) error
	FindByID(ctx context.Context, id uuid.UUID) (*Call, error)
	FindBySlug(ctx context.Context, slug string) (*Call, error)
	FindByUserID(ctx context.Context, userID uuid.UUID, page, perPage int) ([]Call, int64, error)
	CountByUserID(ctx context.Context, userID uuid.UUID) (int64, error)
	SlugExists(ctx context.Context, slug string) (bool, error)
	// Admin
	FindAllAdmin(ctx context.Context, page, perPage int) ([]Call, int64, error)
	CountAll(ctx context.Context) (int64, error)
}
