package handlers

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/callprivada/fwlc-backend/internal/domain"
	"github.com/callprivada/fwlc-backend/internal/middlewares"
	"github.com/callprivada/fwlc-backend/internal/services"
	ws "github.com/callprivada/fwlc-backend/internal/ws"
)

type BillingHandler struct {
	billing *services.BillingService
	hub     *ws.Hub
}

func NewBillingHandler(billing *services.BillingService, hub *ws.Hub) *BillingHandler {
	return &BillingHandler{billing: billing, hub: hub}
}

type createPixRequest struct {
	PayerName     string `json:"payer_name" binding:"required"`
	PayerDocument string `json:"payer_document" binding:"required"`
	PayerEmail    string `json:"payer_email" binding:"required,email"`
	PayerPhone    string `json:"payer_phone"`
}

func (h *BillingHandler) CreatePIX(c *gin.Context) {
	slug := c.Param("slug")

	var req createPixRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "validation_error", "message": err.Error()}})
		return
	}

	// amount_cents pode ser passado pela query (?amount_cents=1990) ou
	// ser lido do evento — aqui usamos o parâmetro de query para flexibilidade.
	var amountCents int
	if err := c.ShouldBindQuery(&struct {
		AmountCents int `form:"amount_cents"`
	}{AmountCents: 0}); err == nil {
		// noop — valor abaixo
	}
	if a := c.Query("amount_cents"); a != "" {
		if v, err := strconv.Atoi(a); err == nil && v > 0 {
			amountCents = v
		}
	}

	result, err := h.billing.CreatePIX(c.Request.Context(), services.CreateBillingInput{
		Slug:          slug,
		PayerName:     req.PayerName,
		PayerDocument: req.PayerDocument,
		PayerEmail:    req.PayerEmail,
		PayerPhone:    req.PayerPhone,
		AmountCents:   amountCents,
	})
	if err != nil {
		log.Printf("[billing] CreatePIX error: %v", err)
		respondError(c, err)
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": result})
}

// CreateWayMBPayment — POST /public/calls/:slug/billing/waymb?amount_cents=N&method=mbway
func (h *BillingHandler) CreateWayMBPayment(c *gin.Context) {
	slug := c.Param("slug")

	var req createPixRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "validation_error", "message": err.Error()}})
		return
	}

	method := c.Query("method")
	if method == "" {
		method = "mbway"
	}

	var amountCents int
	if a := c.Query("amount_cents"); a != "" {
		if v, err := strconv.Atoi(a); err == nil && v > 0 {
			amountCents = v
		}
	}

	result, err := h.billing.CreateWayMBPayment(c.Request.Context(), services.CreateBillingInput{
		Slug:          slug,
		PayerName:     req.PayerName,
		PayerDocument: req.PayerDocument,
		PayerEmail:    req.PayerEmail,
		PayerPhone:    req.PayerPhone,
		AmountCents:   amountCents,
	}, method)
	if err != nil {
		log.Printf("[billing] CreateWayMBPayment error: %v", err)
		respondError(c, err)
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": result})
}

// GetWayMBStatus — GET /public/billing/transactions/:id/waymb-status
func (h *BillingHandler) GetWayMBStatus(c *gin.Context) {
	txnID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "bad_request", "message": "id inválido"}})
		return
	}

	status, amountCents, err := h.billing.GetWayMBStatus(c.Request.Context(), txnID)
	if err != nil {
		respondError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": gin.H{
		"status":       status,
		"amount_cents": amountCents,
		"paid":         status == "PAID",
	}})
}

// WayMBWebhook processa notificações de pagamento da WayMB.
func (h *BillingHandler) WayMBWebhook(c *gin.Context) {
	var payload struct {
		TransactionID string  `json:"transactionId"`
		ID            string  `json:"id"`
		Status        string  `json:"status"`
		Amount        float64 `json:"amount"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.Status(http.StatusBadRequest)
		return
	}

	id := payload.TransactionID
	if id == "" {
		id = payload.ID
	}
	if id == "" {
		c.JSON(http.StatusOK, gin.H{"ok": false})
		return
	}

	result, err := h.billing.ProcessWayMBWebhook(c.Request.Context(), id, payload.Status)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"ok": false, "error": err.Error()})
		return
	}

	if result.Status == "PAID" {
		h.hub.Broadcast(result.CallUserID, "payment_received", map[string]any{
			"call_title":   result.CallTitle,
			"amount_cents": result.AmountCents,
		})
	}

	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// GetPaymentStats — GET /billing/stats?period=day|month|year|all|custom&from=YYYY-MM-DD&to=YYYY-MM-DD (autenticado)
func (h *BillingHandler) GetPaymentStats(c *gin.Context) {
	uid := c.MustGet(middlewares.ContextUserIDKey).(uuid.UUID)
	period := c.DefaultQuery("period", "all")
	from := c.Query("from")
	to := c.Query("to")

	stats, err := h.billing.GetStats(c.Request.Context(), uid, period, from, to)
	if err != nil {
		respondError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": stats})
}

// GetPixStatus — GET /public/billing/transactions/:id/status?zuckpay_txn_id=XXX&slug=YYYY
func (h *BillingHandler) GetPixStatus(c *gin.Context) {
	// Caminho rápido: consulta direta ao ZuckPay se temos o ID deles.
	zuckPayID := c.Query("zuckpay_txn_id")
	slug := c.Query("slug")
	if zuckPayID != "" && slug != "" {
		status, err := h.billing.GetPixStatusByZuckPayID(c.Request.Context(), slug, zuckPayID)
		if err != nil {
			respondError(c, err)
			return
		}
		c.JSON(http.StatusOK, gin.H{"data": gin.H{
			"status": status,
			"paid":   status == "PAID",
		}})
		return
	}

	txnID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "bad_request", "message": "id inválido"}})
		return
	}

	status, amountCents, err := h.billing.GetPixStatus(c.Request.Context(), txnID)
	if err != nil {
		if err == domain.ErrNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"code": "not_found", "message": "transação não encontrada"}})
			return
		}
		respondError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": gin.H{
		"status":       status,
		"amount_cents": amountCents,
		"paid":         status == "PAID",
	}})
}

// ZuckPayWebhook processa notificações de pagamento do ZuckPay.
func (h *BillingHandler) ZuckPayWebhook(c *gin.Context) {
	rawBody, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.Status(http.StatusBadRequest)
		return
	}

	signature := c.GetHeader("X-ZuckPay-Signature")

	// Extrai campos mínimos do payload para rotear a transação.
	var payload struct {
		Event       string `json:"event"`
		Transaction struct {
			ExternalIDClient string `json:"external_id_client"`
			Status           string `json:"status"`
		} `json:"transaction"`
	}
	if err := json.Unmarshal(rawBody, &payload); err != nil {
		c.Status(http.StatusBadRequest)
		return
	}

	status := payload.Transaction.Status
	if status == "" {
		switch payload.Event {
		case "payment_approved":
			status = "PAID"
		case "payment_refused":
			status = "FAILED"
		case "payment_pending":
			status = "PENDING"
		default:
			status = "PAID"
		}
	}

	result, err := h.billing.ProcessWebhook(
		c.Request.Context(),
		rawBody,
		signature,
		payload.Transaction.ExternalIDClient,
		status,
	)
	if err != nil {
		// Retorna 200 mesmo em erro para evitar reenvio em casos não recuperáveis.
		c.JSON(http.StatusOK, gin.H{"ok": false, "error": err.Error()})
		return
	}

	// Notifica o dono em tempo real quando o PIX é pago.
	if result.Status == "PAID" {
		h.hub.Broadcast(result.CallUserID, "payment_received", map[string]any{
			"call_title":   result.CallTitle,
			"amount_cents": result.AmountCents,
		})
	}

	c.JSON(http.StatusOK, gin.H{"ok": true})
}
