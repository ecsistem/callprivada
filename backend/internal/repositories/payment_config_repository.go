package repositories

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/callprivada/fwlc-backend/internal/domain"
	"github.com/callprivada/fwlc-backend/internal/models"
)

type paymentConfigRepository struct {
	db *gorm.DB
}

func NewPaymentConfigRepository(db *gorm.DB) domain.PaymentConfigRepository {
	return &paymentConfigRepository{db: db}
}

func (r *paymentConfigRepository) Upsert(ctx context.Context, cfg *domain.UserPaymentConfig) error {
	var existing models.UserPaymentConfig
	err := r.db.WithContext(ctx).Where("user_id = ?", cfg.UserID).First(&existing).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		if cfg.ID == uuid.Nil {
			cfg.ID = uuid.New()
		}
		m := models.PaymentConfigFromDomain(cfg)
		return r.db.WithContext(ctx).Create(&m).Error
	}
	if err != nil {
		return err
	}
	return r.db.WithContext(ctx).Model(&existing).Updates(map[string]interface{}{
		"zuckpay_client_id":     cfg.ZuckPayClientID,
		"zuckpay_client_secret": cfg.ZuckPayClientSecret,
	}).Error
}

func (r *paymentConfigRepository) FindByUserID(ctx context.Context, userID uuid.UUID) (*domain.UserPaymentConfig, error) {
	var m models.UserPaymentConfig
	err := r.db.WithContext(ctx).Where("user_id = ?", userID).First(&m).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return m.ToDomain(), nil
}
