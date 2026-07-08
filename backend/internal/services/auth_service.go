package services

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"

	"github.com/callprivada/fwlc-backend/internal/domain"
	"github.com/callprivada/fwlc-backend/internal/utils"
)

type AuthService struct {
	users         domain.UserRepository
	sessions      domain.SessionRepository
	resetTokens   domain.PasswordResetTokenRepository
	jwt           *JWTService
	refreshTTL    time.Duration
	resetTokenTTL time.Duration
}

func NewAuthService(
	users domain.UserRepository,
	sessions domain.SessionRepository,
	resetTokens domain.PasswordResetTokenRepository,
	jwt *JWTService,
	refreshTTL time.Duration,
) *AuthService {
	return &AuthService{
		users:         users,
		sessions:      sessions,
		resetTokens:   resetTokens,
		jwt:           jwt,
		refreshTTL:    refreshTTL,
		resetTokenTTL: time.Hour,
	}
}

type AuthResult struct {
	User         *domain.User
	AccessToken  string
	RefreshToken string
	ExpiresAt    time.Time
}

type RequestMeta struct {
	UserAgent string
	IP        string
}

func (s *AuthService) Register(ctx context.Context, name, email, password string, meta RequestMeta) (*AuthResult, error) {
	existing, err := s.users.FindByEmail(ctx, email)
	if err != nil && !errors.Is(err, domain.ErrNotFound) {
		return nil, err
	}
	if existing != nil {
		return nil, domain.ErrEmailAlreadyInUse
	}

	hash, err := utils.HashPassword(password)
	if err != nil {
		return nil, err
	}

	user := &domain.User{
		ID:           uuid.New(),
		Name:         name,
		Email:        email,
		PasswordHash: hash,
		Role:         domain.RoleUser,
		IsBlocked:    true, // pending admin approval
	}
	if err := s.users.Create(ctx, user); err != nil {
		return nil, err
	}

	return nil, domain.ErrPendingApproval
}

func (s *AuthService) Login(ctx context.Context, email, password string, meta RequestMeta) (*AuthResult, error) {
	user, err := s.users.FindByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return nil, domain.ErrInvalidCredentials
		}
		return nil, err
	}
	if !utils.CheckPassword(user.PasswordHash, password) {
		return nil, domain.ErrInvalidCredentials
	}
	if user.IsBlocked {
		return nil, domain.ErrUserBlocked
	}

	return s.issueTokens(ctx, user, meta)
}

func (s *AuthService) Refresh(ctx context.Context, refreshToken string, meta RequestMeta) (*AuthResult, error) {
	hash := utils.HashToken(refreshToken)
	session, err := s.sessions.FindByRefreshTokenHash(ctx, hash)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return nil, domain.ErrInvalidToken
		}
		return nil, err
	}
	if !session.IsValid(time.Now()) {
		return nil, domain.ErrInvalidToken
	}

	user, err := s.users.FindByID(ctx, session.UserID)
	if err != nil {
		return nil, err
	}
	if user.IsBlocked {
		return nil, domain.ErrUserBlocked
	}

	// rotação: revoga a sessão usada e emite um novo par de tokens.
	if err := s.sessions.Revoke(ctx, session.ID); err != nil {
		return nil, err
	}

	return s.issueTokens(ctx, user, meta)
}

func (s *AuthService) Logout(ctx context.Context, refreshToken string) error {
	hash := utils.HashToken(refreshToken)
	session, err := s.sessions.FindByRefreshTokenHash(ctx, hash)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return nil
		}
		return err
	}
	return s.sessions.Revoke(ctx, session.ID)
}

func (s *AuthService) ForgotPassword(ctx context.Context, email string) (plainToken string, err error) {
	user, err := s.users.FindByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			// não revela se o e-mail existe ou não.
			return "", nil
		}
		return "", err
	}

	plain, err := utils.NewOpaqueToken()
	if err != nil {
		return "", err
	}

	token := &domain.PasswordResetToken{
		ID:        uuid.New(),
		UserID:    user.ID,
		TokenHash: utils.HashToken(plain),
		ExpiresAt: time.Now().Add(s.resetTokenTTL),
	}
	if err := s.resetTokens.Create(ctx, token); err != nil {
		return "", err
	}

	// Envio de e-mail real é uma pendência de infra (ver docs/DECISIONS.md).
	// Por ora, o token em texto puro é apenas retornado para quem chamou o
	// serviço (o handler decide o que fazer — hoje, loga em vez de enviar e-mail).
	return plain, nil
}

func (s *AuthService) ResetPassword(ctx context.Context, plainToken, newPassword string) error {
	hash := utils.HashToken(plainToken)
	token, err := s.resetTokens.FindByTokenHash(ctx, hash)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return domain.ErrInvalidToken
		}
		return err
	}
	if !token.IsValid(time.Now()) {
		return domain.ErrInvalidToken
	}

	user, err := s.users.FindByID(ctx, token.UserID)
	if err != nil {
		return err
	}

	newHash, err := utils.HashPassword(newPassword)
	if err != nil {
		return err
	}
	user.PasswordHash = newHash
	if err := s.users.Update(ctx, user); err != nil {
		return err
	}

	if err := s.resetTokens.MarkUsed(ctx, token.ID); err != nil {
		return err
	}

	return s.sessions.RevokeAllForUser(ctx, user.ID)
}

func (s *AuthService) issueTokens(ctx context.Context, user *domain.User, meta RequestMeta) (*AuthResult, error) {
	accessToken, expiresAt, err := s.jwt.GenerateAccessToken(user.ID, user.Role)
	if err != nil {
		return nil, err
	}

	refreshPlain, err := utils.NewOpaqueToken()
	if err != nil {
		return nil, err
	}

	session := &domain.Session{
		ID:               uuid.New(),
		UserID:           user.ID,
		RefreshTokenHash: utils.HashToken(refreshPlain),
		UserAgent:        meta.UserAgent,
		IP:               meta.IP,
		ExpiresAt:        time.Now().Add(s.refreshTTL),
	}
	if err := s.sessions.Create(ctx, session); err != nil {
		return nil, err
	}

	return &AuthResult{
		User:         user,
		AccessToken:  accessToken,
		RefreshToken: refreshPlain,
		ExpiresAt:    expiresAt,
	}, nil
}
