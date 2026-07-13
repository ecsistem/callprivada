package handlers

import (
	"errors"
	"net/http"
	"net/url"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/callprivada/fwlc-backend/internal/domain"
	"github.com/callprivada/fwlc-backend/internal/services"
	"github.com/callprivada/fwlc-backend/internal/storage"
)

type SettingsHandler struct {
	settings *services.SettingsService
	storage  storage.FileStorage
}

func NewSettingsHandler(settings *services.SettingsService, store storage.FileStorage) *SettingsHandler {
	return &SettingsHandler{settings: settings, storage: store}
}

// defaultVideoHost deriva o host padrão do storage (ex: https://storage.exemplo.com)
// a partir de uma PublicURL de exemplo — usado como fallback exibido na UI.
func (h *SettingsHandler) defaultVideoHost() string {
	raw := h.storage.PublicURL("__probe__")
	u, err := url.Parse(raw)
	if err != nil || u.Host == "" {
		return ""
	}
	return u.Scheme + "://" + u.Host
}

// Get — GET /admin/settings (admin). Retorna as configurações globais.
func (h *SettingsHandler) Get(c *gin.Context) {
	all, err := h.settings.GetAll(c.Request.Context())
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": gin.H{
		"video_cdn_url":     all[domain.SettingVideoCDNURL],
		"video_cdn_default": h.defaultVideoHost(),
	}})
}

type updateSettingsRequest struct {
	VideoCDNURL *string `json:"video_cdn_url"`
}

// Update — PUT /admin/settings (admin). Atualiza as configurações enviadas.
func (h *SettingsHandler) Update(c *gin.Context) {
	var req updateSettingsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "validation_error", "message": err.Error()}})
		return
	}

	if req.VideoCDNURL != nil {
		if _, err := h.settings.SetVideoCDNURL(c.Request.Context(), strings.TrimSpace(*req.VideoCDNURL)); err != nil {
			if errors.Is(err, services.ErrInvalidSetting) {
				c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "invalid_cdn_url", "message": "domínio da CDN inválido"}})
				return
			}
			respondError(c, err)
			return
		}
	}

	h.Get(c)
}
