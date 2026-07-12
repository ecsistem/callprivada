package services

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"github.com/callprivada/fwlc-backend/internal/domain"
	"github.com/callprivada/fwlc-backend/internal/waymb"
	"github.com/callprivada/fwlc-backend/internal/zuckpay"
)

type BillingService struct {
	calls       domain.CallRepository
	configs     domain.PaymentConfigRepository
	txns        domain.BillingTransactionRepository
	webhookBase string // PUBLIC_BASE_URL do backend (para urlnoty)
}

func NewBillingService(
	calls domain.CallRepository,
	configs domain.PaymentConfigRepository,
	txns domain.BillingTransactionRepository,
	webhookBase string,
) *BillingService {
	return &BillingService{calls: calls, configs: configs, txns: txns, webhookBase: webhookBase}
}

type CreateBillingInput struct {
	// Slug identifica a chamada (página pública — sem auth).
	Slug          string
	PayerName     string
	PayerDocument string
	PayerEmail    string
	PayerPhone    string
	// AmountCents vem do call_event.billing_amount_cents.
	AmountCents int
}

type BillingResult struct {
	TransactionID       string `json:"transaction_id"`
	Gateway             string `json:"gateway"`
	ZuckPayTxnID        string `json:"zuckpay_txn_id,omitempty"`
	WayMBTxnID          string `json:"waymb_txn_id,omitempty"`
	WayMBMethod         string `json:"waymb_method,omitempty"`
	MultibancoEntity    string `json:"multibanco_entity,omitempty"`
	MultibancoReference string `json:"multibanco_reference,omitempty"`
	MultibancoExpiresAt int64  `json:"multibanco_expires_at,omitempty"`
	QRCode              string `json:"qr_code,omitempty"`
	QRCodeURL           string `json:"qr_code_url,omitempty"`
	CheckoutURL         string `json:"checkout_url,omitempty"`
	AmountCents         int    `json:"amount_cents"`
}

func (s *BillingService) CreatePIX(ctx context.Context, in CreateBillingInput) (*BillingResult, error) {
	call, err := s.calls.FindBySlug(ctx, in.Slug)
	if err != nil {
		return nil, err
	}
	if !call.IsPubliclyAccessible() {
		return nil, domain.ErrCallExpired
	}

	cfg, err := s.configs.FindByUserID(ctx, call.UserID)
	if err != nil || !cfg.IsConfigured() {
		return nil, domain.ErrPaymentNotConfigured
	}

	// Cria a transação no banco primeiro para ter o ID (usado como external_id_client).
	txn := &domain.BillingTransaction{
		CallID:        call.ID,
		AmountCents:   in.AmountCents,
		Status:        "PENDING",
		PayerName:     in.PayerName,
		PayerDocument: in.PayerDocument,
		PayerEmail:    in.PayerEmail,
	}
	if err := s.txns.Create(ctx, txn); err != nil {
		return nil, err
	}

	payerEmail := in.PayerEmail
	if payerEmail == "" {
		payerEmail = "lead@hotcall.app"
	}
	payerPhone := in.PayerPhone
	if payerPhone == "" {
		payerPhone = "11999999999"
	}

	client := zuckpay.NewClient(cfg.ZuckPayClientID, cfg.ZuckPayClientSecret)
	pixResp, err := client.CreatePixQRCode(zuckpay.PixQRCodeRequest{
		Nome:             in.PayerName,
		CPF:              in.PayerDocument,
		Email:            payerEmail,
		Telefone:         payerPhone,
		Valor:            float64(in.AmountCents) / 100.0,
		URLNoty:          fmt.Sprintf("%s/api/v1/webhooks/zuckpay", s.webhookBase),
		ExternalIDClient: txn.ID.String(),
	})
	if err != nil {
		// Marca a transação como falha e retorna erro.
		_ = s.txns.UpdateStatus(ctx, txn.ID, "FAILED")
		return nil, fmt.Errorf("falha ao criar cobrança PIX: %w", err)
	}

	// Persiste o ZuckPayTxnID para que o polling possa consultar o status diretamente.
	_ = s.txns.UpdateZuckPayID(ctx, txn.ID, pixResp.TransactionID)

	return &BillingResult{
		TransactionID: txn.ID.String(),
		ZuckPayTxnID:  pixResp.TransactionID,
		QRCode:        pixResp.QRCode,
		QRCodeURL:     pixResp.QRCodeURL,
		CheckoutURL:   pixResp.CheckoutURL,
		AmountCents:   in.AmountCents,
	}, nil
}

// GetPixStatus retorna o status de uma transação PIX pelo ID.
// Se ainda PENDING e tivermos o ZuckPayTxnID, consulta a API do ZuckPay diretamente
// como fallback para quando o webhook não chegou.
func (s *BillingService) GetPixStatus(ctx context.Context, txnID uuid.UUID) (string, int, error) {
	txn, err := s.txns.FindByID(ctx, txnID)
	if err != nil {
		return "", 0, err
	}

	if txn.Status == "PENDING" && txn.ZuckPayTxnID != "" {
		cfg, err := s.getConfigForTransaction(ctx, txn)
		if err == nil {
			client := zuckpay.NewClient(cfg.ZuckPayClientID, cfg.ZuckPayClientSecret)
			zResp, err := client.GetTransactionStatus(txn.ZuckPayTxnID)
			if err == nil && zResp.Status != "" && zResp.Status != txn.Status {
				_ = s.txns.UpdateStatus(ctx, txnID, zResp.Status)
				txn.Status = zResp.Status
			}
		}
	}

	return txn.Status, txn.AmountCents, nil
}

// GetPixStatusByZuckPayID consulta o status diretamente no ZuckPay usando o ID deles.
// Usado quando o frontend tem o zuckpay_txn_id mas pode não ter o nosso UUID.
func (s *BillingService) GetPixStatusByZuckPayID(ctx context.Context, slug, zuckPayTxnID string) (string, error) {
	call, err := s.calls.FindBySlug(ctx, slug)
	if err != nil {
		return "", err
	}
	cfg, err := s.configs.FindByUserID(ctx, call.UserID)
	if err != nil || !cfg.IsConfigured() {
		return "", domain.ErrPaymentNotConfigured
	}
	client := zuckpay.NewClient(cfg.ZuckPayClientID, cfg.ZuckPayClientSecret)
	zResp, err := client.GetTransactionStatus(zuckPayTxnID)
	if err != nil {
		return "", err
	}
	return zResp.Status, nil
}

func (s *BillingService) getConfigForTransaction(ctx context.Context, txn *domain.BillingTransaction) (*domain.UserPaymentConfig, error) {
	call, err := s.calls.FindByID(ctx, txn.CallID)
	if err != nil {
		return nil, err
	}
	return s.configs.FindByUserID(ctx, call.UserID)
}

// ProcessWebhook valida e processa o webhook do ZuckPay.
// externalID é o transaction.external_id_client do payload (nosso billing_transaction.id).
type WebhookResult struct {
	CallUserID  uuid.UUID
	CallTitle   string
	AmountCents int
	Status      string
}

func (s *BillingService) ProcessWebhook(ctx context.Context, rawBody []byte, signature, externalID, status string) (*WebhookResult, error) {
	txnID, err := uuid.Parse(externalID)
	if err != nil {
		return nil, fmt.Errorf("external_id_client inválido: %w", err)
	}

	txn, err := s.txns.FindByID(ctx, txnID)
	if err != nil {
		return nil, err
	}

	call, err := s.calls.FindByID(ctx, txn.CallID)
	if err != nil {
		return nil, err
	}

	cfg, err := s.configs.FindByUserID(ctx, call.UserID)
	if err != nil {
		return nil, err
	}

	if signature != "" {
		if err := zuckpay.VerifyWebhookSignature(rawBody, signature, cfg.ZuckPayClientSecret); err != nil {
			return nil, err
		}
	}

	if err := s.txns.UpdateStatus(ctx, txnID, status); err != nil {
		return nil, err
	}

	return &WebhookResult{
		CallUserID:  call.UserID,
		CallTitle:   call.Title,
		AmountCents: txn.AmountCents,
		Status:      status,
	}, nil
}

// CreateWayMBPayment cria uma transação WayMB (mbway | multibanco | bizum).
func (s *BillingService) CreateWayMBPayment(ctx context.Context, in CreateBillingInput, method string) (*BillingResult, error) {
	call, err := s.calls.FindBySlug(ctx, in.Slug)
	if err != nil {
		return nil, err
	}
	if !call.IsPubliclyAccessible() {
		return nil, domain.ErrCallExpired
	}

	cfg, err := s.configs.FindByUserID(ctx, call.UserID)
	if err != nil || !cfg.IsWayMBConfigured() {
		return nil, domain.ErrPaymentNotConfigured
	}

	txn := &domain.BillingTransaction{
		CallID:        call.ID,
		Gateway:       "waymb",
		WayMBMethod:   method,
		AmountCents:   in.AmountCents,
		Status:        "PENDING",
		PayerName:     in.PayerName,
		PayerDocument: in.PayerDocument,
		PayerEmail:    in.PayerEmail,
	}
	if err := s.txns.Create(ctx, txn); err != nil {
		return nil, err
	}

	client := waymb.NewClient(cfg.WayMBClientID, cfg.WayMBClientSecret, cfg.WayMBAccountEmail)
	resp, err := client.CreateTransaction(waymb.CreateTransactionRequest{
		Method: method,
		Amount: float64(in.AmountCents) / 100.0,
		Payer: waymb.Payer{
			Name:     in.PayerName,
			Email:    in.PayerEmail,
			Document: in.PayerDocument,
			Phone:    in.PayerPhone,
		},
		PaymentDescription: "CallPrivada",
		Currency:           cfg.Currency,
		CallbackURL:        fmt.Sprintf("%s/api/v1/webhooks/waymb", s.webhookBase),
	})
	if err != nil {
		_ = s.txns.UpdateStatus(ctx, txn.ID, "FAILED")
		return nil, fmt.Errorf("falha ao criar cobrança WayMB: %w", err)
	}

	_ = s.txns.UpdateWayMBTxnID(ctx, txn.ID, resp.ID)

	result := &BillingResult{
		TransactionID: txn.ID.String(),
		Gateway:       "waymb",
		WayMBTxnID:    resp.ID,
		WayMBMethod:   method,
		AmountCents:   in.AmountCents,
	}
	if resp.ReferenceData != nil {
		result.MultibancoEntity = resp.ReferenceData.Entity
		result.MultibancoReference = resp.ReferenceData.Reference
		result.MultibancoExpiresAt = int64(resp.ReferenceData.ExpiresAt)
		_ = s.txns.UpdateWayMBMultibancoData(ctx, txn.ID,
			resp.ReferenceData.Entity,
			resp.ReferenceData.Reference,
			int64(resp.ReferenceData.ExpiresAt),
		)
	}
	return result, nil
}

// GetWayMBStatus consulta o status de uma transação WayMB.
func (s *BillingService) GetWayMBStatus(ctx context.Context, txnID uuid.UUID) (string, int, error) {
	txn, err := s.txns.FindByID(ctx, txnID)
	if err != nil {
		return "", 0, err
	}

	if txn.Status == "PENDING" && txn.WayMBTxnID != "" {
		cfg, err := s.getConfigForTransaction(ctx, txn)
		if err == nil && cfg.IsWayMBConfigured() {
			client := waymb.NewClient(cfg.WayMBClientID, cfg.WayMBClientSecret, cfg.WayMBAccountEmail)
			info, err := client.GetTransactionInfo(txn.WayMBTxnID)
			if err == nil {
				var mapped string
				switch info.Status {
				case "COMPLETED":
					mapped = "PAID"
				case "DECLINED":
					mapped = "FAILED"
				default:
					mapped = "PENDING"
				}
				if mapped != txn.Status {
					_ = s.txns.UpdateStatus(ctx, txnID, mapped)
					txn.Status = mapped
				}
			}
		}
	}

	return txn.Status, txn.AmountCents, nil
}

// ProcessWayMBWebhook processa callback da WayMB.
// transactionID é o ID da WayMB (não UUID interno).
func (s *BillingService) ProcessWayMBWebhook(ctx context.Context, transactionID, status string) (*WebhookResult, error) {
	// Busca a transação interna pelo WayMB transaction ID.
	txn, err := s.txns.FindByWayMBTxnID(ctx, transactionID)
	if err != nil {
		return nil, fmt.Errorf("transação não encontrada para waymb_id=%s: %w", transactionID, err)
	}

	call, err := s.calls.FindByID(ctx, txn.CallID)
	if err != nil {
		return nil, err
	}

	// Valida o status diretamente na WayMB antes de liberar (conforme documentação).
	cfg, cfgErr := s.configs.FindByUserID(ctx, call.UserID)
	if cfgErr == nil && cfg.IsWayMBConfigured() {
		client := waymb.NewClient(cfg.WayMBClientID, cfg.WayMBClientSecret, cfg.WayMBAccountEmail)
		if info, infoErr := client.GetTransactionInfo(transactionID); infoErr == nil {
			status = info.Status // usa o status confirmado pela API
		}
	}

	var mapped string
	switch status {
	case "COMPLETED":
		mapped = "PAID"
	case "DECLINED":
		mapped = "FAILED"
	default:
		mapped = "PENDING"
	}

	if err := s.txns.UpdateStatus(ctx, txn.ID, mapped); err != nil {
		return nil, err
	}

	return &WebhookResult{
		CallUserID:  call.UserID,
		CallTitle:   call.Title,
		AmountCents: txn.AmountCents,
		Status:      mapped,
	}, nil
}

func (s *BillingService) GetStats(ctx context.Context, userID uuid.UUID, period, from, to string) (*domain.PaymentStats, error) {
	return s.txns.GetStatsByUser(ctx, userID, period, from, to)
}
