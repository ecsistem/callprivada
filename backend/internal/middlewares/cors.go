package middlewares

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// CORS restringe a origens conhecidas. allowedOrigin vem de config (PUBLIC_BASE_URL).
// Mitigação de rate limit/CORS mais completa entra na Fase 12 (Segurança/hardening).
func CORS(allowedOrigin string) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", allowedOrigin)
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Origin, Content-Type, Authorization")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")

		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}
