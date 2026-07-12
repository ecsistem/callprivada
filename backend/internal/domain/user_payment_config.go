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
	WayMBClientID        string
	WayMBClientSecret    string
	WayMBAccountEmail    string
	ActiveGateway        string // "zuckpay" | "waymb"
	Currency             string // "BRL" | "EUR" | "USD" | "GBP"
	CreatedAt            time.Time
	UpdatedAt            time.Time
}

func (c *UserPaymentConfig) IsConfigured() bool {
	return c.ZuckPayClientID != "" && c.ZuckPayClientSecret != ""
}

func (c *UserPaymentConfig) IsWayMBConfigured() bool {
	return c.WayMBClientID != "" && c.WayMBClientSecret != "" && c.WayMBAccountEmail != ""
}

func (c *UserPaymentConfig) IsAnyConfigured() bool {
	return c.IsConfigured() || c.IsWayMBConfigured()
}

func (c *UserPaymentConfig) Gateway() string {
	if c.ActiveGateway != "" {
		return c.ActiveGateway
	}
	return "zuckpay"
}

type PaymentConfigRepository interface {
	Upsert(ctx context.Context, cfg *UserPaymentConfig) error
	FindByUserID(ctx context.Context, userID uuid.UUID) (*UserPaymentConfig, error)
}
