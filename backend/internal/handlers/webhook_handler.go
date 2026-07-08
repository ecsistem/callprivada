package handlers

import (
	"encoding/json"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/callprivada/fwlc-backend/internal/abacatepay"
	"github.com/callprivada/fwlc-backend/internal/services"
)

type WebhookHandler struct {
	subs          *services.SubscriptionService
	webhookSecret string
}

func NewWebhookHandler(subs *services.SubscriptionService, webhookSecret string) *WebhookHandler {
	return &WebhookHandler{subs: subs, webhookSecret: webhookSecret}
}

func (h *WebhookHandler) AbacatePay(c *gin.Context) {
	rawBody, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cannot read body"})
		return
	}

	sig := c.GetHeader("X-Webhook-Signature")
	if h.webhookSecret != "" {
		if err := abacatepay.VerifySignature(rawBody, sig, h.webhookSecret); err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid signature"})
			return
		}
	}

	var payload abacatepay.WebhookPayload
	if err := json.Unmarshal(rawBody, &payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid payload"})
		return
	}

	// Extrai o ID da assinatura do campo data (estrutura variável por evento).
	var dataMap map[string]interface{}
	_ = json.Unmarshal(payload.Data, &dataMap)

	subID, _ := dataMap["id"].(string)
	if subID == "" {
		// Alguns eventos aninhados trazem o id dentro de um objeto subscription.
		if nested, ok := dataMap["subscription"].(map[string]interface{}); ok {
			subID, _ = nested["id"].(string)
		}
	}

	if subID != "" {
		_ = h.subs.HandleWebhookEvent(payload.Event, subID, "")
	}

	c.JSON(http.StatusOK, gin.H{"received": true})
}
