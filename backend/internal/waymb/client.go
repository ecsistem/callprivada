package waymb

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"time"
)

const baseURL = "https://api.waymb.com"

var ErrUnexpectedStatus = errors.New("waymb: unexpected status code")

type Client struct {
	clientID     string
	clientSecret string
	accountEmail string
	http         *http.Client
}

func NewClient(clientID, clientSecret, accountEmail string) *Client {
	return &Client{
		clientID:     clientID,
		clientSecret: clientSecret,
		accountEmail: accountEmail,
		http:         &http.Client{Timeout: 20 * time.Second},
	}
}

type Payer struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Document string `json:"document"`
	Phone    string `json:"phone"`
}

type CreateTransactionRequest struct {
	Method             string  `json:"method"` // mbway | multibanco | bizum
	Amount             float64 `json:"amount"`
	Payer              Payer   `json:"payer"`
	PaymentDescription string  `json:"paymentDescription,omitempty"`
	Currency           string  `json:"currency,omitempty"`
	CallbackURL        string  `json:"callbackUrl,omitempty"`
	SuccessURL         string  `json:"success_url,omitempty"`
	FailedURL          string  `json:"failed_url,omitempty"`
}

type ReferenceData struct {
	Entity    string      `json:"entity"`
	Reference string      `json:"reference"`
	ExpiresAt UnixSeconds `json:"expiresAt"`
}

type UnixSeconds int64

func (u *UnixSeconds) UnmarshalJSON(data []byte) error {
	if string(data) == "null" {
		*u = 0
		return nil
	}

	var numeric int64
	if err := json.Unmarshal(data, &numeric); err == nil {
		*u = UnixSeconds(numeric)
		return nil
	}

	var text string
	if err := json.Unmarshal(data, &text); err == nil {
		if text == "" {
			*u = 0
			return nil
		}
		numeric, err := strconv.ParseInt(text, 10, 64)
		if err != nil {
			return fmt.Errorf("waymb: invalid expiresAt %q: %w", text, err)
		}
		*u = UnixSeconds(numeric)
		return nil
	}

	return fmt.Errorf("waymb: invalid expiresAt payload: %s", string(data))
}

type CreateTransactionResponse struct {
	StatusCode     int            `json:"statusCode"`
	Message        string         `json:"message"`
	TransactionID  string         `json:"transactionID"`
	ID             string         `json:"id"`
	Amount         float64        `json:"amount"`
	Method         string         `json:"method"`
	ReferenceData  *ReferenceData `json:"referenceData,omitempty"`
	GeneratedMBWay bool           `json:"generatedMBWay,omitempty"`
}

type TransactionInfo struct {
	ID            string         `json:"id"`
	Status        string         `json:"status"` // PENDING | COMPLETED | DECLINED
	Amount        float64        `json:"amount"`
	Method        string         `json:"method"`
	ReferenceData *ReferenceData `json:"referenceData,omitempty"`
}

func (c *Client) CreateTransaction(req CreateTransactionRequest) (*CreateTransactionResponse, error) {
	body := map[string]any{
		"client_id":          c.clientID,
		"client_secret":      c.clientSecret,
		"account_email":      c.accountEmail,
		"amount":             req.Amount,
		"method":             req.Method,
		"payer":              req.Payer,
		"paymentDescription": req.PaymentDescription,
		"currency":           req.Currency,
		"callbackUrl":        req.CallbackURL,
		"success_url":        req.SuccessURL,
		"failed_url":         req.FailedURL,
	}

	raw, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}

	resp, err := c.http.Post(baseURL+"/transactions/create", "application/json", bytes.NewReader(raw))
	if err != nil {
		return nil, fmt.Errorf("waymb: %w", err)
	}
	defer resp.Body.Close()

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		return nil, fmt.Errorf("%w: %d — %s", ErrUnexpectedStatus, resp.StatusCode, string(data))
	}

	var result CreateTransactionResponse
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

func (c *Client) GetTransactionInfo(id string) (*TransactionInfo, error) {
	body, _ := json.Marshal(map[string]string{
		"id":            id,
		"client_id":     c.clientID,
		"client_secret": c.clientSecret,
		"account_email": c.accountEmail,
	})

	resp, err := c.http.Post(baseURL+"/transactions/info", "application/json", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("waymb: %w", err)
	}
	defer resp.Body.Close()

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("%w: %d — %s", ErrUnexpectedStatus, resp.StatusCode, string(data))
	}

	var info TransactionInfo
	if err := json.Unmarshal(data, &info); err != nil {
		return nil, err
	}
	return &info, nil
}
