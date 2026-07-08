package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/callprivada/fwlc-backend/internal/middlewares"
	"github.com/callprivada/fwlc-backend/internal/services"
)

type AdminHandler struct {
	admin *services.AdminService
}

func NewAdminHandler(admin *services.AdminService) *AdminHandler {
	return &AdminHandler{admin: admin}
}

func parsePage(c *gin.Context) (int, int) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "20"))
	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 20
	}
	return page, perPage
}

// GET /admin/stats
func (h *AdminHandler) Stats(c *gin.Context) {
	stats, err := h.admin.Stats(c.Request.Context())
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": stats})
}

// GET /admin/users?page=1&per_page=20&search=...
func (h *AdminHandler) ListUsers(c *gin.Context) {
	page, perPage := parsePage(c)
	search := c.Query("search")
	users, total, err := h.admin.ListUsers(c.Request.Context(), page, perPage, search)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": users, "total": total, "page": page, "per_page": perPage})
}

// PUT /admin/users/:id/block
func (h *AdminHandler) BlockUser(c *gin.Context) {
	adminID := c.MustGet(middlewares.ContextUserIDKey).(uuid.UUID)
	userID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "bad_request", "message": "id inválido"}})
		return
	}
	if err := h.admin.BlockUser(c.Request.Context(), adminID, userID); err != nil {
		respondError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// PUT /admin/users/:id/unblock
func (h *AdminHandler) UnblockUser(c *gin.Context) {
	adminID := c.MustGet(middlewares.ContextUserIDKey).(uuid.UUID)
	userID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "bad_request", "message": "id inválido"}})
		return
	}
	if err := h.admin.UnblockUser(c.Request.Context(), adminID, userID); err != nil {
		respondError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// DELETE /admin/users/:id
func (h *AdminHandler) DeleteUser(c *gin.Context) {
	adminID := c.MustGet(middlewares.ContextUserIDKey).(uuid.UUID)
	userID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "bad_request", "message": "id inválido"}})
		return
	}
	if err := h.admin.DeleteUser(c.Request.Context(), adminID, userID); err != nil {
		respondError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// GET /admin/subscriptions
func (h *AdminHandler) ListSubscriptions(c *gin.Context) {
	page, perPage := parsePage(c)
	subs, total, err := h.admin.ListSubscriptions(c.Request.Context(), page, perPage)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": subs, "total": total, "page": page, "per_page": perPage})
}

// DELETE /admin/subscriptions/:id
func (h *AdminHandler) CancelSubscription(c *gin.Context) {
	adminID := c.MustGet(middlewares.ContextUserIDKey).(uuid.UUID)
	subID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "bad_request", "message": "id inválido"}})
		return
	}
	if err := h.admin.CancelSubscription(c.Request.Context(), adminID, subID); err != nil {
		respondError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// GET /admin/calls
func (h *AdminHandler) ListCalls(c *gin.Context) {
	page, perPage := parsePage(c)
	calls, total, err := h.admin.ListCalls(c.Request.Context(), page, perPage)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": calls, "total": total, "page": page, "per_page": perPage})
}

// DELETE /admin/calls/:id
func (h *AdminHandler) DeleteCall(c *gin.Context) {
	adminID := c.MustGet(middlewares.ContextUserIDKey).(uuid.UUID)
	callID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "bad_request", "message": "id inválido"}})
		return
	}
	if err := h.admin.DeleteCall(c.Request.Context(), adminID, callID); err != nil {
		respondError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// GET /admin/audit-logs
func (h *AdminHandler) ListAuditLogs(c *gin.Context) {
	page, perPage := parsePage(c)
	logs, total, err := h.admin.ListAuditLogs(c.Request.Context(), page, perPage)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": logs, "total": total, "page": page, "per_page": perPage})
}

// POST /admin/users
func (h *AdminHandler) CreateUser(c *gin.Context) {
	adminID := c.MustGet(middlewares.ContextUserIDKey).(uuid.UUID)
	var req struct {
		Name     string `json:"name"     binding:"required"`
		Email    string `json:"email"    binding:"required,email"`
		Password string `json:"password" binding:"required,min=6"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "validation_error", "message": err.Error()}})
		return
	}
	user, err := h.admin.CreateUser(c.Request.Context(), adminID, services.CreateUserInput{
		Name: req.Name, Email: req.Email, Password: req.Password,
	})
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": user})
}

// POST /admin/users/:id/assign-plan
func (h *AdminHandler) AssignPlan(c *gin.Context) {
	adminID := c.MustGet(middlewares.ContextUserIDKey).(uuid.UUID)
	userID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "bad_request", "message": "id inválido"}})
		return
	}
	var req struct {
		PlanID string `json:"plan_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "validation_error", "message": err.Error()}})
		return
	}
	planID, err := uuid.Parse(req.PlanID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "bad_request", "message": "plan_id inválido"}})
		return
	}
	if err := h.admin.AssignPlan(c.Request.Context(), adminID, userID, planID); err != nil {
		respondError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}
