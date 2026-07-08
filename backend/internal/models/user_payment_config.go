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
		CreatedAt:           c.CreatedAt,
		UpdatedAt:           c.UpdatedAt,
	}
}
