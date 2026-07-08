package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type PresellComment struct {
	Name        string `json:"name"`
	AvatarEmoji string `json:"avatar_emoji,omitempty"`
	Text        string `json:"text"`
	Time        string `json:"time,omitempty"`
	Likes       int    `json:"likes,omitempty"`
}

// PresellConfig holds all customizable fields for a presell page.
// Stored as JSONB in the database.
type PresellConfig struct {
	// Visual
	BgColor    string `json:"bg_color"`
	TextColor  string `json:"text_color"`
	BgImageURL string `json:"bg_image_url,omitempty"`

	// Header
	AvatarURL   string `json:"avatar_url,omitempty"`
	Name        string `json:"name"`
	Badge       string `json:"badge,omitempty"`
	Headline    string `json:"headline"`
	Subheadline string `json:"subheadline,omitempty"`

	// Slots (optional scheduling UI)
	ShowSlots        bool     `json:"show_slots"`
	SlotLabels       []string `json:"slot_labels,omitempty"`
	SlotAvailability []bool   `json:"slot_availability,omitempty"`
	UseRealTime      bool     `json:"use_real_time,omitempty"`

	// Social proof
	ShowViewerCount  bool `json:"show_viewer_count,omitempty"`
	ViewerCountBase  int  `json:"viewer_count_base,omitempty"`

	// Countdown
	ShowCountdown    bool `json:"show_countdown,omitempty"`
	CountdownSeconds int  `json:"countdown_seconds,omitempty"`

	// Location badge
	LocationLabel string `json:"location_label,omitempty"`
	LocationCity  string `json:"location_city,omitempty"`

	// Video
	VideoURL       string `json:"video_url,omitempty"`
	VideoPosterURL string `json:"video_poster_url,omitempty"`

	// Comments
	ShowComments bool             `json:"show_comments,omitempty"`
	Comments     []PresellComment `json:"comments,omitempty"`

	// CTA
	CTAText  string `json:"cta_text"`
	CTAColor string `json:"cta_color"`

	// Redirect destination — /c/:slug or external URL
	RedirectURL string `json:"redirect_url"`

	// Downsell — slug da página downsell para exit-intent
	DownsellSlug string `json:"downsell_slug,omitempty"`
}

const (
	PresellTypePresell  = "presell"
	PresellTypeDownsell = "downsell"
	PresellTypeUpsell   = "upsell"
)

type PresellPage struct {
	ID           uuid.UUID     `json:"id"`
	UserID       uuid.UUID     `json:"user_id"`
	CallID       *uuid.UUID    `json:"call_id,omitempty"`
	Slug         string        `json:"slug"`
	Type         string        `json:"type"` // "presell" | "downsell" | "upsell"
	TemplateSlug string        `json:"template_slug"`
	Config       PresellConfig `json:"config"`
	CTAClicks    int           `json:"cta_clicks"`
	CreatedAt    time.Time     `json:"created_at"`
	UpdatedAt    time.Time     `json:"updated_at"`
}

type PresellPageRepository interface {
	Create(ctx context.Context, p *PresellPage) error
	Update(ctx context.Context, p *PresellPage) error
	Delete(ctx context.Context, id, userID uuid.UUID) error
	FindByID(ctx context.Context, id, userID uuid.UUID) (*PresellPage, error)
	FindBySlug(ctx context.Context, slug string) (*PresellPage, error)
	FindByUserID(ctx context.Context, userID uuid.UUID, typeFilter string, page, perPage int) ([]PresellPage, int64, error)
	FindByCallID(ctx context.Context, callID uuid.UUID) ([]PresellPage, error)
	CountByUserID(ctx context.Context, userID uuid.UUID) (int64, error)
	IncrementCTAClicks(ctx context.Context, slug string) error
	SlugExists(ctx context.Context, slug string) (bool, error)
}
