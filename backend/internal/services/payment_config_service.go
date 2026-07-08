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
		// Retorna config vazia (sem erro) se ainda não configurado.
		return &domain.UserPaymentConfig{UserID: userID}, nil
	}
	return cfg, err
}

func (s *PaymentConfigService) Save(ctx context.Context, userID uuid.UUID, clientID, clientSecret string) (*domain.UserPaymentConfig, error) {
	cfg := &domain.UserPaymentConfig{
		UserID:              userID,
		ZuckPayClientID:     clientID,
		ZuckPayClientSecret: clientSecret,
	}
	if err := s.configs.Upsert(ctx, cfg); err != nil {
		return nil, err
	}
	return cfg, nil
}
