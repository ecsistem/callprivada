package repositories

import (
	"context"
	"errors"
	"time"

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

func (r *billingTransactionRepository) UpdateZuckPayID(ctx context.Context, id uuid.UUID, zuckPayID string) error {
	return r.db.WithContext(ctx).
		Model(&models.BillingTransaction{}).
		Where("id = ?", id).
		Updates(map[string]any{"zuckpay_txn_id": zuckPayID}).Error
}

func (r *billingTransactionRepository) UpdateWayMBTxnID(ctx context.Context, id uuid.UUID, waymbID string) error {
	return r.db.WithContext(ctx).
		Model(&models.BillingTransaction{}).
		Where("id = ?", id).
		Updates(map[string]any{"waymb_txn_id": waymbID}).Error
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

func (r *billingTransactionRepository) UpdateWayMBMultibancoData(ctx context.Context, id uuid.UUID, entity, reference string, expiresAt int64) error {
	return r.db.WithContext(ctx).
		Model(&models.BillingTransaction{}).
		Where("id = ?", id).
		Updates(map[string]any{
			"multibanco_entity":     entity,
			"multibanco_reference":  reference,
			"multibanco_expires_at": expiresAt,
		}).Error
}

func (r *billingTransactionRepository) FindByWayMBTxnID(ctx context.Context, waymbID string) (*domain.BillingTransaction, error) {
	var m models.BillingTransaction
	err := r.db.WithContext(ctx).Where("waymb_txn_id = ?", waymbID).First(&m).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return m.ToDomain(), nil
}

func (r *billingTransactionRepository) GetStatsByUser(ctx context.Context, userID uuid.UUID, period, from, to string) (*domain.PaymentStats, error) {
	var since, until time.Time
	now := time.Now().UTC()
	switch period {
	case "day":
		since = time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	case "month":
		since = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
	case "year":
		since = time.Date(now.Year(), 1, 1, 0, 0, 0, 0, time.UTC)
	case "custom":
		if from != "" {
			if t, err := time.Parse("2006-01-02", from); err == nil {
				since = t.UTC()
			}
		}
		if to != "" {
			if t, err := time.Parse("2006-01-02", to); err == nil {
				until = t.Add(24*time.Hour - time.Second).UTC()
			}
		}
	default:
		since = time.Time{} // all time
	}

	base := r.db.WithContext(ctx).
		Table("billing_transactions bt").
		Joins("JOIN calls c ON c.id = bt.call_id").
		Where("c.user_id = ?", userID)

	if !since.IsZero() {
		base = base.Where("bt.created_at >= ?", since)
	}
	if !until.IsZero() {
		base = base.Where("bt.created_at <= ?", until)
	}

	var generated int64
	if err := base.Count(&generated).Error; err != nil {
		return nil, err
	}

	type paidResult struct {
		Count      int64
		TotalCents int64
	}
	var pr paidResult
	if err := base.Where("bt.status = 'PAID'").
		Select("COUNT(*) as count, COALESCE(SUM(bt.amount_cents), 0) as total_cents").
		Scan(&pr).Error; err != nil {
		return nil, err
	}

	return &domain.PaymentStats{
		Generated:  generated,
		Paid:       pr.Count,
		TotalCents: pr.TotalCents,
	}, nil
}
