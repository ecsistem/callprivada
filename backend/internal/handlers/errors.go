package handlers

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/callprivada/fwlc-backend/internal/domain"
)

// respondError mapeia erros de domínio conhecidos para o status HTTP correto.
// Erros não mapeados retornam 500 sem expor detalhes internos.
func respondError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, domain.ErrEmailAlreadyInUse):
		c.JSON(http.StatusConflict, gin.H{"error": gin.H{"code": "email_already_in_use", "message": "email already in use"}})
	case errors.Is(err, domain.ErrInvalidCredentials):
		c.JSON(http.StatusUnauthorized, gin.H{"error": gin.H{"code": "invalid_credentials", "message": "invalid email or password"}})
	case errors.Is(err, domain.ErrUserBlocked):
		c.JSON(http.StatusForbidden, gin.H{"error": gin.H{"code": "user_blocked", "message": "user is blocked"}})
	case errors.Is(err, domain.ErrInvalidToken):
		c.JSON(http.StatusUnauthorized, gin.H{"error": gin.H{"code": "invalid_token", "message": "invalid or expired token"}})
	case errors.Is(err, domain.ErrNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"code": "not_found", "message": "resource not found"}})
	case errors.Is(err, domain.ErrSubscriptionRequired):
		c.JSON(http.StatusPaymentRequired, gin.H{"error": gin.H{"code": "subscription_required", "message": "assinatura ativa necessária"}})
	case errors.Is(err, domain.ErrAlreadySubscribed):
		c.JSON(http.StatusConflict, gin.H{"error": gin.H{"code": "already_subscribed", "message": "você já possui uma assinatura ativa"}})
	case errors.Is(err, domain.ErrFileTooLarge):
		c.JSON(http.StatusRequestEntityTooLarge, gin.H{"error": gin.H{"code": "file_too_large", "message": "arquivo excede o limite de 2GB"}})
	case errors.Is(err, domain.ErrUnsupportedMIME):
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": gin.H{"code": "unsupported_mime", "message": "tipo de arquivo não suportado (use MP4, MOV ou WEBM)"}})
	case errors.Is(err, domain.ErrVideoNotReady):
		c.JSON(http.StatusConflict, gin.H{"error": gin.H{"code": "video_not_ready", "message": "vídeo ainda não está pronto"}})
	case errors.Is(err, domain.ErrCallExpired):
		c.JSON(http.StatusGone, gin.H{"error": gin.H{"code": "call_expired", "message": "esta chamada expirou ou foi desativada"}})
	case errors.Is(err, domain.ErrForbidden):
		c.JSON(http.StatusForbidden, gin.H{"error": gin.H{"code": "forbidden", "message": "acesso negado"}})
	case errors.Is(err, domain.ErrPaymentNotConfigured):
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": gin.H{"code": "payment_not_configured", "message": "o dono desta chamada não configurou o gateway de pagamento"}})
	case errors.Is(err, domain.ErrUnsupportedPaymentMethod):
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "unsupported_payment_method", "message": "método de pagamento não suportado"}})
	case errors.Is(err, domain.ErrPlanLimitReached):
		c.JSON(http.StatusForbidden, gin.H{"error": gin.H{"code": "plan_limit_reached", "message": "limite do plano atingido — faça upgrade para continuar criando"}})
	case errors.Is(err, domain.ErrPlanInUse):
		c.JSON(http.StatusConflict, gin.H{"error": gin.H{"code": "plan_in_use", "message": "este plano tem assinaturas e não pode ser excluído. Desative-o em vez de excluir."}})
	case errors.Is(err, domain.ErrPendingApproval):
		c.JSON(http.StatusAccepted, gin.H{"status": "pending_approval"})
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"code": "internal_error", "message": "internal server error"}})
	}
}
