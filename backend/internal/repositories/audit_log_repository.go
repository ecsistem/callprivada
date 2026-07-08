package repositories

import (
	"context"

	"gorm.io/gorm"

	"github.com/callprivada/fwlc-backend/internal/domain"
	"github.com/callprivada/fwlc-backend/internal/models"
)

type auditLogRepository struct{ db *gorm.DB }

func NewAuditLogRepository(db *gorm.DB) domain.AuditLogRepository {
	return &auditLogRepository{db: db}
}

func (r *auditLogRepository) Create(ctx context.Context, log *domain.AuditLog) error {
	m := &models.AuditLog{
		AdminID:  log.AdminID,
		Action:   log.Action,
		Target:   log.Target,
		TargetID: log.TargetID,
		Detail:   log.Detail,
	}
	if err := r.db.WithContext(ctx).Create(m).Error; err != nil {
		return err
	}
	log.ID = m.ID
	log.CreatedAt = m.CreatedAt
	return nil
}

func (r *auditLogRepository) List(ctx context.Context, page, perPage int) ([]*domain.AuditLog, int64, error) {
	var ms []models.AuditLog
	var total int64

	if err := r.db.WithContext(ctx).Model(&models.AuditLog{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}
	offset := (page - 1) * perPage
	if err := r.db.WithContext(ctx).Order("created_at DESC").Offset(offset).Limit(perPage).Find(&ms).Error; err != nil {
		return nil, 0, err
	}
	out := make([]*domain.AuditLog, len(ms))
	for i := range ms {
		out[i] = ms[i].ToDomain()
	}
	return out, total, nil
}
