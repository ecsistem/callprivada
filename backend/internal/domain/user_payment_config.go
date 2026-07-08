package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type UserPaymentConfig struct {
	ID                   uuid.UUID
	UserID               uuid.UUID
	ZuckPayClientID      string
	ZuckPayClientSecret  string
	CreatedAt            time.Time
	UpdatedAt            time.Time
}

func (c *UserPaymentConfig) IsConfigured() bool {
	return c.ZuckPayClientID != "" && c.ZuckPayClientSecret != ""
}

type PaymentConfigRepository interface {
	Upsert(ctx context.Context, cfg *UserPaymentConfig) error
	FindByUserID(ctx context.Context, userID uuid.UUID) (*UserPaymentConfig, error)
}
