package services

import (
	"context"
	"errors"

	"github.com/google/uuid"

	"github.com/callprivada/fwlc-backend/internal/domain"
)

type SubscriptionService struct {
	plans   domain.PlanRepository
	subs    domain.SubscriptionRepository
	users   domain.UserRepository
	gateway domain.PaymentGateway
}

func NewSubscriptionService(
	plans domain.PlanRepository,
	subs domain.SubscriptionRepository,
	users domain.UserRepository,
	gateway domain.PaymentGateway,
) *SubscriptionService {
	return &SubscriptionService{plans: plans, subs: subs, users: users, gateway: gateway}
}

func (s *SubscriptionService) ListPlans(_ context.Context) ([]domain.Plan, error) {
	return s.plans.FindAll()
}

func (s *SubscriptionService) ListAllPlans(_ context.Context) ([]domain.Plan, error) {
	return s.plans.FindAllAdmin()
}

type CreatePlanInput struct {
	Name                string
	PriceCents          int
	Interval            string
	AbacatePayProductID string
	MaxCalls            int
	MaxPresells         int
	MaxVideos           int
}

func (s *SubscriptionService) CreatePlan(_ context.Context, in CreatePlanInput) (*domain.Plan, error) {
	p := &domain.Plan{
		Name:                in.Name,
		PriceCents:          in.PriceCents,
		Interval:            in.Interval,
		AbacatePayProductID: in.AbacatePayProductID,
		Active:              true,
		MaxCalls:            in.MaxCalls,
		MaxPresells:         in.MaxPresells,
		MaxVideos:           in.MaxVideos,
	}
	if err := s.plans.Create(p); err != nil {
		return nil, err
	}
	return s.plans.FindByID(p.ID)
}

type UpdatePlanInput struct {
	Name                string
	PriceCents          int
	Interval            string
	AbacatePayProductID string
	Active              bool
	MaxCalls            int
	MaxPresells         int
	MaxVideos           int
}

func (s *SubscriptionService) UpdatePlan(_ context.Context, planID uuid.UUID, in UpdatePlanInput) (*domain.Plan, error) {
	p, err := s.plans.FindByID(planID)
	if err != nil {
		return nil, err
	}
	p.Name = in.Name
	p.PriceCents = in.PriceCents
	p.Interval = in.Interval
	p.AbacatePayProductID = in.AbacatePayProductID
	p.Active = in.Active
	p.MaxCalls = in.MaxCalls
	p.MaxPresells = in.MaxPresells
	p.MaxVideos = in.MaxVideos
	if err := s.plans.Update(p); err != nil {
		return nil, err
	}
	return p, nil
}

func (s *SubscriptionService) GetPlan(_ context.Context, planID uuid.UUID) (*domain.Plan, error) {
	p, err := s.plans.FindByID(planID)
	if err != nil {
		return nil, err
	}
	return p, nil
}

type UpdatePlanLimitsInput struct {
	MaxCalls    int
	MaxPresells int
	MaxVideos   int
}

func (s *SubscriptionService) UpdatePlanLimits(_ context.Context, planID uuid.UUID, in UpdatePlanLimitsInput) (*domain.Plan, error) {
	p, err := s.plans.FindByID(planID)
	if err != nil {
		return nil, err
	}
	p.MaxCalls = in.MaxCalls
	p.MaxPresells = in.MaxPresells
	p.MaxVideos = in.MaxVideos
	if err := s.plans.Update(p); err != nil {
		return nil, err
	}
	return p, nil
}

// Checkout cria uma assinatura pendente + retorna a URL do checkout do AbacatePay.
func (s *SubscriptionService) Checkout(ctx context.Context, userID, planID uuid.UUID) (string, error) {
	// Impede dupla assinatura ativa.
	existing, err := s.subs.FindActiveByUserID(userID)
	if err != nil && !errors.Is(err, domain.ErrNotFound) {
		return "", err
	}
	if existing != nil {
		return "", domain.ErrAlreadySubscribed
	}

	plan, err := s.plans.FindByID(planID)
	if err != nil {
		return "", err
	}

	user, err := s.users.FindByID(ctx, userID)
	if err != nil {
		return "", err
	}

	gw, err := s.gateway.CreateSubscription(
		userID.String(), planID.String(),
		plan.AbacatePayProductID,
		user.Name, user.Email, "",
	)
	if err != nil {
		return "", err
	}

	sub := &domain.Subscription{
		UserID:                   userID,
		PlanID:                   planID,
		AbacatePaySubscriptionID: gw.GatewayID,
		Status:                   domain.SubscriptionStatusPending,
	}
	if err := s.subs.Create(sub); err != nil {
		return "", err
	}

	return gw.CheckoutURL, nil
}

func (s *SubscriptionService) GetMySubscription(ctx context.Context, userID uuid.UUID) (*domain.Subscription, error) {
	sub, err := s.subs.FindActiveByUserID(userID)
	if err != nil {
		return nil, err
	}
	return sub, nil
}

func (s *SubscriptionService) Cancel(ctx context.Context, userID uuid.UUID) error {
	sub, err := s.subs.FindActiveByUserID(userID)
	if err != nil {
		return err
	}
	if err := s.gateway.CancelSubscription(sub.AbacatePaySubscriptionID); err != nil {
		return err
	}
	sub.Status = domain.SubscriptionStatusCancelled
	return s.subs.Update(sub)
}

// HandleWebhookEvent processa eventos do AbacatePay e sincroniza o status local.
func (s *SubscriptionService) HandleWebhookEvent(event string, abacatePaySubID string, newStatus string) error {
	sub, err := s.subs.FindByAbacatePayID(abacatePaySubID)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return nil // evento de assinatura desconhecida — ignorar
		}
		return err
	}

	switch event {
	case "subscription.completed":
		sub.Status = domain.SubscriptionStatusActive
	case "subscription.renewed":
		sub.Status = domain.SubscriptionStatusActive
	case "subscription.cancelled":
		sub.Status = domain.SubscriptionStatusCancelled
	default:
		return nil
	}

	return s.subs.Update(sub)
}
