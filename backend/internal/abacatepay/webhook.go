package abacatepay

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
)

var ErrInvalidWebhookSignature = errors.New("invalid webhook signature")

type WebhookPayload struct {
	ID         string          `json:"id"`
	Event      string          `json:"event"`
	APIVersion int             `json:"apiVersion"`
	DevMode    bool            `json:"devMode"`
	Data       json.RawMessage `json:"data"`
}

// VerifySignature valida o header X-Webhook-Signature usando HMAC-SHA256.
func VerifySignature(rawBody []byte, signature, secret string) error {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(rawBody)
	expected := base64.StdEncoding.EncodeToString(mac.Sum(nil))
	if !hmac.Equal([]byte(expected), []byte(signature)) {
		return ErrInvalidWebhookSignature
	}
	return nil
}
