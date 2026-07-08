package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

const (
	EventTypePopup       = "popup"
	EventTypeFullscreen  = "fullscreen"
	EventTypeFakeBilling = "fake_billing"
	EventTypeOfferCall   = "offer_call"
	EventTypeCountdown         = "countdown"
	EventTypeUpsell            = "upsell"
	EventTypeReconnectPaywall  = "reconnect_paywall"
	EventTypeSignalDrop        = "signal_drop"
	EventTypeFakeTyping        = "fake_typing"
)

type CallEvent struct {
	ID                   uuid.UUID `json:"id"`
	CallID               uuid.UUID `json:"call_id"`
	TriggerAtSeconds     int       `json:"trigger_at_seconds"`
	DurationSeconds      int       `json:"duration_seconds"`
	Type                 string    `json:"type"`
	Title                string    `json:"title"`
	Description          string    `json:"description"`
	ImageKey             string    `json:"image_key,omitempty"`
	ButtonText           string    `json:"button_text"`
	ButtonColor          string    `json:"button_color"`
	OfferCallSlug        string    `json:"offer_call_slug,omitempty"`
	UpsellSlug           string    `json:"upsell_slug,omitempty"`
	BillingAmountCents      int       `json:"billing_amount_cents"`
	BillingCollectPayerInfo bool      `json:"billing_collect_payer_info"`
	BillingPayerName        string    `json:"billing_payer_name"`
	BillingPayerDocument    string    `json:"billing_payer_document"`
	BillingPayerEmail       string    `json:"billing_payer_email"`
	BillingPayerPhone       string    `json:"billing_payer_phone"`
	CreatedAt            time.Time `json:"created_at"`
	UpdatedAt            time.Time `json:"updated_at"`
}

type CallEventRepository interface {
	Create(ctx context.Context, e *CallEvent) error
	Update(ctx context.Context, e *CallEvent) error
	Delete(ctx context.Context, id uuid.UUID) error
	FindByID(ctx context.Context, id uuid.UUID) (*CallEvent, error)
	FindByCallID(ctx context.Context, callID uuid.UUID) ([]CallEvent, error)
}
