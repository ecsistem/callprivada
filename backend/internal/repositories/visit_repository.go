package repositories

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/callprivada/fwlc-backend/internal/domain"
	"github.com/callprivada/fwlc-backend/internal/models"
)

type visitRepository struct {
	db *gorm.DB
}

func NewVisitRepository(db *gorm.DB) domain.VisitRepository {
	return &visitRepository{db: db}
}

func (r *visitRepository) Create(ctx context.Context, v *domain.Visit) error {
	if v.ID == uuid.Nil {
		v.ID = uuid.New()
	}
	m := models.Visit{
		ID:         v.ID,
		CallID:     v.CallID,
		IP:         v.IP,
		Country:    v.Country,
		City:       v.City,
		DeviceType: v.DeviceType,
		Browser:    v.Browser,
		OS:         v.OS,
		Referrer:   v.Referrer,
	}
	return r.db.WithContext(ctx).Create(&m).Error
}

func (r *visitRepository) UpdateWatched(ctx context.Context, id uuid.UUID, seconds int) error {
	return r.db.WithContext(ctx).
		Model(&models.Visit{}).
		Where("id = ?", id).
		Updates(map[string]any{"watched_seconds": seconds}).Error
}

func (r *visitRepository) FindByID(ctx context.Context, id uuid.UUID) (*domain.Visit, error) {
	var m models.Visit
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&m).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return m.ToDomain(), nil
}

func (r *visitRepository) Analytics(ctx context.Context, callID uuid.UUID) (*domain.CallAnalytics, error) {
	type countRow struct {
		Key   string
		Count int64
	}

	var totalVisits int64
	r.db.WithContext(ctx).Model(&models.Visit{}).Where("call_id = ?", callID).Count(&totalVisits)

	var avgRow struct{ Avg float64 }
	r.db.WithContext(ctx).
		Model(&models.Visit{}).
		Select("COALESCE(AVG(watched_seconds),0) as avg").
		Where("call_id = ?", callID).
		Scan(&avgRow)

	devices := make(map[string]int64)
	var deviceRows []countRow
	r.db.WithContext(ctx).
		Model(&models.Visit{}).
		Select("device_type as key, COUNT(*) as count").
		Where("call_id = ? AND device_type != ''", callID).
		Group("device_type").
		Scan(&deviceRows)
	for _, row := range deviceRows {
		devices[row.Key] = row.Count
	}

	browsers := make(map[string]int64)
	var browserRows []countRow
	r.db.WithContext(ctx).
		Model(&models.Visit{}).
		Select("browser as key, COUNT(*) as count").
		Where("call_id = ? AND browser != ''", callID).
		Group("browser").
		Scan(&browserRows)
	for _, row := range browserRows {
		browsers[row.Key] = row.Count
	}

	osList := make(map[string]int64)
	var osRows []countRow
	r.db.WithContext(ctx).
		Model(&models.Visit{}).
		Select("os as key, COUNT(*) as count").
		Where("call_id = ? AND os != ''", callID).
		Group("os").
		Scan(&osRows)
	for _, row := range osRows {
		osList[row.Key] = row.Count
	}

	var refRows []countRow
	r.db.WithContext(ctx).
		Model(&models.Visit{}).
		Select("referrer as key, COUNT(*) as count").
		Where("call_id = ?", callID).
		Group("referrer").
		Order("count DESC").
		Limit(10).
		Scan(&refRows)
	refs := make([]domain.ReferrerCount, len(refRows))
	for i, row := range refRows {
		src := row.Key
		if src == "" {
			src = "Direto"
		}
		refs[i] = domain.ReferrerCount{Source: src, Count: row.Count}
	}

	return &domain.CallAnalytics{
		CallID:       callID,
		TotalVisits:  totalVisits,
		AvgWatched:   int64(avgRow.Avg),
		Devices:      devices,
		Browsers:     browsers,
		OSList:       osList,
		TopReferrers: refs,
	}, nil
}

func (r *visitRepository) CountByCallIDs(ctx context.Context, callIDs []uuid.UUID) (int64, error) {
	if len(callIDs) == 0 {
		return 0, nil
	}
	var count int64
	err := r.db.WithContext(ctx).Model(&models.Visit{}).Where("call_id IN ?", callIDs).Count(&count).Error
	return count, err
}
