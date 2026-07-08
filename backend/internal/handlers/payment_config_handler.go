package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/callprivada/fwlc-backend/internal/middlewares"
	"github.com/callprivada/fwlc-backend/internal/services"
)

type PaymentConfigHandler struct {
	svc *services.PaymentConfigService
}

func NewPaymentConfigHandler(svc *services.PaymentConfigService) *PaymentConfigHandler {
	return &PaymentConfigHandler{svc: svc}
}

func (h *PaymentConfigHandler) Get(c *gin.Context) {
	userID := c.MustGet(middlewares.ContextUserIDKey).(uuid.UUID)

	cfg, err := h.svc.Get(c.Request.Context(), userID)
	if err != nil {
		respondError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": gin.H{
		"zuckpay_client_id":     cfg.ZuckPayClientID,
		"zuckpay_client_secret": maskSecret(cfg.ZuckPayClientSecret),
		"configured":            cfg.IsConfigured(),
	}})
}

type savePaymentConfigRequest struct {
	ZuckPayClientID     string `json:"zuckpay_client_id" binding:"required"`
	ZuckPayClientSecret string `json:"zuckpay_client_secret" binding:"required"`
}

func (h *PaymentConfigHandler) Save(c *gin.Context) {
	userID := c.MustGet(middlewares.ContextUserIDKey).(uuid.UUID)

	var req savePaymentConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "validation_error", "message": err.Error()}})
		return
	}

	cfg, err := h.svc.Save(c.Request.Context(), userID, req.ZuckPayClientID, req.ZuckPayClientSecret)
	if err != nil {
		respondError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": gin.H{
		"zuckpay_client_id":     cfg.ZuckPayClientID,
		"zuckpay_client_secret": maskSecret(cfg.ZuckPayClientSecret),
		"configured":            cfg.IsConfigured(),
	}})
}

// maskSecret oculta todos os caracteres exceto os 4 últimos.
func maskSecret(s string) string {
	if len(s) <= 4 {
		return "****"
	}
	masked := ""
	for i := 0; i < len(s)-4; i++ {
		masked += "*"
	}
	return masked + s[len(s)-4:]
}
