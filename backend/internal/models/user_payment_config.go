package models

import (
	"time"

	"github.com/google/uuid"

	"github.com/callprivada/fwlc-backend/internal/domain"
)

type UserPaymentConfig struct {
	ID                  uuid.UUID `gorm:"type:uuid;primaryKey"`
	UserID              uuid.UUID `gorm:"type:uuid;not null;uniqueIndex"`
	ZuckPayClientID     string    `gorm:"column:zuckpay_client_id;not null;default:''"`
	ZuckPayClientSecret string    `gorm:"column:zuckpay_client_secret;not null;default:''"`
	WayMBClientID       string    `gorm:"column:waymb_client_id;not null;default:''"`
	WayMBClientSecret   string    `gorm:"column:waymb_client_secret;not null;default:''"`
	WayMBAccountEmail   string    `gorm:"column:waymb_account_email;not null;default:''"`
	ActiveGateway       string    `gorm:"column:active_gateway;not null;default:'zuckpay'"`
	Currency            string    `gorm:"column:currency;not null;default:'BRL'"`
	CreatedAt           time.Time
	UpdatedAt           time.Time
}

func (UserPaymentConfig) TableName() string { return "user_payment_configs" }

func (m UserPaymentConfig) ToDomain() *domain.UserPaymentConfig {
	return &domain.UserPaymentConfig{
		ID:                  m.ID,
		UserID:              m.UserID,
		ZuckPayClientID:     m.ZuckPayClientID,
		ZuckPayClientSecret: m.ZuckPayClientSecret,
		WayMBClientID:       m.WayMBClientID,
		WayMBClientSecret:   m.WayMBClientSecret,
		WayMBAccountEmail:   m.WayMBAccountEmail,
		ActiveGateway:       m.ActiveGateway,
		Currency:            m.Currency,
		CreatedAt:           m.CreatedAt,
		UpdatedAt:           m.UpdatedAt,
	}
}

func PaymentConfigFromDomain(c *domain.UserPaymentConfig) UserPaymentConfig {
	return UserPaymentConfig{
		ID:                  c.ID,
		UserID:              c.UserID,
		ZuckPayClientID:     c.ZuckPayClientID,
		ZuckPayClientSecret: c.ZuckPayClientSecret,
		WayMBClientID:       c.WayMBClientID,
		WayMBClientSecret:   c.WayMBClientSecret,
		WayMBAccountEmail:   c.WayMBAccountEmail,
		ActiveGateway:       c.ActiveGateway,
		Currency:            c.Currency,
		CreatedAt:           c.CreatedAt,
		UpdatedAt:           c.UpdatedAt,
	}
}
