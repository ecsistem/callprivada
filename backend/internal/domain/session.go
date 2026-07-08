package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// Session representa um refresh token ativo (ou revogado) de um usuário.
// O refresh token em si nunca é persistido em texto puro — apenas seu hash.
type Session struct {
	ID               uuid.UUID
	UserID           uuid.UUID
	RefreshTokenHash string
	UserAgent        string
	IP               string
	ExpiresAt        time.Time
	RevokedAt        *time.Time
	CreatedAt        time.Time
}

func (s *Session) IsValid(now time.Time) bool {
	return s.RevokedAt == nil && now.Before(s.ExpiresAt)
}

type SessionRepository interface {
	Create(ctx context.Context, session *Session) error
	FindByRefreshTokenHash(ctx context.Context, hash string) (*Session, error)
	Revoke(ctx context.Context, id uuid.UUID) error
	RevokeAllForUser(ctx context.Context, userID uuid.UUID) error
}
