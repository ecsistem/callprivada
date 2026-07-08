package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type AuditLog struct {
	ID        uuid.UUID  `json:"id"`
	AdminID   uuid.UUID  `json:"admin_id"`
	Action    string     `json:"action"`
	Target    string     `json:"target"`
	TargetID  *uuid.UUID `json:"target_id,omitempty"`
	Detail    string     `json:"detail"`
	CreatedAt time.Time  `json:"created_at"`
}

type AuditLogRepository interface {
	Create(ctx context.Context, log *AuditLog) error
	List(ctx context.Context, page, perPage int) ([]*AuditLog, int64, error)
}
