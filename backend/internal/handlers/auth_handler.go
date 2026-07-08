package handlers

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/callprivada/fwlc-backend/internal/services"
)

type AuthHandler struct {
	auth *services.AuthService
}

func NewAuthHandler(auth *services.AuthService) *AuthHandler {
	return &AuthHandler{auth: auth}
}

func (h *AuthHandler) requestMeta(c *gin.Context) services.RequestMeta {
	return services.RequestMeta{
		UserAgent: c.Request.UserAgent(),
		IP:        c.ClientIP(),
	}
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "validation_error", "message": err.Error()}})
		return
	}

	result, err := h.auth.Register(c.Request.Context(), req.Name, req.Email, req.Password, h.requestMeta(c))
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, toAuthResponse(result))
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "validation_error", "message": err.Error()}})
		return
	}

	result, err := h.auth.Login(c.Request.Context(), req.Email, req.Password, h.requestMeta(c))
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, toAuthResponse(result))
}

func (h *AuthHandler) Refresh(c *gin.Context) {
	var req RefreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "validation_error", "message": err.Error()}})
		return
	}

	result, err := h.auth.Refresh(c.Request.Context(), req.RefreshToken, h.requestMeta(c))
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, toAuthResponse(result))
}

func (h *AuthHandler) Logout(c *gin.Context) {
	var req LogoutRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "validation_error", "message": err.Error()}})
		return
	}

	if err := h.auth.Logout(c.Request.Context(), req.RefreshToken); err != nil {
		respondError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *AuthHandler) ForgotPassword(c *gin.Context) {
	var req ForgotPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "validation_error", "message": err.Error()}})
		return
	}

	token, err := h.auth.ForgotPassword(c.Request.Context(), req.Email)
	if err != nil {
		respondError(c, err)
		return
	}
	if token != "" {
		// Pendência de infra (e-mail transacional) registrada em docs/DECISIONS.md.
		// Por ora, apenas logamos o token para uso manual em ambiente de desenvolvimento.
		log.Printf("[password-reset] token gerado para %s: %s", req.Email, token)
	}
	c.JSON(http.StatusOK, gin.H{"message": "if the email exists, a reset link was sent"})
}

func (h *AuthHandler) ResetPassword(c *gin.Context) {
	var req ResetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "validation_error", "message": err.Error()}})
		return
	}

	if err := h.auth.ResetPassword(c.Request.Context(), req.Token, req.NewPassword); err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "password updated"})
}
