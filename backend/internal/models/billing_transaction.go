package models

import (
	"time"

	"github.com/google/uuid"

	"github.com/callprivada/fwlc-backend/internal/domain"
)

type BillingTransaction struct {
	ID                  uuid.UUID `gorm:"type:uuid;primaryKey"`
	CallID              uuid.UUID `gorm:"type:uuid;not null;index"`
	Gateway             string    `gorm:"not null;default:'zuckpay'"`
	ZuckPayTxnID        string    `gorm:"column:zuckpay_txn_id;not null;default:''"`
	WayMBTxnID          string    `gorm:"column:waymb_txn_id;not null;default:''"`
	WayMBMethod         string    `gorm:"column:waymb_method;not null;default:''"`
	MultibancoEntity    string    `gorm:"column:multibanco_entity;not null;default:''"`
	MultibancoReference string    `gorm:"column:multibanco_reference;not null;default:''"`
	MultibancoExpiresAt int64     `gorm:"column:multibanco_expires_at;not null;default:0"`
	AmountCents         int       `gorm:"not null"`
	Status              string    `gorm:"not null;default:'PENDING'"`
	PayerName           string    `gorm:"not null;default:''"`
	PayerDocument       string    `gorm:"not null;default:''"`
	PayerEmail          string    `gorm:"not null;default:''"`
	QRCode              string    `gorm:"not null;default:''"`
	QRCodeURL           string    `gorm:"not null;default:''"`
	CheckoutURL         string    `gorm:"not null;default:''"`
	CreatedAt           time.Time
	UpdatedAt           time.Time
}

func (BillingTransaction) TableName() string { return "billing_transactions" }

func (m BillingTransaction) ToDomain() *domain.BillingTransaction {
	return &domain.BillingTransaction{
		ID:                  m.ID,
		CallID:              m.CallID,
		Gateway:             m.Gateway,
		ZuckPayTxnID:        m.ZuckPayTxnID,
		WayMBTxnID:          m.WayMBTxnID,
		WayMBMethod:         m.WayMBMethod,
		MultibancoEntity:    m.MultibancoEntity,
		MultibancoReference: m.MultibancoReference,
		MultibancoExpiresAt: m.MultibancoExpiresAt,
		AmountCents:         m.AmountCents,
		Status:              m.Status,
		PayerName:           m.PayerName,
		PayerDocument:       m.PayerDocument,
		PayerEmail:          m.PayerEmail,
		QRCode:              m.QRCode,
		QRCodeURL:           m.QRCodeURL,
		CheckoutURL:         m.CheckoutURL,
		CreatedAt:           m.CreatedAt,
		UpdatedAt:           m.UpdatedAt,
	}
}

func BillingTxnFromDomain(t *domain.BillingTransaction) BillingTransaction {
	return BillingTransaction{
		ID:                  t.ID,
		CallID:              t.CallID,
		Gateway:             t.Gateway,
		ZuckPayTxnID:        t.ZuckPayTxnID,
		WayMBTxnID:          t.WayMBTxnID,
		WayMBMethod:         t.WayMBMethod,
		MultibancoEntity:    t.MultibancoEntity,
		MultibancoReference: t.MultibancoReference,
		MultibancoExpiresAt: t.MultibancoExpiresAt,
		AmountCents:         t.AmountCents,
		Status:              t.Status,
		PayerName:           t.PayerName,
		PayerDocument:       t.PayerDocument,
		PayerEmail:          t.PayerEmail,
		QRCode:              t.QRCode,
		QRCodeURL:           t.QRCodeURL,
		CheckoutURL:         t.CheckoutURL,
		CreatedAt:           t.CreatedAt,
		UpdatedAt:           t.UpdatedAt,
	}
}
