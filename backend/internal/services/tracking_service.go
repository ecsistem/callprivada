package services

import (
	"context"
	"errors"

	"github.com/google/uuid"

	"github.com/callprivada/fwlc-backend/internal/domain"
)

type TrackingService struct {
	repo domain.TrackingConfigRepository
}

func NewTrackingService(repo domain.TrackingConfigRepository) *TrackingService {
	return &TrackingService{repo: repo}
}

func (s *TrackingService) Get(ctx context.Context, userID uuid.UUID) (*domain.UserTrackingConfig, error) {
	cfg, err := s.repo.FindByUserID(ctx, userID)
	if errors.Is(err, domain.ErrNotFound) {
		return &domain.UserTrackingConfig{UserID: userID}, nil
	}
	return cfg, err
}

func (s *TrackingService) Save(ctx context.Context, userID uuid.UUID, in *domain.UserTrackingConfig) (*domain.UserTrackingConfig, error) {
	in.UserID = userID
	if err := s.repo.Upsert(ctx, in); err != nil {
		return nil, err
	}
	return in, nil
}
