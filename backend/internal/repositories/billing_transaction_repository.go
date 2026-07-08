package repositories

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/callprivada/fwlc-backend/internal/domain"
	"github.com/callprivada/fwlc-backend/internal/models"
)

type billingTransactionRepository struct {
	db *gorm.DB
}

func NewBillingTransactionRepository(db *gorm.DB) domain.BillingTransactionRepository {
	return &billingTransactionRepository{db: db}
}

func (r *billingTransactionRepository) Create(ctx context.Context, t *domain.BillingTransaction) error {
	if t.ID == uuid.Nil {
		t.ID = uuid.New()
	}
	m := models.BillingTxnFromDomain(t)
	return r.db.WithContext(ctx).Create(&m).Error
}

func (r *billingTransactionRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status string) error {
	return r.db.WithContext(ctx).
		Model(&models.BillingTransaction{}).
		Where("id = ?", id).
		Updates(map[string]any{"status": status}).Error
}

func (r *billingTransactionRepository) FindByID(ctx context.Context, id uuid.UUID) (*domain.BillingTransaction, error) {
	var m models.BillingTransaction
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&m).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return m.ToDomain(), nil
}
