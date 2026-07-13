package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/callprivada/fwlc-backend/internal/domain"
	"github.com/callprivada/fwlc-backend/internal/middlewares"
	"github.com/callprivada/fwlc-backend/internal/services"
)

type TrackingHandler struct {
	svc *services.TrackingService
}

func NewTrackingHandler(svc *services.TrackingService) *TrackingHandler {
	return &TrackingHandler{svc: svc}
}

func trackingToMap(cfg *domain.UserTrackingConfig) gin.H {
	return gin.H{
		"facebook_pixel_id":   cfg.FacebookPixelID,
		"tiktok_pixel_id":     cfg.TikTokPixelID,
		"google_analytics_id": cfg.GoogleAnalyticsID,
		"gtm_container_id":    cfg.GTMContainerID,
		"utmify_token":        cfg.UTMifyToken,
		"dracofy_token":       cfg.DracofyToken,
		"clarity_project_id":  cfg.ClarityProjectID,
		"custom_head_script":  cfg.CustomHeadScript,
	}
}

func (h *TrackingHandler) Get(c *gin.Context) {
	userID := c.MustGet(middlewares.ContextUserIDKey).(uuid.UUID)
	cfg, err := h.svc.Get(c.Request.Context(), userID)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": trackingToMap(cfg)})
}

type saveTrackingRequest struct {
	FacebookPixelID   string `json:"facebook_pixel_id"`
	TikTokPixelID     string `json:"tiktok_pixel_id"`
	GoogleAnalyticsID string `json:"google_analytics_id"`
	GTMContainerID    string `json:"gtm_container_id"`
	UTMifyToken       string `json:"utmify_token"`
	DracofyToken      string `json:"dracofy_token"`
	ClarityProjectID  string `json:"clarity_project_id"`
	CustomHeadScript  string `json:"custom_head_script"`
}

func (h *TrackingHandler) Save(c *gin.Context) {
	userID := c.MustGet(middlewares.ContextUserIDKey).(uuid.UUID)
	var req saveTrackingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "validation_error", "message": err.Error()}})
		return
	}
	cfg := &domain.UserTrackingConfig{
		UserID:            userID,
		FacebookPixelID:   req.FacebookPixelID,
		TikTokPixelID:     req.TikTokPixelID,
		GoogleAnalyticsID: req.GoogleAnalyticsID,
		GTMContainerID:    req.GTMContainerID,
		UTMifyToken:       req.UTMifyToken,
		DracofyToken:      req.DracofyToken,
		ClarityProjectID:  req.ClarityProjectID,
		CustomHeadScript:  req.CustomHeadScript,
	}
	saved, err := h.svc.Save(c.Request.Context(), userID, cfg)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": trackingToMap(saved)})
}
