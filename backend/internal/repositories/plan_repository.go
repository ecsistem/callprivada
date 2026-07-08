package repositories

import (
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/callprivada/fwlc-backend/internal/domain"
	"github.com/callprivada/fwlc-backend/internal/models"
)

type planRepository struct{ db *gorm.DB }

func NewPlanRepository(db *gorm.DB) domain.PlanRepository {
	return &planRepository{db: db}
}

func (r *planRepository) FindAll() ([]domain.Plan, error) {
	var rows []models.Plan
	if err := r.db.Where("active = true").Order("price_cents ASC").Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]domain.Plan, len(rows))
	for i, row := range rows {
		out[i] = row.ToDomain()
	}
	return out, nil
}

func (r *planRepository) FindAllAdmin() ([]domain.Plan, error) {
	var rows []models.Plan
	if err := r.db.Order("price_cents ASC").Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]domain.Plan, len(rows))
	for i, row := range rows {
		out[i] = row.ToDomain()
	}
	return out, nil
}

func (r *planRepository) Create(p *domain.Plan) error {
	if p.ID == (uuid.UUID{}) {
		p.ID = uuid.New()
	}
	row := models.Plan{
		ID:                  p.ID,
		Name:                p.Name,
		PriceCents:          p.PriceCents,
		Interval:            p.Interval,
		AbacatePayProductID: p.AbacatePayProductID,
		Active:              p.Active,
		MaxCalls:            p.MaxCalls,
		MaxPresells:         p.MaxPresells,
		MaxVideos:           p.MaxVideos,
	}
	return r.db.Create(&row).Error
}

func (r *planRepository) FindByID(id uuid.UUID) (*domain.Plan, error) {
	var row models.Plan
	if err := r.db.First(&row, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	p := row.ToDomain()
	return &p, nil
}

func (r *planRepository) Update(p *domain.Plan) error {
	return r.db.Model(&models.Plan{}).Where("id = ?", p.ID).Updates(map[string]interface{}{
		"name":                   p.Name,
		"price_cents":            p.PriceCents,
		"interval":               p.Interval,
		"abacatepay_product_id": p.AbacatePayProductID,
		"active":                 p.Active,
		"max_calls":              p.MaxCalls,
		"max_presells":           p.MaxPresells,
		"max_videos":             p.MaxVideos,
	}).Error
}
