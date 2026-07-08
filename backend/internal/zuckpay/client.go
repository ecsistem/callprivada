package zuckpay

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"
)

const baseURL = "https://www.zuckpay.com.br"

var ErrInvalidSignature = errors.New("invalid zuckpay webhook signature")

// Client executa chamadas à API ZuckPay autenticado com Basic Auth.
// Cada usuário fornece suas próprias credenciais.
type Client struct {
	clientID     string
	clientSecret string
	http         *http.Client
}

func NewClient(clientID, clientSecret string) *Client {
	return &Client{
		clientID:     clientID,
		clientSecret: clientSecret,
		http:         &http.Client{Timeout: 20 * time.Second},
	}
}

// PixQRCodeRequest é o payload enviado para criar um PIX QR code.
type PixQRCodeRequest struct {
	Nome             string  `json:"nome"`
	CPF              string  `json:"cpf"`
	Email            string  `json:"email"`
	Telefone         string  `json:"telefone"`
	Valor            float64 `json:"valor"`
	URLNoty          string  `json:"urlnoty"`
	ExternalIDClient string  `json:"external_id_client"`
}

// PixQRCodeResponse é a resposta da criação de um PIX QR code.
type PixQRCodeResponse struct {
	TransactionID string  `json:"transactionId"`
	QRCode        string  `json:"qrcode"`
	QRCodeURL     string  `json:"qrcodeUrl"`
	CheckoutURL   string  `json:"checkout_url"`
	Amount        float64 `json:"amount"`
	Status        string  `json:"status"`
}

// CreatePixQRCode cria um QR code PIX na conta ZuckPay do usuário.
func (c *Client) CreatePixQRCode(req PixQRCodeRequest) (*PixQRCodeResponse, error) {
	body, err := json.Marshal(req)
	if err != nil {
		return nil, err
	}

	httpReq, err := http.NewRequest(http.MethodPost, baseURL+"/conta/v3/pix/qrcode", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.SetBasicAuth(c.clientID, c.clientSecret)

	resp, err := c.http.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("zuckpay request failed: %w", err)
	}
	defer resp.Body.Close()

	raw, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("zuckpay error %d: %s", resp.StatusCode, string(raw))
	}

	var result PixQRCodeResponse
	if err := json.Unmarshal(raw, &result); err != nil {
		return nil, fmt.Errorf("zuckpay response parse error: %w", err)
	}
	return &result, nil
}

// TransactionStatusResponse é a resposta da consulta de status de uma transação.
type TransactionStatusResponse struct {
	TransactionID string  `json:"transactionId"`
	Status        string  `json:"status"`
	Amount        float64 `json:"amount"`
}

// GetTransactionStatus consulta o status atual de uma transação diretamente na API ZuckPay.
func (c *Client) GetTransactionStatus(transactionID string) (*TransactionStatusResponse, error) {
	httpReq, err := http.NewRequest(http.MethodGet, baseURL+"/conta/v3/pix/status?transactionId="+transactionID, nil)
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Accept", "application/json")
	httpReq.SetBasicAuth(c.clientID, c.clientSecret)

	resp, err := c.http.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("zuckpay status request failed: %w", err)
	}
	defer resp.Body.Close()

	raw, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("zuckpay status error %d: %s", resp.StatusCode, string(raw))
	}

	var result TransactionStatusResponse
	if err := json.Unmarshal(raw, &result); err != nil {
		return nil, fmt.Errorf("zuckpay status parse error: %w", err)
	}
	return &result, nil
}

// VerifyWebhookSignature valida o header X-ZuckPay-Signature usando HMAC-SHA256
// com o client_secret do usuário como chave.
func VerifyWebhookSignature(rawBody []byte, signature, clientSecret string) error {
	mac := hmac.New(sha256.New, []byte(clientSecret))
	mac.Write(rawBody)
	expected := base64.StdEncoding.EncodeToString(mac.Sum(nil))
	if !hmac.Equal([]byte(expected), []byte(signature)) {
		return ErrInvalidSignature
	}
	return nil
}
