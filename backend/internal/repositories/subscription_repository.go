package repositories

import (
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/callprivada/fwlc-backend/internal/domain"
	"github.com/callprivada/fwlc-backend/internal/models"
)

type subscriptionRepository struct{ db *gorm.DB }

func NewSubscriptionRepository(db *gorm.DB) domain.SubscriptionRepository {
	return &subscriptionRepository{db: db}
}

func (r *subscriptionRepository) Create(sub *domain.Subscription) error {
	if sub.ID == uuid.Nil {
		sub.ID = uuid.New()
	}
	row := models.SubscriptionFromDomain(*sub)
	return r.db.Create(&row).Error
}

func (r *subscriptionRepository) Update(sub *domain.Subscription) error {
	row := models.SubscriptionFromDomain(*sub)
	return r.db.Save(&row).Error
}

func (r *subscriptionRepository) FindByID(id uuid.UUID) (*domain.Subscription, error) {
	var row models.Subscription
	if err := r.db.First(&row, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	s := row.ToDomain()
	return &s, nil
}

func (r *subscriptionRepository) FindActiveByUserID(userID uuid.UUID) (*domain.Subscription, error) {
	var row models.Subscription
	err := r.db.Where("user_id = ? AND status = ?", userID, domain.SubscriptionStatusActive).
		Order("created_at DESC").First(&row).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	s := row.ToDomain()
	return &s, nil
}

func (r *subscriptionRepository) FindByAbacatePayID(abacatePayID string) (*domain.Subscription, error) {
	var row models.Subscription
	err := r.db.Where("abacatepay_subscription_id = ?", abacatePayID).First(&row).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	s := row.ToDomain()
	return &s, nil
}

func (r *subscriptionRepository) FindAll(page, perPage int) ([]*domain.Subscription, int64, error) {
	var rows []models.Subscription
	var total int64

	if err := r.db.Model(&models.Subscription{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}
	offset := (page - 1) * perPage
	if err := r.db.Order("created_at DESC").Offset(offset).Limit(perPage).Find(&rows).Error; err != nil {
		return nil, 0, err
	}
	out := make([]*domain.Subscription, len(rows))
	for i := range rows {
		s := rows[i].ToDomain()
		out[i] = &s
	}
	return out, total, nil
}

func (r *subscriptionRepository) FindAllWithEmail(page, perPage int) ([]*domain.SubscriptionWithEmail, int64, error) {
	var total int64
	if err := r.db.Model(&models.Subscription{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}
	offset := (page - 1) * perPage

	type row struct {
		models.Subscription
		UserEmail string
		UserName  string
	}
	var rows []row
	if err := r.db.Table("subscriptions s").
		Select("s.*, u.email as user_email, u.name as user_name").
		Joins("JOIN users u ON u.id = s.user_id").
		Order("s.created_at DESC").
		Offset(offset).Limit(perPage).
		Scan(&rows).Error; err != nil {
		return nil, 0, err
	}
	out := make([]*domain.SubscriptionWithEmail, len(rows))
	for i, r := range rows {
		s := r.Subscription.ToDomain()
		out[i] = &domain.SubscriptionWithEmail{Subscription: s, UserEmail: r.UserEmail, UserName: r.UserName}
	}
	return out, total, nil
}

func (r *subscriptionRepository) CountActive() (int64, error) {
	var count int64
	err := r.db.Model(&models.Subscription{}).Where("status = ?", domain.SubscriptionStatusActive).Count(&count).Error
	return count, err
}
