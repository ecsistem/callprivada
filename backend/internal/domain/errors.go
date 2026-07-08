package domain

import "errors"

var (
	ErrNotFound           = errors.New("resource not found")
	ErrEmailAlreadyInUse  = errors.New("email already in use")
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrUserBlocked        = errors.New("user is blocked")
	ErrInvalidToken           = errors.New("invalid or expired token")
	ErrSubscriptionRequired   = errors.New("active subscription required")
	ErrAlreadySubscribed      = errors.New("user already has an active subscription")
	ErrFileTooLarge           = errors.New("file exceeds maximum allowed size")
	ErrUnsupportedMIME        = errors.New("unsupported file type")
	ErrVideoNotReady          = errors.New("video is not ready")
	ErrCallExpired            = errors.New("call has expired or is not active")
	ErrForbidden              = errors.New("access denied")
	ErrPaymentNotConfigured   = errors.New("payment gateway not configured for this account")
	ErrPlanLimitReached       = errors.New("plan limit reached")
)
