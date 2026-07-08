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

type passwordResetTokenRepository struct {
	db *gorm.DB
}

func NewPasswordResetTokenRepository(db *gorm.DB) domain.PasswordResetTokenRepository {
	return &passwordResetTokenRepository{db: db}
}

func (r *passwordResetTokenRepository) Create(ctx context.Context, token *domain.PasswordResetToken) error {
	m := models.PasswordResetTokenFromDomain(token)
	if err := r.db.WithContext(ctx).Create(m).Error; err != nil {
		return err
	}
	*token = *m.ToDomain()
	return nil
}

func (r *passwordResetTokenRepository) FindByTokenHash(ctx context.Context, hash string) (*domain.PasswordResetToken, error) {
	var m models.PasswordResetToken
	if err := r.db.WithContext(ctx).First(&m, "token_hash = ?", hash).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return m.ToDomain(), nil
}

func (r *passwordResetTokenRepository) MarkUsed(ctx context.Context, id uuid.UUID) error {
	now := time.Now()
	return r.db.WithContext(ctx).Model(&models.PasswordResetToken{}).
		Where("id = ?", id).
		Update("used_at", now).Error
}
