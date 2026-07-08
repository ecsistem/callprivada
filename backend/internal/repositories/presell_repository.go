package repositories

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/callprivada/fwlc-backend/internal/domain"
	"github.com/callprivada/fwlc-backend/internal/models"
)

type presellRepository struct{ db *gorm.DB }

func NewPresellRepository(db *gorm.DB) domain.PresellPageRepository {
	return &presellRepository{db: db}
}

func (r *presellRepository) Create(ctx context.Context, p *domain.PresellPage) error {
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	row := models.PresellPageFromDomain(p)
	if err := r.db.WithContext(ctx).Create(&row).Error; err != nil {
		return err
	}
	p.ID = row.ID
	p.CreatedAt = row.CreatedAt
	p.UpdatedAt = row.UpdatedAt
	return nil
}

func (r *presellRepository) Update(ctx context.Context, p *domain.PresellPage) error {
	row := models.PresellPageFromDomain(p)
	return r.db.WithContext(ctx).Save(&row).Error
}

func (r *presellRepository) Delete(ctx context.Context, id, userID uuid.UUID) error {
	return r.db.WithContext(ctx).
		Delete(&models.PresellPage{}, "id = ? AND user_id = ?", id, userID).Error
}

func (r *presellRepository) FindByID(ctx context.Context, id, userID uuid.UUID) (*domain.PresellPage, error) {
	var row models.PresellPage
	err := r.db.WithContext(ctx).
		First(&row, "id = ? AND user_id = ?", id, userID).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return row.ToDomain(), nil
}

func (r *presellRepository) FindBySlug(ctx context.Context, slug string) (*domain.PresellPage, error) {
	var row models.PresellPage
	err := r.db.WithContext(ctx).First(&row, "slug = ?", slug).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return row.ToDomain(), nil
}

func (r *presellRepository) FindByUserID(ctx context.Context, userID uuid.UUID, typeFilter string, page, perPage int) ([]domain.PresellPage, int64, error) {
	var rows []models.PresellPage
	var total int64

	q := r.db.WithContext(ctx).Model(&models.PresellPage{}).Where("user_id = ?", userID)
	if typeFilter != "" {
		q = q.Where("type = ?", typeFilter)
	}
	q.Count(&total)

	offset := (page - 1) * perPage
	qf := r.db.WithContext(ctx).Where("user_id = ?", userID)
	if typeFilter != "" {
		qf = qf.Where("type = ?", typeFilter)
	}
	err := qf.Order("created_at DESC").Offset(offset).Limit(perPage).Find(&rows).Error
	if err != nil {
		return nil, 0, err
	}

	out := make([]domain.PresellPage, len(rows))
	for i, row := range rows {
		out[i] = *row.ToDomain()
	}
	return out, total, nil
}

func (r *presellRepository) FindByCallID(ctx context.Context, callID uuid.UUID) ([]domain.PresellPage, error) {
	var rows []models.PresellPage
	err := r.db.WithContext(ctx).Where("call_id = ?", callID).Order("created_at DESC").Find(&rows).Error
	if err != nil {
		return nil, err
	}
	out := make([]domain.PresellPage, len(rows))
	for i, row := range rows {
		out[i] = *row.ToDomain()
	}
	return out, nil
}

func (r *presellRepository) CountByUserID(ctx context.Context, userID uuid.UUID) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&models.PresellPage{}).Where("user_id = ?", userID).Count(&count).Error
	return count, err
}

func (r *presellRepository) IncrementCTAClicks(ctx context.Context, slug string) error {
	return r.db.WithContext(ctx).Model(&models.PresellPage{}).
		Where("slug = ?", slug).
		UpdateColumn("cta_clicks", gorm.Expr("cta_clicks + 1")).Error
}

func (r *presellRepository) SlugExists(ctx context.Context, slug string) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&models.PresellPage{}).
		Where("slug = ?", slug).Count(&count).Error
	return count > 0, err
}
