package handlers

import (
	"mime"
	"net/http"
	"os"
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

	// Content-Type correto é essencial: o iOS Safari só faz streaming
	// progressivo (com Range) de vídeo servido como video/mp4 — com
	// application/octet-stream ele baixa o arquivo inteiro antes de tocar.
	// Como os uploads são salvos sem extensão, detectamos pelos magic bytes.
	ct := mime.TypeByExtension(filepath.Ext(path))
	if ct == "" || ct == "application/octet-stream" {
		ct = detectContentType(path)
	}

	c.Header("Content-Type", ct)
	// Vídeo/imagem são imutáveis (key = UUID) — cache longo acelera recargas.
	c.Header("Cache-Control", "private, max-age=31536000, immutable")
	c.Header("Accept-Ranges", "bytes")
	c.File(path) // http.ServeContent trata Range/206 e não sobrescreve o Content-Type já definido
}

// detectContentType lê os primeiros 512 bytes do arquivo para identificar o
// MIME real (video/mp4, image/jpeg, etc.). Fallback: octet-stream.
func detectContentType(path string) string {
	f, err := os.Open(path)
	if err != nil {
		return "application/octet-stream"
	}
	defer f.Close()
	buf := make([]byte, 512)
	n, _ := f.Read(buf)
	return http.DetectContentType(buf[:n])
}
