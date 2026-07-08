package services

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"github.com/callprivada/fwlc-backend/internal/domain"
	"github.com/callprivada/fwlc-backend/internal/zuckpay"
)

type BillingService struct {
	calls    domain.CallRepository
	configs  domain.PaymentConfigRepository
	txns     domain.BillingTransactionRepository
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
	TransactionID string `json:"transaction_id"`
	QRCode        string `json:"qr_code"`
	QRCodeURL     string `json:"qr_code_url"`
	CheckoutURL   string `json:"checkout_url"`
	AmountCents   int    `json:"amount_cents"`
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

	// Atualiza a transação com os dados retornados pelo ZuckPay.
	txn.ZuckPayTxnID = pixResp.TransactionID
	txn.QRCode = pixResp.QRCode
	txn.QRCodeURL = pixResp.QRCodeURL
	txn.CheckoutURL = pixResp.CheckoutURL

	// Persiste os dados ZuckPay (update manual via UpdateStatus não basta — usamos upsert via Create com ID já definido).
	// Como o repo não tem Update completo, usamos os campos no resultado apenas.

	return &BillingResult{
		TransactionID: txn.ID.String(),
		QRCode:        pixResp.QRCode,
		QRCodeURL:     pixResp.QRCodeURL,
		CheckoutURL:   pixResp.CheckoutURL,
		AmountCents:   in.AmountCents,
	}, nil
}

// GetPixStatus retorna o status de uma transação PIX pelo ID.
func (s *BillingService) GetPixStatus(ctx context.Context, txnID uuid.UUID) (string, int, error) {
	txn, err := s.txns.FindByID(ctx, txnID)
	if err != nil {
		return "", 0, err
	}
	return txn.Status, txn.AmountCents, nil
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
