package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type Visit struct {
	ID             uuid.UUID
	CallID         uuid.UUID
	IP             string
	Country        string
	City           string
	DeviceType     string
	Browser        string
	OS             string
	Referrer       string
	WatchedSeconds int
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

// CallAnalytics é o resultado agregado para a tela de analytics de uma chamada.
type CallAnalytics struct {
	CallID       uuid.UUID          `json:"call_id"`
	TotalVisits  int64              `json:"total_visits"`
	AvgWatched   int64              `json:"avg_watched"`
	Devices      map[string]int64   `json:"devices"`
	Browsers     map[string]int64   `json:"browsers"`
	OSList       map[string]int64   `json:"os_list"`
	TopReferrers []ReferrerCount    `json:"top_referrers"`
}

type ReferrerCount struct {
	Source string `json:"source"`
	Count  int64  `json:"count"`
}

type VisitRepository interface {
	Create(ctx context.Context, v *Visit) error
	UpdateWatched(ctx context.Context, id uuid.UUID, seconds int) error
	FindByID(ctx context.Context, id uuid.UUID) (*Visit, error)
	Analytics(ctx context.Context, callID uuid.UUID) (*CallAnalytics, error)
	CountByCallIDs(ctx context.Context, callIDs []uuid.UUID) (int64, error)
}
