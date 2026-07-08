package domain_test

import (
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/callprivada/fwlc-backend/internal/domain"
)

func active() *domain.Call {
	return &domain.Call{
		ID:     uuid.New(),
		Status: domain.CallStatusActive,
	}
}

func TestCall_IsPubliclyAccessible_Active(t *testing.T) {
	if !active().IsPubliclyAccessible() {
		t.Error("call ativa sem expiração deve ser acessível")
	}
}

func TestCall_IsPubliclyAccessible_Expired(t *testing.T) {
	c := active()
	past := time.Now().Add(-time.Hour)
	c.ExpiresAt = &past
	if c.IsPubliclyAccessible() {
		t.Error("call com ExpiresAt no passado não deve ser acessível")
	}
}

func TestCall_IsPubliclyAccessible_NotYetExpired(t *testing.T) {
	c := active()
	future := time.Now().Add(time.Hour)
	c.ExpiresAt = &future
	if !c.IsPubliclyAccessible() {
		t.Error("call com ExpiresAt no futuro deve ser acessível")
	}
}

func TestCall_IsPubliclyAccessible_StatusDisabled(t *testing.T) {
	c := active()
	c.Status = domain.CallStatusDisabled
	if c.IsPubliclyAccessible() {
		t.Error("call desabilitada não deve ser acessível")
	}
}

func TestCall_IsPubliclyAccessible_StatusExpired(t *testing.T) {
	c := active()
	c.Status = domain.CallStatusExpired
	if c.IsPubliclyAccessible() {
		t.Error("call expirada não deve ser acessível")
	}
}
