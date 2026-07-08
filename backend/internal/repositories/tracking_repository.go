package repositories

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/callprivada/fwlc-backend/internal/domain"
	"github.com/callprivada/fwlc-backend/internal/models"
)

type trackingRepository struct {
	db *gorm.DB
}

func NewTrackingRepository(db *gorm.DB) domain.TrackingConfigRepository {
	return &trackingRepository{db: db}
}

func (r *trackingRepository) Upsert(ctx context.Context, cfg *domain.UserTrackingConfig) error {
	if cfg.ID == uuid.Nil {
		cfg.ID = uuid.New()
	}
	m := models.TrackingConfigFromDomain(cfg)
	return r.db.WithContext(ctx).
		Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "user_id"}},
			DoUpdates: clause.AssignmentColumns([]string{
				"facebook_pixel_id", "tiktok_pixel_id", "google_analytics_id",
				"gtm_container_id", "utmify_token", "dracofy_token", "custom_head_script", "updated_at",
			}),
		}).
		Create(&m).Error
}

func (r *trackingRepository) FindByUserID(ctx context.Context, userID uuid.UUID) (*domain.UserTrackingConfig, error) {
	var m models.UserTrackingConfig
	err := r.db.WithContext(ctx).Where("user_id = ?", userID).First(&m).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return m.ToDomain(), nil
}
