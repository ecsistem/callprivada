package middlewares

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

// RateLimiter implementa sliding-window counter usando Redis.
// max     — número máximo de requisições permitidas na janela.
// window  — tamanho da janela de tempo.
// keyFunc — extrai a chave de particionamento (ex: IP, userID, rota).
func RateLimiter(rdb *redis.Client, max int, window time.Duration, keyFunc func(*gin.Context) string) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := context.Background()
		key := "rl:" + keyFunc(c)
		now := time.Now().UnixMilli()
		windowMs := window.Milliseconds()

		pipe := rdb.Pipeline()
		// Remove entradas fora da janela.
		pipe.ZRemRangeByScore(ctx, key, "0", strconv.FormatInt(now-windowMs, 10))
		// Conta entradas dentro da janela.
		countCmd := pipe.ZCard(ctx, key)
		// Adiciona a requisição atual.
		pipe.ZAdd(ctx, key, redis.Z{Score: float64(now), Member: fmt.Sprintf("%d", now)})
		// Expira a chave após a janela para não acumular lixo.
		pipe.Expire(ctx, key, window+time.Second)
		_, err := pipe.Exec(ctx)
		if err != nil {
			// Redis indisponível — deixa passar (fail open).
			c.Next()
			return
		}

		count := countCmd.Val()
		remaining := int64(max) - count
		if remaining < 0 {
			remaining = 0
		}

		c.Header("X-RateLimit-Limit", strconv.Itoa(max))
		c.Header("X-RateLimit-Remaining", strconv.FormatInt(remaining, 10))
		c.Header("X-RateLimit-Reset", strconv.FormatInt(now/1000+int64(window.Seconds()), 10))

		if count >= int64(max) {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error": gin.H{
					"code":    "rate_limit_exceeded",
					"message": "muitas requisições — tente novamente mais tarde",
				},
			})
			return
		}

		c.Next()
	}
}

// ByIP extrai o IP do cliente respeitando proxies.
func ByIP(c *gin.Context) string {
	if ip := c.GetHeader("X-Real-IP"); ip != "" {
		return ip
	}
	if ip := c.GetHeader("X-Forwarded-For"); ip != "" {
		return ip
	}
	return c.ClientIP()
}

// ByUserID extrai o userID autenticado (definido pelo middleware RequireAuth).
func ByUserID(c *gin.Context) string {
	if v, ok := c.Get(ContextUserIDKey); ok {
		return fmt.Sprintf("%v", v)
	}
	return ByIP(c)
}
