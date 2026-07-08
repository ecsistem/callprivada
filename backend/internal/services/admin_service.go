package services

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"github.com/callprivada/fwlc-backend/internal/domain"
)

type AdminStats struct {
	TotalUsers   int64 `json:"total_users"`
	ActiveSubs   int64 `json:"active_subscriptions"`
	TotalCalls   int64 `json:"total_calls"`
	TotalVisits  int64 `json:"total_visits"`
}

type AdminService struct {
	users     domain.UserRepository
	subs      domain.SubscriptionRepository
	calls     domain.CallRepository
	auditLogs domain.AuditLogRepository
	plans     domain.PlanRepository
}

func NewAdminService(
	users domain.UserRepository,
	subs domain.SubscriptionRepository,
	calls domain.CallRepository,
	auditLogs domain.AuditLogRepository,
	plans domain.PlanRepository,
) *AdminService {
	return &AdminService{users: users, subs: subs, calls: calls, auditLogs: auditLogs, plans: plans}
}

func (s *AdminService) Stats(ctx context.Context) (*AdminStats, error) {
	totalUsers, err := s.users.CountAll(ctx)
	if err != nil {
		return nil, err
	}
	activeSubs, _ := s.subs.CountActive()
	totalCalls, _ := s.calls.CountAll(ctx)

	return &AdminStats{
		TotalUsers:  totalUsers,
		ActiveSubs:  activeSubs,
		TotalCalls:  totalCalls,
		TotalVisits: 0,
	}, nil
}

func (s *AdminService) ListUsers(ctx context.Context, page, perPage int, search string) ([]*domain.User, int64, error) {
	return s.users.FindAll(ctx, page, perPage, search)
}

func (s *AdminService) BlockUser(ctx context.Context, adminID, userID uuid.UUID) error {
	if err := s.users.SetBlocked(ctx, userID, true); err != nil {
		return err
	}
	return s.log(ctx, adminID, "block_user", "user", &userID, "")
}

func (s *AdminService) UnblockUser(ctx context.Context, adminID, userID uuid.UUID) error {
	if err := s.users.SetBlocked(ctx, userID, false); err != nil {
		return err
	}
	return s.log(ctx, adminID, "unblock_user", "user", &userID, "")
}

func (s *AdminService) DeleteUser(ctx context.Context, adminID, userID uuid.UUID) error {
	if err := s.users.Delete(ctx, userID); err != nil {
		return err
	}
	return s.log(ctx, adminID, "delete_user", "user", &userID, "")
}

func (s *AdminService) ListSubscriptions(ctx context.Context, page, perPage int) ([]*domain.Subscription, int64, error) {
	return s.subs.FindAll(page, perPage)
}

func (s *AdminService) CancelSubscription(ctx context.Context, adminID, subID uuid.UUID) error {
	sub, err := s.subs.FindByID(subID)
	if err != nil {
		return err
	}
	sub.Status = domain.SubscriptionStatusCancelled
	if err := s.subs.Update(sub); err != nil {
		return err
	}
	return s.log(ctx, adminID, "cancel_subscription", "subscription", &subID, fmt.Sprintf("user_id=%s", sub.UserID))
}

func (s *AdminService) ListCalls(ctx context.Context, page, perPage int) ([]domain.Call, int64, error) {
	return s.calls.FindAllAdmin(ctx, page, perPage)
}

func (s *AdminService) DeleteCall(ctx context.Context, adminID, callID uuid.UUID) error {
	if err := s.calls.Delete(ctx, callID); err != nil {
		return err
	}
	return s.log(ctx, adminID, "delete_call", "call", &callID, "")
}

func (s *AdminService) ListAuditLogs(ctx context.Context, page, perPage int) ([]*domain.AuditLog, int64, error) {
	return s.auditLogs.List(ctx, page, perPage)
}

type CreateUserInput struct {
	Name     string
	Email    string
	Password string
}

func (s *AdminService) CreateUser(ctx context.Context, adminID uuid.UUID, in CreateUserInput) (*domain.User, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(in.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}
	user := &domain.User{
		ID:           uuid.New(),
		Name:         in.Name,
		Email:        in.Email,
		PasswordHash: string(hash),
	}
	if err := s.users.Create(ctx, user); err != nil {
		return nil, err
	}
	_ = s.log(ctx, adminID, "create_user", "user", &user.ID, in.Email)
	return user, nil
}

func (s *AdminService) AssignPlan(ctx context.Context, adminID, userID, planID uuid.UUID) error {
	if _, err := s.plans.FindByID(planID); err != nil {
		return err
	}
	// Cancel any existing active subscription
	existing, err := s.subs.FindActiveByUserID(userID)
	if err == nil && existing != nil {
		existing.Status = domain.SubscriptionStatusCancelled
		_ = s.subs.Update(existing)
	}
	sub := &domain.Subscription{
		UserID:                   userID,
		PlanID:                   planID,
		AbacatePaySubscriptionID: "admin_assigned_" + uuid.New().String(),
		Status:                   domain.SubscriptionStatusActive,
	}
	if err := s.subs.Create(sub); err != nil {
		return err
	}
	return s.log(ctx, adminID, "assign_plan", "user", &userID, fmt.Sprintf("plan_id=%s", planID))
}

func (s *AdminService) log(ctx context.Context, adminID uuid.UUID, action, target string, targetID *uuid.UUID, detail string) error {
	return s.auditLogs.Create(ctx, &domain.AuditLog{
		AdminID:  adminID,
		Action:   action,
		Target:   target,
		TargetID: targetID,
		Detail:   detail,
	})
}
