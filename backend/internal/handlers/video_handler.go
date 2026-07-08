package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/callprivada/fwlc-backend/internal/domain"
	"github.com/callprivada/fwlc-backend/internal/middlewares"
	"github.com/callprivada/fwlc-backend/internal/services"
)

type VideoHandler struct {
	videos *services.VideoService
}

func NewVideoHandler(videos *services.VideoService) *VideoHandler {
	return &VideoHandler{videos: videos}
}

func (h *VideoHandler) Upload(c *gin.Context) {
	userID, ok := c.Get(middlewares.ContextUserIDKey)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": gin.H{"code": "unauthorized", "message": "missing user context"}})
		return
	}
	uid := userID.(uuid.UUID)

	file, header, err := c.Request.FormFile("video")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "bad_request", "message": "campo 'video' obrigatório"}})
		return
	}
	defer file.Close()

	// Content-Length do upload (pode ser 0 se chunked — validamos dentro do service).
	size := header.Size
	if size == 0 {
		if cl := c.GetHeader("Content-Length"); cl != "" {
			size, _ = strconv.ParseInt(cl, 10, 64)
		}
	}

	// Limite de 2GB na leitura do body (nginx já rejeita acima, mas defense-in-depth).
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, domain.VideoMaxBytes+1024)

	video, err := h.videos.Upload(c.Request.Context(), uid, header.Filename, size, file)
	if err != nil {
		respondError(c, err)
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": toVideoDTO(video)})
}

func (h *VideoHandler) List(c *gin.Context) {
	userID, ok := c.Get(middlewares.ContextUserIDKey)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": gin.H{"code": "unauthorized", "message": "missing user context"}})
		return
	}
	uid := userID.(uuid.UUID)

	videos, err := h.videos.List(c.Request.Context(), uid)
	if err != nil {
		respondError(c, err)
		return
	}

	dtos := make([]videoDTO, len(videos))
	for i, v := range videos {
		dtos[i] = toVideoDTO(&v)
	}
	c.JSON(http.StatusOK, gin.H{"data": dtos})
}

func (h *VideoHandler) Get(c *gin.Context) {
	userID, ok := c.Get(middlewares.ContextUserIDKey)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": gin.H{"code": "unauthorized", "message": "missing user context"}})
		return
	}
	uid := userID.(uuid.UUID)

	videoID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "bad_request", "message": "id inválido"}})
		return
	}

	video, err := h.videos.GetByID(c.Request.Context(), uid, videoID)
	if err != nil {
		respondError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": toVideoDTO(video)})
}

func (h *VideoHandler) PresignURL(c *gin.Context) {
	userID, ok := c.Get(middlewares.ContextUserIDKey)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": gin.H{"code": "unauthorized", "message": "missing user context"}})
		return
	}
	uid := userID.(uuid.UUID)

	videoID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "bad_request", "message": "id inválido"}})
		return
	}

	url, err := h.videos.PresignURL(c.Request.Context(), uid, videoID)
	if err != nil {
		respondError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"url": url})
}

func (h *VideoHandler) Delete(c *gin.Context) {
	userID, ok := c.Get(middlewares.ContextUserIDKey)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": gin.H{"code": "unauthorized", "message": "missing user context"}})
		return
	}
	uid := userID.(uuid.UUID)

	videoID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "bad_request", "message": "id inválido"}})
		return
	}

	if err := h.videos.Delete(c.Request.Context(), uid, videoID); err != nil {
		respondError(c, err)
		return
	}

	c.Status(http.StatusNoContent)
}

// DTO de saída — nunca expõe storage_key diretamente.
type videoDTO struct {
	ID           string   `json:"id"`
	OriginalName string   `json:"original_name"`
	MimeType     string   `json:"mime_type"`
	SizeBytes    int64    `json:"size_bytes"`
	Duration     *float64 `json:"duration_seconds"`
	Status       string   `json:"status"`
	CreatedAt    string   `json:"created_at"`
}

func toVideoDTO(v *domain.Video) videoDTO {
	return videoDTO{
		ID:           v.ID.String(),
		OriginalName: v.OriginalName,
		MimeType:     v.MimeType,
		SizeBytes:    v.SizeBytes,
		Duration:     v.DurationSeconds,
		Status:       v.Status,
		CreatedAt:    v.CreatedAt.Format("2006-01-02T15:04:05Z"),
	}
}
