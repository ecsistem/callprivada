package services

import (
	"context"

	"github.com/google/uuid"

	"github.com/callprivada/fwlc-backend/internal/domain"
	"github.com/callprivada/fwlc-backend/internal/utils"
)

type UserService struct {
	users    domain.UserRepository
	sessions domain.SessionRepository
}

func NewUserService(users domain.UserRepository, sessions domain.SessionRepository) *UserService {
	return &UserService{users: users, sessions: sessions}
}

func (s *UserService) GetByID(ctx context.Context, id uuid.UUID) (*domain.User, error) {
	return s.users.FindByID(ctx, id)
}

func (s *UserService) UpdateProfile(ctx context.Context, id uuid.UUID, name string, newPassword string) (*domain.User, error) {
	user, err := s.users.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if name != "" {
		user.Name = name
	}
	if newPassword != "" {
		hash, err := utils.HashPassword(newPassword)
		if err != nil {
			return nil, err
		}
		user.PasswordHash = hash
	}

	if err := s.users.Update(ctx, user); err != nil {
		return nil, err
	}
	return user, nil
}

func (s *UserService) DeleteAccount(ctx context.Context, id uuid.UUID) error {
	if err := s.sessions.RevokeAllForUser(ctx, id); err != nil {
		return err
	}
	return s.users.Delete(ctx, id)
}
