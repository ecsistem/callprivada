package services

import (
	"context"

	"github.com/google/uuid"

	"github.com/callprivada/fwlc-backend/internal/domain"
	"github.com/callprivada/fwlc-backend/internal/utils"
)

type VisitService struct {
	visits domain.VisitRepository
	calls  domain.CallRepository
}

func NewVisitService(visits domain.VisitRepository, calls domain.CallRepository) *VisitService {
	return &VisitService{visits: visits, calls: calls}
}

type TrackVisitInput struct {
	Slug           string
	IP             string
	UserAgent      string
	Referrer       string
}

type TrackVisitResult struct {
	Visit      *domain.Visit
	CallUserID uuid.UUID
	CallTitle  string
}

func (s *VisitService) Track(ctx context.Context, in TrackVisitInput) (*TrackVisitResult, error) {
	call, err := s.calls.FindBySlug(ctx, in.Slug)
	if err != nil {
		return nil, err
	}
	if !call.IsPubliclyAccessible() {
		return nil, domain.ErrCallExpired
	}

	device, browser, os := utils.ParseUA(in.UserAgent)

	v := &domain.Visit{
		CallID:     call.ID,
		IP:         in.IP,
		DeviceType: device,
		Browser:    browser,
		OS:         os,
		Referrer:   in.Referrer,
	}
	if err := s.visits.Create(ctx, v); err != nil {
		return nil, err
	}
	return &TrackVisitResult{Visit: v, CallUserID: call.UserID, CallTitle: call.Title}, nil
}

func (s *VisitService) UpdateWatched(ctx context.Context, visitID uuid.UUID, seconds int) error {
	if seconds < 0 {
		seconds = 0
	}
	return s.visits.UpdateWatched(ctx, visitID, seconds)
}

func (s *VisitService) Analytics(ctx context.Context, userID, callID uuid.UUID) (*domain.CallAnalytics, error) {
	call, err := s.calls.FindByID(ctx, callID)
	if err != nil {
		return nil, err
	}
	if call.UserID != userID {
		return nil, domain.ErrForbidden
	}
	return s.visits.Analytics(ctx, callID)
}
