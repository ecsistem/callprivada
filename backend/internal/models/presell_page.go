package models

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/callprivada/fwlc-backend/internal/domain"
)

// presellConfigJSON lets GORM read/write PresellConfig as JSONB.
type presellConfigJSON domain.PresellConfig

func (c presellConfigJSON) Value() (driver.Value, error) {
	b, err := json.Marshal(c)
	return string(b), err
}

func (c *presellConfigJSON) Scan(value interface{}) error {
	var b []byte
	switch v := value.(type) {
	case []byte:
		b = v
	case string:
		b = []byte(v)
	default:
		return fmt.Errorf("presellConfigJSON: unsupported type %T", value)
	}
	return json.Unmarshal(b, c)
}

type PresellPage struct {
	ID           uuid.UUID         `gorm:"type:uuid;primaryKey"`
	UserID       uuid.UUID         `gorm:"type:uuid;not null;index"`
	CallID       *uuid.UUID        `gorm:"type:uuid;index"`
	Slug         string            `gorm:"uniqueIndex;not null"`
	Type         string            `gorm:"not null;default:'presell'"`
	TemplateSlug string            `gorm:"not null;default:'formal'"`
	Config       presellConfigJSON `gorm:"type:jsonb;not null;default:'{}'"`
	CTAClicks    int               `gorm:"not null;default:0"`
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

func (PresellPage) TableName() string { return "presell_pages" }

func (p PresellPage) ToDomain() *domain.PresellPage {
	t := p.Type
	if t == "" {
		t = domain.PresellTypePresell
	}
	return &domain.PresellPage{
		ID:           p.ID,
		UserID:       p.UserID,
		CallID:       p.CallID,
		Slug:         p.Slug,
		Type:         t,
		TemplateSlug: p.TemplateSlug,
		Config:       domain.PresellConfig(p.Config),
		CTAClicks:    p.CTAClicks,
		CreatedAt:    p.CreatedAt,
		UpdatedAt:    p.UpdatedAt,
	}
}

func PresellPageFromDomain(p *domain.PresellPage) PresellPage {
	t := p.Type
	if t == "" {
		t = domain.PresellTypePresell
	}
	return PresellPage{
		ID:           p.ID,
		UserID:       p.UserID,
		CallID:       p.CallID,
		Slug:         p.Slug,
		Type:         t,
		TemplateSlug: p.TemplateSlug,
		Config:       presellConfigJSON(p.Config),
		CreatedAt:    p.CreatedAt,
		UpdatedAt:    p.UpdatedAt,
	}
}
