package repositories

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/callprivada/fwlc-backend/internal/domain"
	"github.com/callprivada/fwlc-backend/internal/models"
)

type videoRepository struct{ db *gorm.DB }

func NewVideoRepository(db *gorm.DB) domain.VideoRepository {
	return &videoRepository{db: db}
}

func (r *videoRepository) Create(ctx context.Context, v *domain.Video) error {
	if v.ID == uuid.Nil {
		v.ID = uuid.New()
	}
	row := VideoFromDomain(v)
	return r.db.WithContext(ctx).Create(&row).Error
}

func (r *videoRepository) Update(ctx context.Context, v *domain.Video) error {
	row := VideoFromDomain(v)
	return r.db.WithContext(ctx).Save(&row).Error
}

func (r *videoRepository) FindByID(ctx context.Context, id uuid.UUID) (*domain.Video, error) {
	var row models.Video
	if err := r.db.WithContext(ctx).First(&row, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return row.ToDomain(), nil
}

func (r *videoRepository) FindByUserID(ctx context.Context, userID uuid.UUID) ([]domain.Video, error) {
	var rows []models.Video
	if err := r.db.WithContext(ctx).Where("user_id = ?", userID).Order("created_at DESC").Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]domain.Video, len(rows))
	for i, row := range rows {
		out[i] = *row.ToDomain()
	}
	return out, nil
}

func (r *videoRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&models.Video{}, "id = ?", id).Error
}

func VideoFromDomain(v *domain.Video) models.Video {
	return models.Video{
		ID:              v.ID,
		UserID:          v.UserID,
		StorageKey:      v.StorageKey,
		OriginalName:    v.OriginalName,
		MimeType:        v.MimeType,
		SizeBytes:       v.SizeBytes,
		DurationSeconds: v.DurationSeconds,
		Status:          v.Status,
		CreatedAt:       v.CreatedAt,
		UpdatedAt:       v.UpdatedAt,
	}
}
