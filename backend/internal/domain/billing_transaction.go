package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type BillingTransaction struct {
	ID                   uuid.UUID
	CallID               uuid.UUID
	Gateway              string // "zuckpay" | "waymb"
	ZuckPayTxnID         string
	WayMBTxnID           string
	WayMBMethod          string // mbway | multibanco | bizum
	MultibancoEntity     string
	MultibancoReference  string
	MultibancoExpiresAt  int64
	AmountCents          int
	Status               string
	PayerName            string
	PayerDocument        string
	PayerEmail           string
	QRCode               string
	QRCodeURL            string
	CheckoutURL          string
	CreatedAt            time.Time
	UpdatedAt            time.Time
}

type PaymentStats struct {
	Generated   int64 `json:"generated"`
	Paid        int64 `json:"paid"`
	TotalCents  int64 `json:"total_cents"`
}

type BillingTransactionRepository interface {
	Create(ctx context.Context, t *BillingTransaction) error
	UpdateStatus(ctx context.Context, id uuid.UUID, status string) error
	UpdateZuckPayID(ctx context.Context, id uuid.UUID, zuckPayID string) error
	UpdateWayMBTxnID(ctx context.Context, id uuid.UUID, waymbID string) error
	FindByID(ctx context.Context, id uuid.UUID) (*BillingTransaction, error)
	FindByWayMBTxnID(ctx context.Context, waymbID string) (*BillingTransaction, error)
	UpdateWayMBMultibancoData(ctx context.Context, id uuid.UUID, entity, reference string, expiresAt int64) error
	GetStatsByUser(ctx context.Context, userID uuid.UUID, period, from, to string) (*PaymentStats, error)
}
