package models

import (
	"time"

	"github.com/google/uuid"

	"github.com/callprivada/fwlc-backend/internal/domain"
)

type Plan struct {
	ID                  uuid.UUID `gorm:"type:uuid;primaryKey"`
	Name                string    `gorm:"not null"`
	PriceCents          int       `gorm:"not null"`
	Interval            string    `gorm:"not null;default:'MONTHLY'"`
	AbacatePayProductID string `gorm:"column:abacatepay_product_id"`
	Active              bool      `gorm:"not null;default:true"`
	MaxCalls            int       `gorm:"not null;default:0"`
	MaxPresells         int       `gorm:"not null;default:0"`
	MaxVideos           int       `gorm:"not null;default:0"`
	CreatedAt           time.Time
	UpdatedAt           time.Time
}

func (Plan) TableName() string { return "plans" }

func (p Plan) ToDomain() domain.Plan {
	return domain.Plan{
		ID:                  p.ID,
		Name:                p.Name,
		PriceCents:          p.PriceCents,
		Interval:            p.Interval,
		AbacatePayProductID: p.AbacatePayProductID,
		Active:              p.Active,
		MaxCalls:            p.MaxCalls,
		MaxPresells:         p.MaxPresells,
		MaxVideos:           p.MaxVideos,
		CreatedAt:           p.CreatedAt,
		UpdatedAt:           p.UpdatedAt,
	}
}
