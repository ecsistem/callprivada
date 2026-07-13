package repositories

import (
	"context"
	"errors"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/callprivada/fwlc-backend/internal/domain"
	"github.com/callprivada/fwlc-backend/internal/models"
)

type settingsRepository struct {
	db *gorm.DB
}

func NewSettingsRepository(db *gorm.DB) domain.AppSettingsRepository {
	return &settingsRepository{db: db}
}

func (r *settingsRepository) Get(ctx context.Context, key string) (string, error) {
	var m models.AppSetting
	err := r.db.WithContext(ctx).Where("key = ?", key).First(&m).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return "", nil
	}
	if err != nil {
		return "", err
	}
	return m.Value, nil
}

func (r *settingsRepository) GetAll(ctx context.Context) (map[string]string, error) {
	var rows []models.AppSetting
	if err := r.db.WithContext(ctx).Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make(map[string]string, len(rows))
	for _, m := range rows {
		out[m.Key] = m.Value
	}
	return out, nil
}

func (r *settingsRepository) Set(ctx context.Context, key, value string) error {
	m := models.AppSetting{Key: key, Value: value, UpdatedAt: time.Now().UTC()}
	return r.db.WithContext(ctx).
		Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "key"}},
			DoUpdates: clause.AssignmentColumns([]string{"value", "updated_at"}),
		}).
		Create(&m).Error
}
