package models

import (
	"time"

	"github.com/google/uuid"

	"github.com/callprivada/fwlc-backend/internal/domain"
)

type AuditLog struct {
	ID        uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	AdminID   uuid.UUID  `gorm:"type:uuid;not null"`
	Action    string     `gorm:"not null"`
	Target    string     `gorm:"not null;default:''"`
	TargetID  *uuid.UUID `gorm:"type:uuid"`
	Detail    string     `gorm:"not null;default:''"`
	CreatedAt time.Time  `gorm:"not null;autoCreateTime"`
}

func (m *AuditLog) ToDomain() *domain.AuditLog {
	return &domain.AuditLog{
		ID:        m.ID,
		AdminID:   m.AdminID,
		Action:    m.Action,
		Target:    m.Target,
		TargetID:  m.TargetID,
		Detail:    m.Detail,
		CreatedAt: m.CreatedAt,
	}
}
