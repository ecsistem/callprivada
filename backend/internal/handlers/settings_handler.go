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

// AbacatePayPinger valida a credencial atual do AbacatePay.
type AbacatePayPinger interface {
	Ping() error
}

type SettingsHandler struct {
	settings *services.SettingsService
	storage  storage.FileStorage
	abacate  AbacatePayPinger
}

func NewSettingsHandler(settings *services.SettingsService, store storage.FileStorage, abacate AbacatePayPinger) *SettingsHandler {
	return &SettingsHandler{settings: settings, storage: store, abacate: abacate}
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
	abacateKey := all[domain.SettingAbacatePayAPIKey]
	c.JSON(http.StatusOK, gin.H{"data": gin.H{
		"video_cdn_url":         all[domain.SettingVideoCDNURL],
		"video_cdn_default":     h.defaultVideoHost(),
		"abacatepay_configured": abacateKey != "",
		"abacatepay_key_masked": services.MaskSecret(abacateKey),
	}})
}

type updateSettingsRequest struct {
	VideoCDNURL     *string `json:"video_cdn_url"`
	AbacatePayAPIKey *string `json:"abacatepay_api_key"`
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

	if req.AbacatePayAPIKey != nil {
		// Ignora o valor mascarado (••••) para não sobrescrever com o placeholder.
		v := strings.TrimSpace(*req.AbacatePayAPIKey)
		if !strings.Contains(v, "•") {
			if err := h.settings.SetAbacatePayAPIKey(c.Request.Context(), v); err != nil {
				respondError(c, err)
				return
			}
		}
	}

	h.Get(c)
}

// TestAbacatePay — POST /admin/settings/abacatepay/test. Valida a credencial
// atual (do painel, com fallback do env) contra a API do AbacatePay.
func (h *SettingsHandler) TestAbacatePay(c *gin.Context) {
	if h.abacate == nil {
		c.JSON(http.StatusOK, gin.H{"data": gin.H{"ok": false, "message": "integração indisponível"}})
		return
	}
	if err := h.abacate.Ping(); err != nil {
		c.JSON(http.StatusOK, gin.H{"data": gin.H{"ok": false, "message": err.Error()}})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": gin.H{"ok": true, "message": "Conexão com o AbacatePay OK"}})
}
