package models

import (
	"time"

	"github.com/google/uuid"

	"github.com/callprivada/fwlc-backend/internal/domain"
)

type CallEvent struct {
	ID                   uuid.UUID `gorm:"type:uuid;primaryKey"`
	CallID               uuid.UUID `gorm:"type:uuid;not null;index"`
	TriggerAtSeconds     int       `gorm:"not null"`
	DurationSeconds      int       `gorm:"not null;default:0"`
	Type                 string    `gorm:"not null"`
	Title                string    `gorm:"not null;default:''"`
	Description          string    `gorm:"not null;default:''"`
	ImageKey             string
	ButtonText           string
	ButtonColor          string
	OfferCallSlug        string `gorm:"not null;default:''"`
	UpsellSlug           string `gorm:"not null;default:''"`
	BillingAmountCents      int    `gorm:"not null;default:0"`
	BillingCollectPayerInfo bool   `gorm:"not null;default:false"`
	BillingPayerName        string `gorm:"not null;default:''"`
	BillingPayerDocument    string `gorm:"not null;default:''"`
	BillingPayerEmail       string `gorm:"not null;default:''"`
	BillingPayerPhone       string `gorm:"not null;default:''"`
	CreatedAt            time.Time
	UpdatedAt            time.Time
}

func (CallEvent) TableName() string { return "call_events" }

func (e CallEvent) ToDomain() *domain.CallEvent {
	return &domain.CallEvent{
		ID:                   e.ID,
		CallID:               e.CallID,
		TriggerAtSeconds:     e.TriggerAtSeconds,
		DurationSeconds:      e.DurationSeconds,
		Type:                 e.Type,
		Title:                e.Title,
		Description:          e.Description,
		ImageKey:             e.ImageKey,
		ButtonText:           e.ButtonText,
		ButtonColor:          e.ButtonColor,
		OfferCallSlug:        e.OfferCallSlug,
		UpsellSlug:           e.UpsellSlug,
		BillingAmountCents:      e.BillingAmountCents,
		BillingCollectPayerInfo: e.BillingCollectPayerInfo,
		BillingPayerName:        e.BillingPayerName,
		BillingPayerDocument:    e.BillingPayerDocument,
		BillingPayerEmail:       e.BillingPayerEmail,
		BillingPayerPhone:       e.BillingPayerPhone,
		CreatedAt:               e.CreatedAt,
		UpdatedAt:               e.UpdatedAt,
	}
}

func CallEventFromDomain(e *domain.CallEvent) CallEvent {
	return CallEvent{
		ID:                      e.ID,
		CallID:                  e.CallID,
		TriggerAtSeconds:        e.TriggerAtSeconds,
		DurationSeconds:         e.DurationSeconds,
		Type:                    e.Type,
		Title:                   e.Title,
		Description:             e.Description,
		ImageKey:                e.ImageKey,
		ButtonText:              e.ButtonText,
		ButtonColor:             e.ButtonColor,
		OfferCallSlug:           e.OfferCallSlug,
		UpsellSlug:              e.UpsellSlug,
		BillingAmountCents:      e.BillingAmountCents,
		BillingCollectPayerInfo: e.BillingCollectPayerInfo,
		BillingPayerName:        e.BillingPayerName,
		BillingPayerDocument:    e.BillingPayerDocument,
		BillingPayerEmail:       e.BillingPayerEmail,
		BillingPayerPhone:       e.BillingPayerPhone,
		CreatedAt:            e.CreatedAt,
		UpdatedAt:            e.UpdatedAt,
	}
}
