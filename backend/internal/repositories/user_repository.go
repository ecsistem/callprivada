package repositories

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/callprivada/fwlc-backend/internal/domain"
	"github.com/callprivada/fwlc-backend/internal/models"
)

type userRepository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) domain.UserRepository {
	return &userRepository{db: db}
}

func (r *userRepository) Create(ctx context.Context, user *domain.User) error {
	m := models.UserFromDomain(user)
	if err := r.db.WithContext(ctx).Create(m).Error; err != nil {
		return err
	}
	*user = *m.ToDomain()
	return nil
}

func (r *userRepository) Update(ctx context.Context, user *domain.User) error {
	m := models.UserFromDomain(user)
	return r.db.WithContext(ctx).Save(m).Error
}

func (r *userRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&models.User{}, "id = ?", id).Error
}

func (r *userRepository) FindByID(ctx context.Context, id uuid.UUID) (*domain.User, error) {
	var m models.User
	if err := r.db.WithContext(ctx).First(&m, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return m.ToDomain(), nil
}

func (r *userRepository) FindByEmail(ctx context.Context, email string) (*domain.User, error) {
	var m models.User
	if err := r.db.WithContext(ctx).First(&m, "email = ?", email).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return m.ToDomain(), nil
}

func (r *userRepository) FindAll(ctx context.Context, page, perPage int, search string) ([]*domain.User, int64, error) {
	var ms []models.User
	var total int64

	q := r.db.WithContext(ctx).Model(&models.User{})
	if search != "" {
		like := "%" + search + "%"
		q = q.Where("name ILIKE ? OR email ILIKE ?", like, like)
	}
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	offset := (page - 1) * perPage
	if err := q.Order("created_at DESC").Offset(offset).Limit(perPage).Find(&ms).Error; err != nil {
		return nil, 0, err
	}
	out := make([]*domain.User, len(ms))
	for i := range ms {
		out[i] = ms[i].ToDomain()
	}
	return out, total, nil
}

func (r *userRepository) SetBlocked(ctx context.Context, id uuid.UUID, blocked bool) error {
	return r.db.WithContext(ctx).Model(&models.User{}).Where("id = ?", id).
		Update("is_blocked", blocked).Error
}

func (r *userRepository) CountAll(ctx context.Context) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&models.User{}).Count(&count).Error
	return count, err
}
