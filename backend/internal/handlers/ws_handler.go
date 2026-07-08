package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"

	"github.com/callprivada/fwlc-backend/internal/middlewares"
	"github.com/callprivada/fwlc-backend/internal/services"
	ws "github.com/callprivada/fwlc-backend/internal/ws"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin:     func(r *http.Request) bool { return true },
}

type WSHandler struct {
	hub        *ws.Hub
	jwtService *services.JWTService
}

func NewWSHandler(hub *ws.Hub, jwtService *services.JWTService) *WSHandler {
	return &WSHandler{hub: hub, jwtService: jwtService}
}

// Dashboard faz upgrade para WebSocket e registra o cliente autenticado.
// GET /ws/dashboard?token=<access_token>
func (h *WSHandler) Dashboard(c *gin.Context) {
	token := c.Query("token")
	if token == "" {
		// Tenta Bearer header como fallback
		token = c.GetHeader("Authorization")
		if len(token) > 7 {
			token = token[7:]
		}
	}

	claims, err := h.jwtService.ParseAccessToken(token)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
			"error": gin.H{"code": "unauthorized", "message": "token inválido"},
		})
		return
	}

	userID := claims.UserID

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}

	client := ws.NewClient(h.hub, userID, conn)
	client.Serve() // bloqueia até desconexão
}

// Dashboard via middleware (rota alternativa com RequireAuth normal).
// GET /ws/dashboard (com Authorization: Bearer header)
func (h *WSHandler) DashboardAuth(c *gin.Context) {
	userID := c.MustGet(middlewares.ContextUserIDKey).(uuid.UUID)

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}

	client := ws.NewClient(h.hub, userID, conn)
	client.Serve()
}
