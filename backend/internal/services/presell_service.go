package services

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/base64"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/callprivada/fwlc-backend/internal/domain"
	"github.com/callprivada/fwlc-backend/internal/storage"
)

type CreatePresellInput struct {
	CallID       *uuid.UUID
	Type         string
	TemplateSlug string
	Config       domain.PresellConfig
}

type UpdatePresellInput struct {
	CallID       *uuid.UUID
	Type         string
	TemplateSlug string
	Config       domain.PresellConfig
}

type PresellService struct {
	presells domain.PresellPageRepository
	storage  storage.FileStorage
}

func NewPresellService(presells domain.PresellPageRepository, store storage.FileStorage) *PresellService {
	return &PresellService{presells: presells, storage: store}
}

// UploadImage stores a presell image and returns (key, presignedURL).
func (s *PresellService) UploadImage(ctx context.Context, userID uuid.UUID, r io.Reader) (string, string, error) {
	sniff := make([]byte, 512)
	n, err := io.ReadFull(r, sniff)
	if err != nil && err != io.ErrUnexpectedEOF {
		return "", "", err
	}
	mimeType := http.DetectContentType(sniff[:n])
	if !allowedImageMIMEs[mimeType] {
		return "", "", domain.ErrUnsupportedMIME
	}

	key := "images/" + userID.String() + "/presell/" + uuid.New().String()
	combined := io.MultiReader(newBytesReaderPresell(sniff[:n]), r)
	if err := s.storage.Upload(ctx, key, combined, mimeType); err != nil {
		return "", "", err
	}

	url, _ := s.storage.PresignGet(ctx, key, 4*time.Hour)
	return key, url, nil
}

// PresignImageURL returns a presigned URL for an existing storage key.
func (s *PresellService) PresignImageURL(ctx context.Context, key string) (string, error) {
	return s.storage.PresignGet(ctx, key, 4*time.Hour)
}

func (s *PresellService) Create(ctx context.Context, userID uuid.UUID, in CreatePresellInput) (*domain.PresellPage, error) {
	slug, err := s.generateSlug(ctx)
	if err != nil {
		return nil, err
	}

	templateSlug := in.TemplateSlug
	if templateSlug == "" {
		templateSlug = "formal"
	}

	pageType := in.Type
	if pageType == "" {
		pageType = domain.PresellTypePresell
	}

	p := &domain.PresellPage{
		UserID:       userID,
		CallID:       in.CallID,
		Slug:         slug,
		Type:         pageType,
		TemplateSlug: templateSlug,
		Config:       in.Config,
	}

	if err := s.presells.Create(ctx, p); err != nil {
		return nil, err
	}
	return p, nil
}

// CheckCreateLimit verifica se o usuário atingiu o limite de presells do plano.
func (s *PresellService) CheckCreateLimit(ctx context.Context, userID uuid.UUID, subSvc *SubscriptionService) error {
	if subSvc == nil {
		return nil
	}
	sub, err := subSvc.GetMySubscription(ctx, userID)
	if err != nil || sub == nil {
		return nil
	}
	plan, err := subSvc.GetPlan(ctx, sub.PlanID)
	if err != nil || plan == nil || plan.MaxPresells == 0 {
		return nil
	}
	count, err := s.presells.CountByUserID(ctx, userID)
	if err != nil {
		return nil
	}
	if count >= int64(plan.MaxPresells) {
		return domain.ErrPlanLimitReached
	}
	return nil
}

// GetByCallID retorna todos os presells vinculados a uma chamada.
func (s *PresellService) GetByCallID(ctx context.Context, callID uuid.UUID) ([]domain.PresellPage, error) {
	return s.presells.FindByCallID(ctx, callID)
}

// TrackCTAClick incrementa o contador de cliques no CTA.
func (s *PresellService) TrackCTAClick(ctx context.Context, slug string) error {
	return s.presells.IncrementCTAClicks(ctx, slug)
}

func (s *PresellService) List(ctx context.Context, userID uuid.UUID, typeFilter string, page, perPage int) ([]domain.PresellPage, int64, error) {
	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 20
	}
	return s.presells.FindByUserID(ctx, userID, typeFilter, page, perPage)
}

func (s *PresellService) GetByID(ctx context.Context, userID, id uuid.UUID) (*domain.PresellPage, error) {
	return s.presells.FindByID(ctx, id, userID)
}

func (s *PresellService) GetPublic(ctx context.Context, slug string) (*domain.PresellPage, error) {
	return s.presells.FindBySlug(ctx, slug)
}

func (s *PresellService) Update(ctx context.Context, userID, id uuid.UUID, in UpdatePresellInput) (*domain.PresellPage, error) {
	p, err := s.presells.FindByID(ctx, id, userID)
	if err != nil {
		return nil, err
	}

	p.CallID = in.CallID
	if in.Type != "" {
		p.Type = in.Type
	}
	if in.TemplateSlug != "" {
		p.TemplateSlug = in.TemplateSlug
	}
	p.Config = in.Config

	if err := s.presells.Update(ctx, p); err != nil {
		return nil, err
	}
	return p, nil
}

func (s *PresellService) Delete(ctx context.Context, userID, id uuid.UUID) error {
	return s.presells.Delete(ctx, id, userID)
}

func newBytesReaderPresell(b []byte) io.Reader { return bytes.NewReader(b) }

func (s *PresellService) generateSlug(ctx context.Context) (string, error) {
	for range 10 {
		b := make([]byte, 6)
		if _, err := rand.Read(b); err != nil {
			return "", err
		}
		slug := strings.TrimRight(base64.URLEncoding.EncodeToString(b), "=")
		slug = slug[:8]
		exists, err := s.presells.SlugExists(ctx, slug)
		if err != nil {
			return "", err
		}
		if !exists {
			return slug, nil
		}
	}
	return "", domain.ErrNotFound
}
