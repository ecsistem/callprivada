package domain

import (
	"time"

	"github.com/google/uuid"
)

type Plan struct {
	ID                  uuid.UUID  `json:"id"`
	Name                string     `json:"name"`
	PriceCents          int        `json:"price_cents"`
	Interval            string     `json:"interval"`
	AbacatePayProductID string     `json:"abacate_pay_product_id,omitempty"`
	Active              bool       `json:"active"`
	MaxCalls            int        `json:"max_calls"`
	MaxPresells         int        `json:"max_presells"`
	MaxVideos           int        `json:"max_videos"`
	CreatedAt           time.Time  `json:"created_at"`
	UpdatedAt           time.Time  `json:"updated_at"`
}

type PlanRepository interface {
	FindAll() ([]Plan, error)
	FindAllAdmin() ([]Plan, error)
	FindByID(id uuid.UUID) (*Plan, error)
	Create(p *Plan) error
	Update(p *Plan) error
}
