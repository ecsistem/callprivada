package models

import (
	"time"

	"github.com/google/uuid"

	"github.com/callprivada/fwlc-backend/internal/domain"
)

type Subscription struct {
	ID                       uuid.UUID  `gorm:"type:uuid;primaryKey"`
	UserID                   uuid.UUID  `gorm:"type:uuid;not null;index"`
	PlanID                   uuid.UUID  `gorm:"type:uuid;not null"`
	AbacatePaySubscriptionID string `gorm:"column:abacatepay_subscription_id"`
	Status                   string     `gorm:"not null;default:'pending'"`
	CurrentPeriodEnd         *time.Time
	CreatedAt                time.Time
	UpdatedAt                time.Time
}

func (Subscription) TableName() string { return "subscriptions" }

func (s Subscription) ToDomain() domain.Subscription {
	return domain.Subscription{
		ID:                       s.ID,
		UserID:                   s.UserID,
		PlanID:                   s.PlanID,
		AbacatePaySubscriptionID: s.AbacatePaySubscriptionID,
		Status:                   s.Status,
		CurrentPeriodEnd:         s.CurrentPeriodEnd,
		CreatedAt:                s.CreatedAt,
		UpdatedAt:                s.UpdatedAt,
	}
}

func SubscriptionFromDomain(s domain.Subscription) Subscription {
	return Subscription{
		ID:                       s.ID,
		UserID:                   s.UserID,
		PlanID:                   s.PlanID,
		AbacatePaySubscriptionID: s.AbacatePaySubscriptionID,
		Status:                   s.Status,
		CurrentPeriodEnd:         s.CurrentPeriodEnd,
		CreatedAt:                s.CreatedAt,
		UpdatedAt:                s.UpdatedAt,
	}
}
