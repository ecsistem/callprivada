package repositories

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/callprivada/fwlc-backend/internal/domain"
	"github.com/callprivada/fwlc-backend/internal/models"
)

type callEventRepository struct{ db *gorm.DB }

func NewCallEventRepository(db *gorm.DB) domain.CallEventRepository {
	return &callEventRepository{db: db}
}

func (r *callEventRepository) Create(ctx context.Context, e *domain.CallEvent) error {
	if e.ID == uuid.Nil {
		e.ID = uuid.New()
	}
	row := models.CallEventFromDomain(e)
	return r.db.WithContext(ctx).Create(&row).Error
}

func (r *callEventRepository) Update(ctx context.Context, e *domain.CallEvent) error {
	row := models.CallEventFromDomain(e)
	return r.db.WithContext(ctx).Save(&row).Error
}

func (r *callEventRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&models.CallEvent{}, "id = ?", id).Error
}

func (r *callEventRepository) FindByID(ctx context.Context, id uuid.UUID) (*domain.CallEvent, error) {
	var row models.CallEvent
	if err := r.db.WithContext(ctx).First(&row, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return row.ToDomain(), nil
}

func (r *callEventRepository) FindByCallID(ctx context.Context, callID uuid.UUID) ([]domain.CallEvent, error) {
	var rows []models.CallEvent
	if err := r.db.WithContext(ctx).
		Where("call_id = ?", callID).
		Order("trigger_at_seconds ASC").
		Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]domain.CallEvent, len(rows))
	for i, row := range rows {
		out[i] = *row.ToDomain()
	}
	return out, nil
}
