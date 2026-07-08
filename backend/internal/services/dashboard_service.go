package services

import (
	"context"

	"github.com/google/uuid"

	"github.com/callprivada/fwlc-backend/internal/domain"
)

type DashboardSummary struct {
	CallsCount  int64        `json:"calls_count"`
	ActiveLinks int64        `json:"active_links"`
	TotalViews  int64        `json:"total_views"`
	Plan        *domain.Plan `json:"plan"`
}

type DashboardService struct {
	calls  domain.CallRepository
	subs   domain.SubscriptionRepository
	plans  domain.PlanRepository
	visits domain.VisitRepository
}

func NewDashboardService(
	calls domain.CallRepository,
	subs domain.SubscriptionRepository,
	plans domain.PlanRepository,
	visits domain.VisitRepository,
) *DashboardService {
	return &DashboardService{calls: calls, subs: subs, plans: plans, visits: visits}
}

func (s *DashboardService) Summary(ctx context.Context, userID uuid.UUID) (*DashboardSummary, error) {
	_, total, err := s.calls.FindByUserID(ctx, userID, 1, 1)
	if err != nil {
		return nil, err
	}

	perPage := int(total)
	if perPage < 1 {
		perPage = 1
	}
	callList, _, err := s.calls.FindByUserID(ctx, userID, 1, perPage)
	if err != nil && total > 0 {
		return nil, err
	}

	var activeLinks int64
	for i := range callList {
		if callList[i].IsPubliclyAccessible() {
			activeLinks++
		}
	}

	var totalViews int64
	if total > 0 {
		ids := make([]uuid.UUID, len(callList))
		for i, c := range callList {
			ids[i] = c.ID
		}
		totalViews, _ = s.visits.CountByCallIDs(ctx, ids)
	}

	summary := &DashboardSummary{
		CallsCount:  total,
		ActiveLinks: activeLinks,
		TotalViews:  totalViews,
	}

	sub, err := s.subs.FindActiveByUserID(userID)
	if err == nil && sub != nil {
		plan, pErr := s.plans.FindByID(sub.PlanID)
		if pErr == nil {
			summary.Plan = plan
		}
	}

	return summary, nil
}
