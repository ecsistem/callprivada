package domain_test

import (
	"testing"

	"github.com/callprivada/fwlc-backend/internal/domain"
)

func TestUserPaymentConfig_IsConfigured(t *testing.T) {
	tests := []struct {
		name   string
		cfg    domain.UserPaymentConfig
		expect bool
	}{
		{"ambos preenchidos", domain.UserPaymentConfig{ZuckPayClientID: "id", ZuckPayClientSecret: "sec"}, true},
		{"só ID", domain.UserPaymentConfig{ZuckPayClientID: "id"}, false},
		{"só secret", domain.UserPaymentConfig{ZuckPayClientSecret: "sec"}, false},
		{"ambos vazios", domain.UserPaymentConfig{}, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.cfg.IsConfigured(); got != tt.expect {
				t.Errorf("IsConfigured() = %v, want %v", got, tt.expect)
			}
		})
	}
}
