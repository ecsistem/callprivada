package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/callprivada/fwlc-backend/internal/domain"
	"github.com/callprivada/fwlc-backend/internal/middlewares"
	"github.com/callprivada/fwlc-backend/internal/services"
)

type CallHandler struct {
	calls    *services.CallService
	tracking *services.TrackingService
	subs     *services.SubscriptionService
}

func NewCallHandler(calls *services.CallService, tracking *services.TrackingService, subs *services.SubscriptionService) *CallHandler {
	return &CallHandler{calls: calls, tracking: tracking, subs: subs}
}

// ---- DTOs ----

type callDTO struct {
	ID                 string  `json:"id"`
	Slug               string  `json:"slug"`
	Title              string  `json:"title"`
	DisplayName        string  `json:"display_name"`
	VideoID            string  `json:"video_id"`
	StartTimeSeconds   int     `json:"start_time_seconds"`
	EndTimeSeconds     int     `json:"end_time_seconds"`
	PlaybackRate       float64 `json:"playback_rate"`
	VideoZoom          float64 `json:"video_zoom"`
	VideoX             float64 `json:"video_x"`
	VideoY             float64 `json:"video_y"`
	EntryPriceCents    int     `json:"entry_price_cents"`
	LoopVideo          bool    `json:"loop_video"`
	CallMode           string  `json:"call_mode"`
	BillingMode        string  `json:"billing_mode"`
	EndCallRedirectURL string  `json:"end_call_redirect_url,omitempty"`
	ExpiresAt          *string `json:"expires_at"`
	Status             string  `json:"status"`
	CreatedAt          string  `json:"created_at"`
	ContactPhotoURL    string  `json:"contact_photo_url,omitempty"`
}

func toCallDTO(c *domain.Call) callDTO {
	mode := c.CallMode
	if mode == "" {
		mode = domain.CallModeIncoming
	}
	dto := callDTO{
		ID:                 c.ID.String(),
		Slug:               c.Slug,
		Title:              c.Title,
		DisplayName:        c.DisplayName,
		VideoID:            c.VideoID.String(),
		StartTimeSeconds:   c.StartTimeSeconds,
		EndTimeSeconds:     c.EndTimeSeconds,
		PlaybackRate:       c.PlaybackRate,
		VideoZoom:          c.VideoZoom,
		VideoX:             c.VideoX,
		VideoY:             c.VideoY,
		EntryPriceCents:    c.EntryPriceCents,
		LoopVideo:          c.LoopVideo,
		CallMode:           mode,
		BillingMode:        c.BillingMode,
		EndCallRedirectURL: c.EndCallRedirectURL,
		Status:             c.Status,
		CreatedAt:          c.CreatedAt.Format(time.RFC3339),
	}
	if c.ExpiresAt != nil {
		s := c.ExpiresAt.Format(time.RFC3339)
		dto.ExpiresAt = &s
	}
	return dto
}

type createCallRequest struct {
	VideoID            string `json:"video_id" binding:"required,uuid"`
	Title              string `json:"title" binding:"required,min=1,max=255"`
	DisplayName        string `json:"display_name" binding:"required,min=1,max=100"`
	StartTimeSeconds   int    `json:"start_time_seconds" binding:"min=0"`
	EndTimeSeconds     int    `json:"end_time_seconds" binding:"min=0"`
	EntryPriceCents    int    `json:"entry_price_cents" binding:"min=0"`
	LoopVideo          bool   `json:"loop_video"`
	CallMode           string `json:"call_mode" binding:"omitempty,oneof=incoming outgoing"`
	BillingMode        string `json:"billing_mode" binding:"omitempty,oneof=none credits"`
	EndCallRedirectURL string `json:"end_call_redirect_url"`
	ExpiresAt          string `json:"expires_at"`
}

type updateCallRequest struct {
	Title              string  `json:"title" binding:"omitempty,min=1,max=255"`
	DisplayName        string  `json:"display_name" binding:"omitempty,min=1,max=100"`
	VideoID            string  `json:"video_id" binding:"omitempty,uuid"`
	StartTimeSeconds   int     `json:"start_time_seconds" binding:"min=0"`
	EndTimeSeconds     int     `json:"end_time_seconds" binding:"min=0"`
	PlaybackRate       float64 `json:"playback_rate"`
	VideoZoom          float64 `json:"video_zoom"`
	VideoX             float64 `json:"video_x"`
	VideoY             float64 `json:"video_y"`
	EntryPriceCents    int     `json:"entry_price_cents" binding:"min=0"`
	LoopVideo          *bool   `json:"loop_video"`
	CallMode           string  `json:"call_mode" binding:"omitempty,oneof=incoming outgoing"`
	BillingMode        string  `json:"billing_mode" binding:"omitempty,oneof=none credits"`
	EndCallRedirectURL string  `json:"end_call_redirect_url"`
	ExpiresAt          string  `json:"expires_at"`
	Status             string  `json:"status" binding:"omitempty,oneof=active disabled"`
}

// ---- Handlers ----

func (h *CallHandler) Create(c *gin.Context) {
	uid := mustUserID(c)

	var req createCallRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "validation_error", "message": err.Error()}})
		return
	}

	videoID, _ := uuid.Parse(req.VideoID)
	mode := req.CallMode
	if mode == "" {
		mode = domain.CallModeIncoming
	}
	in := services.CreateCallInput{
		VideoID:            videoID,
		Title:              req.Title,
		DisplayName:        req.DisplayName,
		StartTimeSeconds:   req.StartTimeSeconds,
		EndTimeSeconds:     req.EndTimeSeconds,
		EntryPriceCents:    req.EntryPriceCents,
		LoopVideo:          req.LoopVideo,
		CallMode:           mode,
		BillingMode:        req.BillingMode,
		EndCallRedirectURL: req.EndCallRedirectURL,
		ExpiresAt:          parseTime(req.ExpiresAt),
	}

	if err := h.calls.CheckCreateLimit(c.Request.Context(), uid, h.subs); err != nil {
		respondError(c, err)
		return
	}

	call, err := h.calls.Create(c.Request.Context(), uid, in)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": toCallDTO(call)})
}

func (h *CallHandler) List(c *gin.Context) {
	uid := mustUserID(c)
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "20"))

	calls, total, err := h.calls.List(c.Request.Context(), uid, page, perPage)
	if err != nil {
		respondError(c, err)
		return
	}

	dtos := make([]callDTO, len(calls))
	for i, cl := range calls {
		dtos[i] = toCallDTO(&cl)
	}
	c.JSON(http.StatusOK, gin.H{"data": dtos, "total": total, "page": page, "per_page": perPage})
}

func (h *CallHandler) Get(c *gin.Context) {
	uid := mustUserID(c)
	callID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "bad_request", "message": "id inválido"}})
		return
	}

	call, err := h.calls.GetByID(c.Request.Context(), uid, callID)
	if err != nil {
		respondError(c, err)
		return
	}
	dto := toCallDTO(call)
	if call.ContactPhotoKey != "" {
		dto.ContactPhotoURL, _ = h.calls.PresignImageURL(c.Request.Context(), call.ContactPhotoKey)
	}
	c.JSON(http.StatusOK, gin.H{"data": dto})
}

func (h *CallHandler) Update(c *gin.Context) {
	uid := mustUserID(c)
	callID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "bad_request", "message": "id inválido"}})
		return
	}

	var req updateCallRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "validation_error", "message": err.Error()}})
		return
	}

	videoID, _ := uuid.Parse(req.VideoID)
	in := services.UpdateCallInput{
		Title:              req.Title,
		DisplayName:        req.DisplayName,
		VideoID:            videoID,
		StartTimeSeconds:   req.StartTimeSeconds,
		EndTimeSeconds:     req.EndTimeSeconds,
		PlaybackRate:       req.PlaybackRate,
		VideoZoom:          req.VideoZoom,
		VideoX:             req.VideoX,
		VideoY:             req.VideoY,
		EntryPriceCents:    req.EntryPriceCents,
		LoopVideo:          req.LoopVideo,
		CallMode:           req.CallMode,
		BillingMode:        req.BillingMode,
		EndCallRedirectURL: req.EndCallRedirectURL,
		ExpiresAt:          parseTime(req.ExpiresAt),
		Status:             req.Status,
	}

	call, err := h.calls.Update(c.Request.Context(), uid, callID, in)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": toCallDTO(call)})
}

func (h *CallHandler) Delete(c *gin.Context) {
	uid := mustUserID(c)
	callID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "bad_request", "message": "id inválido"}})
		return
	}

	if err := h.calls.Delete(c.Request.Context(), uid, callID); err != nil {
		respondError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// UploadImage — POST /calls/:id/photo ou /calls/:id/thumbnail
func (h *CallHandler) UploadImage(c *gin.Context) {
	uid := mustUserID(c)
	callID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "bad_request", "message": "id inválido"}})
		return
	}

	kind := c.Param("kind") // "photo" ou "thumbnail"
	if kind != "photo" && kind != "thumbnail" {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "bad_request", "message": "kind inválido"}})
		return
	}

	file, header, err := c.Request.FormFile("image")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "bad_request", "message": "campo 'image' obrigatório"}})
		return
	}
	defer file.Close()

	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, imageMaxBytes+1024)

	key, err := h.calls.UploadImage(c.Request.Context(), uid, kind, header.Filename, file)
	if err != nil {
		respondError(c, err)
		return
	}

	if kind == "photo" {
		if _, err := h.calls.SetContactPhoto(c.Request.Context(), uid, callID, key); err != nil {
			respondError(c, err)
			return
		}
	}

	url, _ := h.calls.PresignImageURL(c.Request.Context(), key)
	c.JSON(http.StatusOK, gin.H{"key": key, "url": url})
}

// GetPublic — sem autenticação, para a página /c/:slug
func (h *CallHandler) GetPublic(c *gin.Context) {
	slug := c.Param("slug")

	data, err := h.calls.GetPublic(c.Request.Context(), slug)
	if err != nil {
		respondError(c, err)
		return
	}

	var photoURL string
	if data.Call.ContactPhotoKey != "" {
		photoURL, _ = h.calls.PresignImageURL(c.Request.Context(), data.Call.ContactPhotoKey)
	}

	// Serializa eventos para o cliente.
	type publicEvent struct {
		ID                      string `json:"id"`
		TriggerAtSeconds        int    `json:"trigger_at_seconds"`
		DurationSeconds         int    `json:"duration_seconds"`
		Type                    string `json:"type"`
		Title                   string `json:"title"`
		Description             string `json:"description"`
		ButtonText              string `json:"button_text,omitempty"`
		ButtonColor             string `json:"button_color,omitempty"`
		OfferCallSlug           string `json:"offer_call_slug,omitempty"`
		UpsellSlug              string `json:"upsell_slug,omitempty"`
		BillingAmountCents      int    `json:"billing_amount_cents"`
		BillingCollectPayerInfo bool   `json:"billing_collect_payer_info,omitempty"`
		BillingPayerName        string `json:"billing_payer_name,omitempty"`
		BillingPayerDocument    string `json:"billing_payer_document,omitempty"`
		BillingPayerEmail       string `json:"billing_payer_email,omitempty"`
		BillingPayerPhone       string `json:"billing_payer_phone,omitempty"`
		ExtraTexts              map[string]string `json:"extra_texts,omitempty"`
	}
	evts := make([]publicEvent, len(data.Events))
	for i, e := range data.Events {
		evts[i] = publicEvent{
			ID:                      e.ID.String(),
			TriggerAtSeconds:        e.TriggerAtSeconds,
			DurationSeconds:         e.DurationSeconds,
			Type:                    e.Type,
			Title:                   e.Title,
			Description:             e.Description,
			ButtonText:              e.ButtonText,
			ButtonColor:             e.ButtonColor,
			OfferCallSlug:           e.OfferCallSlug,
			UpsellSlug:              e.UpsellSlug,
			BillingAmountCents:      e.BillingAmountCents,
			BillingCollectPayerInfo: e.BillingCollectPayerInfo,
			BillingPayerName:        e.BillingPayerName,
			BillingPayerDocument:    e.BillingPayerDocument,
			BillingPayerEmail:       e.BillingPayerEmail,
			BillingPayerPhone:       e.BillingPayerPhone,
			ExtraTexts:              e.ExtraTexts,
		}
	}

	tracking, _ := h.tracking.Get(c.Request.Context(), data.Call.UserID)
	var trackingMap gin.H
	if tracking != nil {
		trackingMap = gin.H{
			"facebook_pixel_id":   tracking.FacebookPixelID,
			"tiktok_pixel_id":     tracking.TikTokPixelID,
			"google_analytics_id": tracking.GoogleAnalyticsID,
			"gtm_container_id":    tracking.GTMContainerID,
			"utmify_token":        tracking.UTMifyToken,
			"custom_head_script":  tracking.CustomHeadScript,
		}
	}

	playbackRate := data.Call.PlaybackRate
	if playbackRate <= 0 {
		playbackRate = 1.0
	}
	videoZoom := data.Call.VideoZoom
	if videoZoom <= 0 {
		videoZoom = 1.0
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"slug":                  data.Call.Slug,
			"display_name":          data.Call.DisplayName,
			"contact_photo_url":     photoURL,
			"video_url":             data.VideoURL,
			"start_time_seconds":    data.Call.StartTimeSeconds,
			"end_time_seconds":      data.Call.EndTimeSeconds,
			"playback_rate":         playbackRate,
			"video_zoom":            videoZoom,
			"video_x":               data.Call.VideoX,
			"video_y":               data.Call.VideoY,
			"entry_price_cents":     data.Call.EntryPriceCents,
			"loop_video":            data.Call.LoopVideo,
			"call_mode":             data.Call.CallMode,
			"billing_mode":          data.Call.BillingMode,
			"end_call_redirect_url": data.Call.EndCallRedirectURL,
			"currency":              data.Currency,
			"active_gateway":        data.ActiveGateway,
			"events":                evts,
			"tracking":              trackingMap,
		},
	})
}

// ---- helpers ----

const imageMaxBytes = 10 * 1024 * 1024

func mustUserID(c *gin.Context) uuid.UUID {
	v, _ := c.Get(middlewares.ContextUserIDKey)
	uid, _ := v.(uuid.UUID)
	return uid
}

func parseTime(s string) *time.Time {
	if s == "" {
		return nil
	}
	t, err := time.Parse(time.RFC3339, s)
	if err != nil {
		return nil
	}
	return &t
}
