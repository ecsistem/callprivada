package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/callprivada/fwlc-backend/internal/middlewares"
	"github.com/callprivada/fwlc-backend/internal/services"
	"github.com/callprivada/fwlc-backend/internal/utils"
	ws "github.com/callprivada/fwlc-backend/internal/ws"
)

type VisitHandler struct {
	visits *services.VisitService
	hub    *ws.Hub
}

func NewVisitHandler(visits *services.VisitService, hub *ws.Hub) *VisitHandler {
	return &VisitHandler{visits: visits, hub: hub}
}

// Track registra uma nova visita na página pública.
// POST /public/calls/:slug/visits
func (h *VisitHandler) Track(c *gin.Context) {
	slug := c.Param("slug")

	ip := utils.ClientIP(c.Request.RemoteAddr, c.GetHeader("X-Forwarded-For"), c.GetHeader("X-Real-IP"))

	var body struct {
		Referrer string `json:"referrer"`
	}
	_ = c.ShouldBindJSON(&body)

	result, err := h.visits.Track(c.Request.Context(), services.TrackVisitInput{
		Slug:      slug,
		IP:        ip,
		UserAgent: c.GetHeader("User-Agent"),
		Referrer:  body.Referrer,
	})
	if err != nil {
		respondError(c, err)
		return
	}

	// Notifica o dono da chamada em tempo real.
	h.hub.Broadcast(result.CallUserID, "new_visit", map[string]any{
		"call_title": result.CallTitle,
		"device":     result.Visit.DeviceType,
		"referrer":   result.Visit.Referrer,
	})

	c.JSON(http.StatusCreated, gin.H{"data": gin.H{"visit_id": result.Visit.ID.String()}})
}

// UpdateWatched atualiza o tempo assistido de uma visita.
// PATCH /public/visits/:visit_id
func (h *VisitHandler) UpdateWatched(c *gin.Context) {
	visitID, err := uuid.Parse(c.Param("visit_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "bad_request", "message": "visit_id inválido"}})
		return
	}

	var body struct {
		WatchedSeconds int `json:"watched_seconds" binding:"min=0"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "validation_error", "message": err.Error()}})
		return
	}

	if err := h.visits.UpdateWatched(c.Request.Context(), visitID, body.WatchedSeconds); err != nil {
		respondError(c, err)
		return
	}

	c.Status(http.StatusNoContent)
}

// Analytics retorna métricas agregadas de uma chamada.
// GET /calls/:id/analytics
func (h *VisitHandler) Analytics(c *gin.Context) {
	userID := c.MustGet(middlewares.ContextUserIDKey).(uuid.UUID)

	callID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "bad_request", "message": "id inválido"}})
		return
	}

	analytics, err := h.visits.Analytics(c.Request.Context(), userID, callID)
	if err != nil {
		respondError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": analytics})
}
