package domain

import (
	"time"

	"github.com/google/uuid"
)

const (
	SubscriptionStatusPending   = "pending"
	SubscriptionStatusActive    = "active"
	SubscriptionStatusCancelled = "cancelled"
	SubscriptionStatusExpired   = "expired"
)

type Subscription struct {
	ID                       uuid.UUID  `json:"id"`
	UserID                   uuid.UUID  `json:"user_id"`
	PlanID                   uuid.UUID  `json:"plan_id"`
	AbacatePaySubscriptionID string     `json:"abacate_pay_subscription_id,omitempty"`
	Status                   string     `json:"status"`
	CurrentPeriodEnd         *time.Time `json:"current_period_end,omitempty"`
	CreatedAt                time.Time  `json:"created_at"`
	UpdatedAt                time.Time  `json:"updated_at"`
}

func (s *Subscription) IsActive() bool {
	if s.Status != SubscriptionStatusActive {
		return false
	}
	if s.CurrentPeriodEnd != nil && time.Now().After(*s.CurrentPeriodEnd) {
		return false
	}
	return true
}

type SubscriptionRepository interface {
	Create(sub *Subscription) error
	Update(sub *Subscription) error
	FindByID(id uuid.UUID) (*Subscription, error)
	FindActiveByUserID(userID uuid.UUID) (*Subscription, error)
	FindByAbacatePayID(abacatePayID string) (*Subscription, error)
	// Admin
	FindAll(page, perPage int) ([]*Subscription, int64, error)
	CountActive() (int64, error)
}
