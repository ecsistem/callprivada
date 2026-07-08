package services_test

import (
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/callprivada/fwlc-backend/internal/services"
)

func newJWT() *services.JWTService {
	return services.NewJWTService("super-secret-for-test", 15*time.Minute)
}

func TestJWT_GenerateAndParse(t *testing.T) {
	svc := newJWT()
	userID := uuid.New()

	token, _, err := svc.GenerateAccessToken(userID, "user")
	if err != nil {
		t.Fatalf("GenerateAccessToken error: %v", err)
	}

	claims, err := svc.ParseAccessToken(token)
	if err != nil {
		t.Fatalf("ParseAccessToken error: %v", err)
	}

	if claims.UserID != userID {
		t.Errorf("UserID = %v, want %v", claims.UserID, userID)
	}
	if claims.Role != "user" {
		t.Errorf("Role = %q, want user", claims.Role)
	}
}

func TestJWT_InvalidToken(t *testing.T) {
	svc := newJWT()
	_, err := svc.ParseAccessToken("not.a.valid.token")
	if err == nil {
		t.Error("esperava erro para token inválido")
	}
}

func TestJWT_WrongSecret(t *testing.T) {
	svc1 := services.NewJWTService("secret-a", 15*time.Minute)
	svc2 := services.NewJWTService("secret-b", 15*time.Minute)

	token, _, err := svc1.GenerateAccessToken(uuid.New(), "user")
	if err != nil {
		t.Fatalf("GenerateAccessToken error: %v", err)
	}

	_, err = svc2.ParseAccessToken(token)
	if err == nil {
		t.Error("esperava erro ao validar com secret diferente")
	}
}

func TestJWT_ExpiredToken(t *testing.T) {
	// TTL negativo gera token já expirado.
	svc := services.NewJWTService("secret", -time.Second)
	token, _, _ := svc.GenerateAccessToken(uuid.New(), "user")

	validSvc := newJWT()
	_, err := validSvc.ParseAccessToken(token)
	if err == nil {
		t.Error("esperava erro para token expirado")
	}
}

func TestJWT_AdminRole(t *testing.T) {
	svc := newJWT()
	userID := uuid.New()

	token, _, err := svc.GenerateAccessToken(userID, "admin")
	if err != nil {
		t.Fatalf("GenerateAccessToken error: %v", err)
	}

	claims, err := svc.ParseAccessToken(token)
	if err != nil {
		t.Fatalf("ParseAccessToken error: %v", err)
	}

	if claims.Role != "admin" {
		t.Errorf("Role = %q, want admin", claims.Role)
	}
}
