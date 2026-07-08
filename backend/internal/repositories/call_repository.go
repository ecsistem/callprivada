package repositories

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/callprivada/fwlc-backend/internal/domain"
	"github.com/callprivada/fwlc-backend/internal/models"
)

type callRepository struct{ db *gorm.DB }

func NewCallRepository(db *gorm.DB) domain.CallRepository {
	return &callRepository{db: db}
}

func (r *callRepository) Create(ctx context.Context, c *domain.Call) error {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	row := models.CallFromDomain(c)
	return r.db.WithContext(ctx).Create(&row).Error
}

func (r *callRepository) Update(ctx context.Context, c *domain.Call) error {
	row := models.CallFromDomain(c)
	return r.db.WithContext(ctx).Save(&row).Error
}

func (r *callRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&models.Call{}, "id = ?", id).Error
}

func (r *callRepository) FindByID(ctx context.Context, id uuid.UUID) (*domain.Call, error) {
	var row models.Call
	if err := r.db.WithContext(ctx).First(&row, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return row.ToDomain(), nil
}

func (r *callRepository) FindBySlug(ctx context.Context, slug string) (*domain.Call, error) {
	var row models.Call
	if err := r.db.WithContext(ctx).First(&row, "slug = ?", slug).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return row.ToDomain(), nil
}

func (r *callRepository) FindByUserID(ctx context.Context, userID uuid.UUID, page, perPage int) ([]domain.Call, int64, error) {
	var rows []models.Call
	var total int64

	q := r.db.WithContext(ctx).Model(&models.Call{}).Where("user_id = ?", userID)
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * perPage
	if err := q.Order("created_at DESC").Offset(offset).Limit(perPage).Find(&rows).Error; err != nil {
		return nil, 0, err
	}

	out := make([]domain.Call, len(rows))
	for i, row := range rows {
		out[i] = *row.ToDomain()
	}
	return out, total, nil
}

func (r *callRepository) SlugExists(ctx context.Context, slug string) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&models.Call{}).Where("slug = ?", slug).Count(&count).Error
	return count > 0, err
}

func (r *callRepository) FindAllAdmin(ctx context.Context, page, perPage int) ([]domain.Call, int64, error) {
	var ms []models.Call
	var total int64

	if err := r.db.WithContext(ctx).Model(&models.Call{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}
	offset := (page - 1) * perPage
	if err := r.db.WithContext(ctx).Order("created_at DESC").Offset(offset).Limit(perPage).Find(&ms).Error; err != nil {
		return nil, 0, err
	}
	out := make([]domain.Call, len(ms))
	for i := range ms {
		out[i] = *ms[i].ToDomain()
	}
	return out, total, nil
}

func (r *callRepository) CountAll(ctx context.Context) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&models.Call{}).Count(&count).Error
	return count, err
}

func (r *callRepository) CountByUserID(ctx context.Context, userID uuid.UUID) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&models.Call{}).Where("user_id = ?", userID).Count(&count).Error
	return count, err
}
