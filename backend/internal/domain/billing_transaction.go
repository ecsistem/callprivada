package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type BillingTransaction struct {
	ID            uuid.UUID
	CallID        uuid.UUID
	ZuckPayTxnID  string
	AmountCents   int
	Status        string
	PayerName     string
	PayerDocument string
	PayerEmail    string
	QRCode        string
	QRCodeURL     string
	CheckoutURL   string
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

type BillingTransactionRepository interface {
	Create(ctx context.Context, t *BillingTransaction) error
	UpdateStatus(ctx context.Context, id uuid.UUID, status string) error
	FindByID(ctx context.Context, id uuid.UUID) (*BillingTransaction, error)
}
