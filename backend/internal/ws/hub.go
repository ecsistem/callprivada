package ws

import (
	"encoding/json"
	"sync"

	"github.com/google/uuid"
)

// Event é a mensagem enviada para o cliente via WebSocket.
type Event struct {
	Type    string `json:"type"`
	Payload any    `json:"payload"`
}

type BroadcastMsg struct {
	UserID uuid.UUID
	Event  Event
}

// Hub mantém o conjunto de clientes conectados e roteia broadcasts por userID.
type Hub struct {
	mu         sync.RWMutex
	clients    map[uuid.UUID]map[*Client]struct{}
	register   chan *Client
	unregister chan *Client
	broadcast  chan BroadcastMsg
}

func NewHub() *Hub {
	return &Hub{
		clients:    make(map[uuid.UUID]map[*Client]struct{}),
		register:   make(chan *Client, 32),
		unregister: make(chan *Client, 32),
		broadcast:  make(chan BroadcastMsg, 256),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case c := <-h.register:
			h.mu.Lock()
			if h.clients[c.userID] == nil {
				h.clients[c.userID] = make(map[*Client]struct{})
			}
			h.clients[c.userID][c] = struct{}{}
			h.mu.Unlock()

		case c := <-h.unregister:
			h.mu.Lock()
			if set, ok := h.clients[c.userID]; ok {
				delete(set, c)
				if len(set) == 0 {
					delete(h.clients, c.userID)
				}
			}
			h.mu.Unlock()
			close(c.send)

		case msg := <-h.broadcast:
			data, err := json.Marshal(msg.Event)
			if err != nil {
				continue
			}
			h.mu.RLock()
			for c := range h.clients[msg.UserID] {
				select {
				case c.send <- data:
				default:
					// canal cheio — descarta; writePump vai fechar a conexão se necessário
				}
			}
			h.mu.RUnlock()
		}
	}
}

// Broadcast envia um evento para todos os clientes do usuário.
func (h *Hub) Broadcast(userID uuid.UUID, eventType string, payload any) {
	h.broadcast <- BroadcastMsg{
		UserID: userID,
		Event:  Event{Type: eventType, Payload: payload},
	}
}
