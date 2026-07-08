package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/callprivada/fwlc-backend/internal/middlewares"
	"github.com/callprivada/fwlc-backend/internal/services"
)

type UserHandler struct {
	users *services.UserService
}

func NewUserHandler(users *services.UserService) *UserHandler {
	return &UserHandler{users: users}
}

type UpdateMeRequest struct {
	Name        string `json:"name" binding:"omitempty,min=2,max=255"`
	NewPassword string `json:"new_password" binding:"omitempty,min=8"`
}

func currentUserID(c *gin.Context) (uuid.UUID, bool) {
	v, ok := c.Get(middlewares.ContextUserIDKey)
	if !ok {
		return uuid.UUID{}, false
	}
	id, ok := v.(uuid.UUID)
	return id, ok
}

func (h *UserHandler) Me(c *gin.Context) {
	id, ok := currentUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": gin.H{"code": "unauthorized", "message": "missing user context"}})
		return
	}

	user, err := h.users.GetByID(c.Request.Context(), id)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, toUserDTO(user))
}

func (h *UserHandler) UpdateMe(c *gin.Context) {
	id, ok := currentUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": gin.H{"code": "unauthorized", "message": "missing user context"}})
		return
	}

	var req UpdateMeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "validation_error", "message": err.Error()}})
		return
	}

	user, err := h.users.UpdateProfile(c.Request.Context(), id, req.Name, req.NewPassword)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, toUserDTO(user))
}

func (h *UserHandler) DeleteMe(c *gin.Context) {
	id, ok := currentUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": gin.H{"code": "unauthorized", "message": "missing user context"}})
		return
	}

	if err := h.users.DeleteAccount(c.Request.Context(), id); err != nil {
		respondError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}
