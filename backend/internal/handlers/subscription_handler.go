package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/callprivada/fwlc-backend/internal/middlewares"
	"github.com/callprivada/fwlc-backend/internal/services"
)

type SubscriptionHandler struct {
	subs *services.SubscriptionService
}

func NewSubscriptionHandler(subs *services.SubscriptionService) *SubscriptionHandler {
	return &SubscriptionHandler{subs: subs}
}

func (h *SubscriptionHandler) ListPlans(c *gin.Context) {
	plans, err := h.subs.ListPlans(c.Request.Context())
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": plans})
}

type checkoutRequest struct {
	PlanID string `json:"plan_id" binding:"required,uuid"`
}

func (h *SubscriptionHandler) Checkout(c *gin.Context) {
	id, ok := c.Get(middlewares.ContextUserIDKey)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": gin.H{"code": "unauthorized", "message": "missing user context"}})
		return
	}
	userID := id.(uuid.UUID)

	var req checkoutRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "validation_error", "message": err.Error()}})
		return
	}

	planID, err := uuid.Parse(req.PlanID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "validation_error", "message": "plan_id inválido"}})
		return
	}

	checkoutURL, err := h.subs.Checkout(c.Request.Context(), userID, planID)
	if err != nil {
		respondError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"checkout_url": checkoutURL})
}

func (h *SubscriptionHandler) GetMy(c *gin.Context) {
	id, ok := c.Get(middlewares.ContextUserIDKey)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": gin.H{"code": "unauthorized", "message": "missing user context"}})
		return
	}
	userID := id.(uuid.UUID)

	sub, err := h.subs.GetMySubscription(c.Request.Context(), userID)
	if err != nil {
		respondError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": sub})
}

// ListAllPlans — GET /admin/plans — retorna todos os planos (incluindo inativos)
func (h *SubscriptionHandler) ListAllPlans(c *gin.Context) {
	plans, err := h.subs.ListAllPlans(c.Request.Context())
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": plans})
}

// CreatePlan — POST /admin/plans
func (h *SubscriptionHandler) CreatePlan(c *gin.Context) {
	var req struct {
		Name                string `json:"name"         binding:"required"`
		PriceCents          int    `json:"price_cents"  binding:"required"`
		Interval            string `json:"interval"     binding:"required"`
		AbacatePayProductID string `json:"abacate_pay_product_id"`
		MaxCalls            int    `json:"max_calls"`
		MaxPresells         int    `json:"max_presells"`
		MaxVideos           int    `json:"max_videos"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "validation_error", "message": err.Error()}})
		return
	}
	plan, err := h.subs.CreatePlan(c.Request.Context(), services.CreatePlanInput{
		Name: req.Name, PriceCents: req.PriceCents, Interval: req.Interval,
		AbacatePayProductID: req.AbacatePayProductID,
		MaxCalls: req.MaxCalls, MaxPresells: req.MaxPresells, MaxVideos: req.MaxVideos,
	})
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": plan})
}

// UpdatePlan — PUT /admin/plans/:id
func (h *SubscriptionHandler) UpdatePlan(c *gin.Context) {
	planID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "bad_request", "message": "id inválido"}})
		return
	}
	var req struct {
		Name                string `json:"name"         binding:"required"`
		PriceCents          int    `json:"price_cents"  binding:"required"`
		Interval            string `json:"interval"     binding:"required"`
		AbacatePayProductID string `json:"abacate_pay_product_id"`
		Active              bool   `json:"active"`
		MaxCalls            int    `json:"max_calls"`
		MaxPresells         int    `json:"max_presells"`
		MaxVideos           int    `json:"max_videos"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "validation_error", "message": err.Error()}})
		return
	}
	plan, err := h.subs.UpdatePlan(c.Request.Context(), planID, services.UpdatePlanInput{
		Name: req.Name, PriceCents: req.PriceCents, Interval: req.Interval,
		AbacatePayProductID: req.AbacatePayProductID, Active: req.Active,
		MaxCalls: req.MaxCalls, MaxPresells: req.MaxPresells, MaxVideos: req.MaxVideos,
	})
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": plan})
}

// UpdatePlanLimits — PUT /admin/plans/:id/limits (admin only)
func (h *SubscriptionHandler) UpdatePlanLimits(c *gin.Context) {
	planID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "bad_request", "message": "id inválido"}})
		return
	}

	var req struct {
		MaxCalls    int `json:"max_calls"`
		MaxPresells int `json:"max_presells"`
		MaxVideos   int `json:"max_videos"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "validation_error", "message": err.Error()}})
		return
	}

	plan, err := h.subs.UpdatePlanLimits(c.Request.Context(), planID, services.UpdatePlanLimitsInput{
		MaxCalls:    req.MaxCalls,
		MaxPresells: req.MaxPresells,
		MaxVideos:   req.MaxVideos,
	})
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": plan})
}

func (h *SubscriptionHandler) Cancel(c *gin.Context) {
	id, ok := c.Get(middlewares.ContextUserIDKey)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": gin.H{"code": "unauthorized", "message": "missing user context"}})
		return
	}
	userID := id.(uuid.UUID)

	if err := h.subs.Cancel(c.Request.Context(), userID); err != nil {
		respondError(c, err)
		return
	}

	c.Status(http.StatusNoContent)
}
