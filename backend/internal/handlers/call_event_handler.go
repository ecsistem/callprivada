package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/callprivada/fwlc-backend/internal/domain"
	"github.com/callprivada/fwlc-backend/internal/services"
)

type CallEventHandler struct {
	events *services.CallEventService
}

func NewCallEventHandler(events *services.CallEventService) *CallEventHandler {
	return &CallEventHandler{events: events}
}

type eventDTO struct {
	ID                      string `json:"id"`
	CallID                  string `json:"call_id"`
	TriggerAtSeconds        int    `json:"trigger_at_seconds"`
	DurationSeconds         int    `json:"duration_seconds"`
	Type                    string `json:"type"`
	Title                   string `json:"title"`
	Description             string `json:"description"`
	ImageKey                string `json:"image_key,omitempty"`
	ButtonText              string `json:"button_text,omitempty"`
	ButtonColor             string `json:"button_color,omitempty"`
	OfferCallSlug           string `json:"offer_call_slug,omitempty"`
	UpsellSlug              string `json:"upsell_slug,omitempty"`
	BillingAmountCents      int    `json:"billing_amount_cents"`
	BillingCollectPayerInfo bool   `json:"billing_collect_payer_info"`
	BillingPayerName        string `json:"billing_payer_name,omitempty"`
	BillingPayerDocument    string `json:"billing_payer_document,omitempty"`
	BillingPayerEmail       string `json:"billing_payer_email,omitempty"`
	BillingPayerPhone       string `json:"billing_payer_phone,omitempty"`
	CreatedAt               string `json:"created_at"`
}

func toEventDTO(e *domain.CallEvent) eventDTO {
	return eventDTO{
		ID:                      e.ID.String(),
		CallID:                  e.CallID.String(),
		TriggerAtSeconds:        e.TriggerAtSeconds,
		DurationSeconds:         e.DurationSeconds,
		Type:                    e.Type,
		Title:                   e.Title,
		Description:             e.Description,
		ImageKey:                e.ImageKey,
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
		CreatedAt:               e.CreatedAt.Format(time.RFC3339),
	}
}

type upsertEventRequest struct {
	TriggerAtSeconds        int    `json:"trigger_at_seconds" binding:"min=0"`
	DurationSeconds         int    `json:"duration_seconds" binding:"min=0"`
	Type                    string `json:"type" binding:"required,oneof=popup fullscreen fake_billing offer_call countdown upsell reconnect_paywall signal_drop fake_typing screenshot_alert battery_low incoming_call fake_gift viewer_count social_proof exclusive_access tip_jar video_lock phone_block age_gate"`
	Title                   string `json:"title" binding:"required,min=1,max=255"`
	Description             string `json:"description"`
	ButtonText              string `json:"button_text" binding:"max=100"`
	ButtonColor             string `json:"button_color" binding:"max=7"`
	OfferCallSlug           string `json:"offer_call_slug" binding:"max=255"`
	UpsellSlug              string `json:"upsell_slug" binding:"max=20"`
	BillingAmountCents      int    `json:"billing_amount_cents" binding:"min=0"`
	BillingCollectPayerInfo bool   `json:"billing_collect_payer_info"`
	BillingPayerName        string `json:"billing_payer_name"`
	BillingPayerDocument    string `json:"billing_payer_document"`
	BillingPayerEmail       string `json:"billing_payer_email"`
	BillingPayerPhone       string `json:"billing_payer_phone"`
}

func (h *CallEventHandler) Create(c *gin.Context) {
	uid := mustUserID(c)
	callID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "bad_request", "message": "callId inválido"}})
		return
	}

	var req upsertEventRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "validation_error", "message": err.Error()}})
		return
	}

	event, err := h.events.Create(c.Request.Context(), uid, callID, services.CreateEventInput{
		TriggerAtSeconds:        req.TriggerAtSeconds,
		DurationSeconds:         req.DurationSeconds,
		Type:                    req.Type,
		Title:                   req.Title,
		Description:             req.Description,
		ButtonText:              req.ButtonText,
		ButtonColor:             req.ButtonColor,
		OfferCallSlug:           req.OfferCallSlug,
		UpsellSlug:              req.UpsellSlug,
		BillingAmountCents:      req.BillingAmountCents,
		BillingCollectPayerInfo: req.BillingCollectPayerInfo,
		BillingPayerName:        req.BillingPayerName,
		BillingPayerDocument:    req.BillingPayerDocument,
		BillingPayerEmail:       req.BillingPayerEmail,
		BillingPayerPhone:       req.BillingPayerPhone,
	})
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": toEventDTO(event)})
}

func (h *CallEventHandler) List(c *gin.Context) {
	uid := mustUserID(c)
	callID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "bad_request", "message": "callId inválido"}})
		return
	}

	evts, err := h.events.List(c.Request.Context(), uid, callID)
	if err != nil {
		respondError(c, err)
		return
	}

	dtos := make([]eventDTO, len(evts))
	for i, e := range evts {
		dtos[i] = toEventDTO(&e)
	}
	c.JSON(http.StatusOK, gin.H{"data": dtos})
}

func (h *CallEventHandler) Update(c *gin.Context) {
	uid := mustUserID(c)
	eventID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "bad_request", "message": "id inválido"}})
		return
	}

	var req upsertEventRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "validation_error", "message": err.Error()}})
		return
	}

	event, err := h.events.Update(c.Request.Context(), uid, eventID, services.CreateEventInput{
		TriggerAtSeconds:        req.TriggerAtSeconds,
		DurationSeconds:         req.DurationSeconds,
		Type:                    req.Type,
		Title:                   req.Title,
		Description:             req.Description,
		ButtonText:              req.ButtonText,
		ButtonColor:             req.ButtonColor,
		OfferCallSlug:           req.OfferCallSlug,
		UpsellSlug:              req.UpsellSlug,
		BillingAmountCents:      req.BillingAmountCents,
		BillingCollectPayerInfo: req.BillingCollectPayerInfo,
		BillingPayerName:        req.BillingPayerName,
		BillingPayerDocument:    req.BillingPayerDocument,
		BillingPayerEmail:       req.BillingPayerEmail,
		BillingPayerPhone:       req.BillingPayerPhone,
	})
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": toEventDTO(event)})
}

func (h *CallEventHandler) Delete(c *gin.Context) {
	uid := mustUserID(c)
	eventID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "bad_request", "message": "id inválido"}})
		return
	}

	if err := h.events.Delete(c.Request.Context(), uid, eventID); err != nil {
		respondError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}
