package services

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/google/uuid"

	"github.com/callprivada/fwlc-backend/internal/domain"
	"github.com/callprivada/fwlc-backend/internal/storage"
	"github.com/callprivada/fwlc-backend/internal/utils"
)

var allowedImageMIMEs = map[string]bool{
	"image/jpeg": true,
	"image/png":  true,
	"image/webp": true,
}

const imageMaxBytes = 10 * 1024 * 1024 // 10 MB

type CreateCallInput struct {
	VideoID              uuid.UUID
	Title                string
	DisplayName          string
	StartTimeSeconds     int
	EndTimeSeconds       int
	PlaybackRate         float64
	VideoZoom            float64
	VideoX               float64
	VideoY               float64
	EntryPriceCents      int
	LoopVideo            bool
	CallMode             string
	BillingMode          string
	EndCallRedirectURL   string
	ExpiresAt            *time.Time
}

type UpdateCallInput struct {
	Title                string
	DisplayName          string
	VideoID              uuid.UUID
	StartTimeSeconds     int
	EndTimeSeconds       int
	PlaybackRate         float64
	VideoZoom            float64
	VideoX               float64
	VideoY               float64
	EntryPriceCents      int
	LoopVideo            *bool
	CallMode             string
	BillingMode          string
	EndCallRedirectURL   string
	ExpiresAt            *time.Time
	Status               string
}

type CallService struct {
	calls   domain.CallRepository
	videos  domain.VideoRepository
	events  domain.CallEventRepository
	storage storage.FileStorage
}

func NewCallService(calls domain.CallRepository, videos domain.VideoRepository, events domain.CallEventRepository, store storage.FileStorage) *CallService {
	return &CallService{calls: calls, videos: videos, events: events, storage: store}
}

func (s *CallService) Create(ctx context.Context, userID uuid.UUID, in CreateCallInput) (*domain.Call, error) {
	// Valida que o vídeo existe, pertence ao usuário e está pronto.
	video, err := s.videos.FindByID(ctx, in.VideoID)
	if err != nil {
		return nil, err
	}
	if video.UserID != userID {
		return nil, domain.ErrNotFound
	}
	if video.Status != domain.VideoStatusReady {
		return nil, domain.ErrVideoNotReady
	}

	slug, err := s.uniqueSlug(ctx)
	if err != nil {
		return nil, err
	}

	call := &domain.Call{
		UserID:           userID,
		VideoID:          in.VideoID,
		Slug:             slug,
		Title:            in.Title,
		DisplayName:      in.DisplayName,
		StartTimeSeconds: in.StartTimeSeconds,
		EndTimeSeconds:   in.EndTimeSeconds,
		PlaybackRate:     in.PlaybackRate,
		VideoZoom:        in.VideoZoom,
		VideoX:           in.VideoX,
		VideoY:           in.VideoY,
		EntryPriceCents:  in.EntryPriceCents,
		LoopVideo:          in.LoopVideo,
		CallMode:           in.CallMode,
		BillingMode:        in.BillingMode,
		EndCallRedirectURL: in.EndCallRedirectURL,
		ExpiresAt:            in.ExpiresAt,
		Status:               domain.CallStatusActive,
	}
	if err := s.calls.Create(ctx, call); err != nil {
		return nil, err
	}
	return call, nil
}

func (s *CallService) Update(ctx context.Context, userID, callID uuid.UUID, in UpdateCallInput) (*domain.Call, error) {
	call, err := s.ownerCall(ctx, userID, callID)
	if err != nil {
		return nil, err
	}

	if in.Title != "" {
		call.Title = in.Title
	}
	if in.DisplayName != "" {
		call.DisplayName = in.DisplayName
	}
	if in.VideoID != uuid.Nil {
		video, err := s.videos.FindByID(ctx, in.VideoID)
		if err != nil {
			return nil, err
		}
		if video.UserID != userID {
			return nil, domain.ErrForbidden
		}
		call.VideoID = in.VideoID
	}
	if in.StartTimeSeconds >= 0 {
		call.StartTimeSeconds = in.StartTimeSeconds
	}
	if in.EndTimeSeconds >= 0 {
		call.EndTimeSeconds = in.EndTimeSeconds
	}
	if in.PlaybackRate > 0 {
		call.PlaybackRate = in.PlaybackRate
	}
	if in.VideoZoom > 0 {
		call.VideoZoom = in.VideoZoom
	}
	call.VideoX = in.VideoX
	call.VideoY = in.VideoY
	if in.EntryPriceCents >= 0 {
		call.EntryPriceCents = in.EntryPriceCents
	}
	if in.LoopVideo != nil {
		call.LoopVideo = *in.LoopVideo
	}
	if in.CallMode != "" {
		call.CallMode = in.CallMode
	}
	call.BillingMode = in.BillingMode
	call.EndCallRedirectURL = in.EndCallRedirectURL
	call.ExpiresAt = in.ExpiresAt
	if in.Status != "" {
		call.Status = in.Status
	}

	if err := s.calls.Update(ctx, call); err != nil {
		return nil, err
	}
	return call, nil
}

func (s *CallService) Delete(ctx context.Context, userID, callID uuid.UUID) error {
	if _, err := s.ownerCall(ctx, userID, callID); err != nil {
		return err
	}
	return s.calls.Delete(ctx, callID)
}

func (s *CallService) GetByID(ctx context.Context, userID, callID uuid.UUID) (*domain.Call, error) {
	return s.ownerCall(ctx, userID, callID)
}

func (s *CallService) List(ctx context.Context, userID uuid.UUID, page, perPage int) ([]domain.Call, int64, error) {
	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 20
	}
	return s.calls.FindByUserID(ctx, userID, page, perPage)
}

type PublicCallData struct {
	Call     *domain.Call
	VideoURL string
	Events   []domain.CallEvent
}

// CheckCreateLimit verifica se o usuário atingiu o limite de chamadas do plano.
// Retorna nil se não há limite (max_calls == 0) ou se ainda há slots.
func (s *CallService) CheckCreateLimit(ctx context.Context, userID uuid.UUID, subSvc *SubscriptionService) error {
	if subSvc == nil {
		return nil
	}
	sub, err := subSvc.GetMySubscription(ctx, userID)
	if err != nil || sub == nil {
		return nil // sem assinatura → deixa o RequireSubscription middleware barrar
	}
	plan, err := subSvc.GetPlan(ctx, sub.PlanID)
	if err != nil || plan == nil || plan.MaxCalls == 0 {
		return nil // sem limite configurado
	}
	count, err := s.calls.CountByUserID(ctx, userID)
	if err != nil {
		return nil
	}
	if count >= int64(plan.MaxCalls) {
		return domain.ErrPlanLimitReached
	}
	return nil
}

// GetPublic retorna a chamada para a página pública, com URL de vídeo pré-assinada e eventos.
func (s *CallService) GetPublic(ctx context.Context, slug string) (*PublicCallData, error) {
	call, err := s.calls.FindBySlug(ctx, slug)
	if err != nil {
		return nil, err
	}
	if !call.IsPubliclyAccessible() {
		return nil, domain.ErrCallExpired
	}

	var storageKey string
	v, _ := s.videos.FindByID(ctx, call.VideoID)
	if v != nil {
		storageKey = v.StorageKey
	}

	videoURL := s.storage.PublicURL(storageKey)

	events, err := s.events.FindByCallID(ctx, call.ID)
	if err != nil {
		events = []domain.CallEvent{}
	}

	return &PublicCallData{Call: call, VideoURL: videoURL, Events: events}, nil
}

// UploadImage faz upload de imagem (foto de contato ou thumbnail) e retorna a storage key.
func (s *CallService) UploadImage(ctx context.Context, userID uuid.UUID, kind, filename string, body io.Reader) (string, error) {
	sniff := make([]byte, 512)
	n, err := io.ReadFull(body, sniff)
	if err != nil && err != io.ErrUnexpectedEOF {
		return "", fmt.Errorf("cannot read file: %w", err)
	}
	mime := http.DetectContentType(sniff[:n])
	if !allowedImageMIMEs[mime] {
		return "", domain.ErrUnsupportedMIME
	}

	key := fmt.Sprintf("images/%s/%s/%s", userID, kind, uuid.New().String())
	combined := io.MultiReader(newBytesReader(sniff[:n]), body)
	if err := s.storage.Upload(ctx, key, combined, mime); err != nil {
		return "", fmt.Errorf("s3 upload failed: %w", err)
	}
	return key, nil
}

// SetContactPhoto associa uma foto de contato a uma chamada (após upload via UploadImage).
func (s *CallService) SetContactPhoto(ctx context.Context, userID, callID uuid.UUID, key string) (*domain.Call, error) {
	call, err := s.ownerCall(ctx, userID, callID)
	if err != nil {
		return nil, err
	}
	call.ContactPhotoKey = key
	if err := s.calls.Update(ctx, call); err != nil {
		return nil, err
	}
	return call, nil
}

// PresignImageURL retorna URL permanente para uma imagem da chamada.
func (s *CallService) PresignImageURL(ctx context.Context, key string) (string, error) {
	return s.storage.PublicURL(key), nil
}

func (s *CallService) ownerCall(ctx context.Context, userID, callID uuid.UUID) (*domain.Call, error) {
	call, err := s.calls.FindByID(ctx, callID)
	if err != nil {
		return nil, err
	}
	if call.UserID != userID {
		return nil, domain.ErrNotFound
	}
	return call, nil
}

func (s *CallService) uniqueSlug(ctx context.Context) (string, error) {
	for i := 0; i < 10; i++ {
		slug, err := utils.NewSlug(6)
		if err != nil {
			return "", err
		}
		exists, err := s.calls.SlugExists(ctx, slug)
		if err != nil {
			return "", err
		}
		if !exists {
			return slug, nil
		}
	}
	return "", fmt.Errorf("failed to generate unique slug after retries")
}
