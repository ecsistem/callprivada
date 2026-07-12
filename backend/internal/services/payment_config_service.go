package services

import (
	"context"
	"errors"

	"github.com/google/uuid"

	"github.com/callprivada/fwlc-backend/internal/domain"
)

type PaymentConfigService struct {
	configs domain.PaymentConfigRepository
}

func NewPaymentConfigService(configs domain.PaymentConfigRepository) *PaymentConfigService {
	return &PaymentConfigService{configs: configs}
}

func (s *PaymentConfigService) Get(ctx context.Context, userID uuid.UUID) (*domain.UserPaymentConfig, error) {
	cfg, err := s.configs.FindByUserID(ctx, userID)
	if errors.Is(err, domain.ErrNotFound) {
		return &domain.UserPaymentConfig{UserID: userID, ActiveGateway: "zuckpay"}, nil
	}
	return cfg, err
}

type SavePaymentConfigInput struct {
	ZuckPayClientID     string
	ZuckPayClientSecret string
	WayMBClientID       string
	WayMBClientSecret   string
	WayMBAccountEmail   string
	ActiveGateway       string
	Currency            string
}

func (s *PaymentConfigService) Save(ctx context.Context, userID uuid.UUID, in SavePaymentConfigInput) (*domain.UserPaymentConfig, error) {
	gw := in.ActiveGateway
	if gw == "" {
		gw = "zuckpay"
	}
	cur := in.Currency
	if cur == "" {
		cur = "BRL"
	}
	cfg := &domain.UserPaymentConfig{
		UserID:              userID,
		ZuckPayClientID:     in.ZuckPayClientID,
		ZuckPayClientSecret: in.ZuckPayClientSecret,
		WayMBClientID:       in.WayMBClientID,
		WayMBClientSecret:   in.WayMBClientSecret,
		WayMBAccountEmail:   in.WayMBAccountEmail,
		ActiveGateway:       gw,
		Currency:            cur,
	}
	if err := s.configs.Upsert(ctx, cfg); err != nil {
		return nil, err
	}
	return cfg, nil
}
