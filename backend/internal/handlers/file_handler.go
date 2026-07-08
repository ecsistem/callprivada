package handlers

import (
	"mime"
	"net/http"
	"path/filepath"

	"github.com/gin-gonic/gin"

	"github.com/callprivada/fwlc-backend/internal/storage"
)

type FileHandler struct {
	local *storage.LocalStorage
}

func NewFileHandler(local *storage.LocalStorage) *FileHandler {
	return &FileHandler{local: local}
}

// Serve entrega arquivos locais validando o token HMAC e a expiração.
// Rota: GET /files/*key?expires=...&token=...
func (h *FileHandler) Serve(c *gin.Context) {
	key := c.Param("key")
	if key == "" || key == "/" {
		c.Status(http.StatusBadRequest)
		return
	}
	// Gin inclui a barra inicial no wildcard.
	if len(key) > 0 && key[0] == '/' {
		key = key[1:]
	}

	expires := c.Query("expires")
	token := c.Query("token")

	if !h.local.Verify(key, expires, token) {
		c.JSON(http.StatusForbidden, gin.H{"error": gin.H{"code": "forbidden", "message": "link inválido ou expirado"}})
		return
	}

	path := h.local.FilePath(key)
	ct := mime.TypeByExtension(filepath.Ext(path))
	if ct == "" {
		ct = "application/octet-stream"
	}
	c.Header("Content-Type", ct)
	c.Header("Cache-Control", "private, max-age=3600")
	c.File(path)
}
