package zuckpay_test

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"testing"

	"github.com/callprivada/fwlc-backend/internal/zuckpay"
)

func sign(body []byte, secret string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	return base64.StdEncoding.EncodeToString(mac.Sum(nil))
}

func TestVerifyWebhookSignature_Valid(t *testing.T) {
	body := []byte(`{"event":"payment","transaction":{"status":"PAID"}}`)
	secret := "my-client-secret"
	sig := sign(body, secret)

	if err := zuckpay.VerifyWebhookSignature(body, sig, secret); err != nil {
		t.Errorf("esperava assinatura válida, got: %v", err)
	}
}

func TestVerifyWebhookSignature_Invalid(t *testing.T) {
	body := []byte(`{"event":"payment"}`)
	err := zuckpay.VerifyWebhookSignature(body, "assinatura-errada", "secret")
	if err == nil {
		t.Error("esperava erro para assinatura inválida")
	}
}

func TestVerifyWebhookSignature_TamperedBody(t *testing.T) {
	original := []byte(`{"event":"payment","amount":100}`)
	secret := "secret"
	sig := sign(original, secret)

	tampered := []byte(`{"event":"payment","amount":999}`)
	if err := zuckpay.VerifyWebhookSignature(tampered, sig, secret); err == nil {
		t.Error("esperava erro para body adulterado")
	}
}
