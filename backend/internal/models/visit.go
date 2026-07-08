package models

import (
	"time"

	"github.com/google/uuid"

	"github.com/callprivada/fwlc-backend/internal/domain"
)

type Visit struct {
	ID             uuid.UUID `gorm:"type:uuid;primaryKey"`
	CallID         uuid.UUID `gorm:"type:uuid;not null;index"`
	IP             string    `gorm:"not null;default:''"`
	Country        string    `gorm:"not null;default:''"`
	City           string    `gorm:"not null;default:''"`
	DeviceType     string    `gorm:"not null;default:''"`
	Browser        string    `gorm:"not null;default:''"`
	OS             string    `gorm:"not null;default:''"`
	Referrer       string    `gorm:"not null;default:''"`
	WatchedSeconds int       `gorm:"not null;default:0"`
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

func (Visit) TableName() string { return "visits" }

func (m Visit) ToDomain() *domain.Visit {
	return &domain.Visit{
		ID:             m.ID,
		CallID:         m.CallID,
		IP:             m.IP,
		Country:        m.Country,
		City:           m.City,
		DeviceType:     m.DeviceType,
		Browser:        m.Browser,
		OS:             m.OS,
		Referrer:       m.Referrer,
		WatchedSeconds: m.WatchedSeconds,
		CreatedAt:      m.CreatedAt,
		UpdatedAt:      m.UpdatedAt,
	}
}
