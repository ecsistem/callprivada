package services

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"github.com/callprivada/fwlc-backend/internal/domain"
)

var validEventTypes = map[string]bool{
	domain.EventTypePopup:           true,
	domain.EventTypeFullscreen:      true,
	domain.EventTypeFakeBilling:     true,
	domain.EventTypeOfferCall:       true,
	domain.EventTypeCountdown:       true,
	domain.EventTypeUpsell:          true,
	domain.EventTypeReconnectPaywall: true,
	domain.EventTypeSignalDrop:      true,
	domain.EventTypeFakeTyping:      true,
	domain.EventTypeScreenshotAlert: true,
	domain.EventTypeBatteryLow:      true,
	domain.EventTypeIncomingCall:    true,
	domain.EventTypeFakeGift:        true,
	domain.EventTypeViewerCount:     true,
	domain.EventTypeSocialProof:     true,
	domain.EventTypeExclusiveAccess: true,
	domain.EventTypeTipJar:          true,
	domain.EventTypeVideoLock:       true,
	domain.EventTypePhoneBlock:      true,
}

type CreateEventInput struct {
	TriggerAtSeconds     int
	DurationSeconds      int
	Type                 string
	Title                string
	Description          string
	ButtonText           string
	ButtonColor          string
	OfferCallSlug        string
	UpsellSlug           string
	BillingAmountCents      int
	BillingCollectPayerInfo bool
	BillingPayerName        string
	BillingPayerDocument    string
	BillingPayerEmail       string
	BillingPayerPhone       string
	ExtraTexts              map[string]string
}

type CallEventService struct {
	events domain.CallEventRepository
	calls  domain.CallRepository
}

func NewCallEventService(events domain.CallEventRepository, calls domain.CallRepository) *CallEventService {
	return &CallEventService{events: events, calls: calls}
}

func (s *CallEventService) Create(ctx context.Context, userID, callID uuid.UUID, in CreateEventInput) (*domain.CallEvent, error) {
	if err := s.assertOwner(ctx, userID, callID); err != nil {
		return nil, err
	}
	if !validEventTypes[in.Type] {
		return nil, fmt.Errorf("tipo de evento inválido: %s", in.Type)
	}

	event := &domain.CallEvent{
		CallID:               callID,
		TriggerAtSeconds:     in.TriggerAtSeconds,
		DurationSeconds:      in.DurationSeconds,
		Type:                 in.Type,
		Title:                in.Title,
		Description:          in.Description,
		ButtonText:           in.ButtonText,
		ButtonColor:          in.ButtonColor,
		OfferCallSlug:        in.OfferCallSlug,
		UpsellSlug:           in.UpsellSlug,
		BillingAmountCents:      in.BillingAmountCents,
		BillingCollectPayerInfo: in.BillingCollectPayerInfo,
		BillingPayerName:        in.BillingPayerName,
		BillingPayerDocument:    in.BillingPayerDocument,
		BillingPayerEmail:       in.BillingPayerEmail,
		BillingPayerPhone:       in.BillingPayerPhone,
		ExtraTexts:              in.ExtraTexts,
	}
	if err := s.events.Create(ctx, event); err != nil {
		return nil, err
	}
	return event, nil
}

func (s *CallEventService) List(ctx context.Context, userID, callID uuid.UUID) ([]domain.CallEvent, error) {
	if err := s.assertOwner(ctx, userID, callID); err != nil {
		return nil, err
	}
	return s.events.FindByCallID(ctx, callID)
}

// ListPublic retorna eventos de uma chamada sem verificação de dono (para a página pública).
func (s *CallEventService) ListPublic(ctx context.Context, callID uuid.UUID) ([]domain.CallEvent, error) {
	return s.events.FindByCallID(ctx, callID)
}

func (s *CallEventService) Update(ctx context.Context, userID, eventID uuid.UUID, in CreateEventInput) (*domain.CallEvent, error) {
	event, err := s.events.FindByID(ctx, eventID)
	if err != nil {
		return nil, err
	}
	if err := s.assertOwner(ctx, userID, event.CallID); err != nil {
		return nil, err
	}
	if in.Type != "" && !validEventTypes[in.Type] {
		return nil, fmt.Errorf("tipo de evento inválido: %s", in.Type)
	}

	if in.Type != "" {
		event.Type = in.Type
	}
	if in.Title != "" {
		event.Title = in.Title
	}
	event.Description = in.Description
	if in.TriggerAtSeconds >= 0 {
		event.TriggerAtSeconds = in.TriggerAtSeconds
	}
	if in.ButtonText != "" {
		event.ButtonText = in.ButtonText
	}
	if in.ButtonColor != "" {
		event.ButtonColor = in.ButtonColor
	}
	event.DurationSeconds = in.DurationSeconds
	event.OfferCallSlug = in.OfferCallSlug
	event.UpsellSlug = in.UpsellSlug
	event.BillingAmountCents = in.BillingAmountCents
	event.BillingCollectPayerInfo = in.BillingCollectPayerInfo
	event.BillingPayerName = in.BillingPayerName
	event.BillingPayerDocument = in.BillingPayerDocument
	event.BillingPayerEmail = in.BillingPayerEmail
	event.BillingPayerPhone = in.BillingPayerPhone
	event.ExtraTexts = in.ExtraTexts

	if err := s.events.Update(ctx, event); err != nil {
		return nil, err
	}
	return event, nil
}

func (s *CallEventService) Delete(ctx context.Context, userID, eventID uuid.UUID) error {
	event, err := s.events.FindByID(ctx, eventID)
	if err != nil {
		return err
	}
	if err := s.assertOwner(ctx, userID, event.CallID); err != nil {
		return err
	}
	return s.events.Delete(ctx, eventID)
}

func (s *CallEventService) assertOwner(ctx context.Context, userID, callID uuid.UUID) error {
	call, err := s.calls.FindByID(ctx, callID)
	if err != nil {
		return err
	}
	if call.UserID != userID {
		return domain.ErrNotFound
	}
	return nil
}
