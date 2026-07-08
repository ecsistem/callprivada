package middlewares

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/callprivada/fwlc-backend/internal/domain"
	"github.com/callprivada/fwlc-backend/internal/services"
)

// RequireSubscription bloqueia rotas que exigem assinatura ativa.
// Deve ser usado após RequireAuth.
func RequireSubscription(subService *services.SubscriptionService) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := c.Get(ContextUserIDKey)
		if !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": gin.H{"code": "unauthorized", "message": "missing user context"}})
			return
		}

		uid, ok := userID.(uuid.UUID)
		if !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": gin.H{"code": "unauthorized", "message": "invalid user context"}})
			return
		}

		sub, err := subService.GetMySubscription(c.Request.Context(), uid)
		if err != nil {
			if errors.Is(err, domain.ErrNotFound) {
				c.AbortWithStatusJSON(http.StatusPaymentRequired, gin.H{"error": gin.H{"code": "subscription_required", "message": "assinatura ativa necessária"}})
				return
			}
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": gin.H{"code": "internal", "message": "erro ao verificar assinatura"}})
			return
		}

		if !sub.IsActive() {
			c.AbortWithStatusJSON(http.StatusPaymentRequired, gin.H{"error": gin.H{"code": "subscription_required", "message": "assinatura ativa necessária"}})
			return
		}

		c.Next()
	}
}
