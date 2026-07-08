package models

import (
	"time"

	"github.com/google/uuid"

	"github.com/callprivada/fwlc-backend/internal/domain"
)

type Session struct {
	ID               uuid.UUID `gorm:"type:uuid;primaryKey"`
	UserID           uuid.UUID `gorm:"type:uuid;not null;index"`
	RefreshTokenHash string    `gorm:"size:255;not null;uniqueIndex"`
	UserAgent        string    `gorm:"size:255"`
	IP               string    `gorm:"size:64"`
	ExpiresAt        time.Time `gorm:"not null"`
	RevokedAt        *time.Time
	CreatedAt        time.Time
}

func (Session) TableName() string { return "sessions" }

func (m *Session) ToDomain() *domain.Session {
	return &domain.Session{
		ID:               m.ID,
		UserID:           m.UserID,
		RefreshTokenHash: m.RefreshTokenHash,
		UserAgent:        m.UserAgent,
		IP:               m.IP,
		ExpiresAt:        m.ExpiresAt,
		RevokedAt:        m.RevokedAt,
		CreatedAt:        m.CreatedAt,
	}
}

func SessionFromDomain(s *domain.Session) *Session {
	return &Session{
		ID:               s.ID,
		UserID:           s.UserID,
		RefreshTokenHash: s.RefreshTokenHash,
		UserAgent:        s.UserAgent,
		IP:               s.IP,
		ExpiresAt:        s.ExpiresAt,
		RevokedAt:        s.RevokedAt,
		CreatedAt:        s.CreatedAt,
	}
}
