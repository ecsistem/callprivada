package storage

import (
	"context"
	"io"
	"time"
)

// FileStorage abstrai S3/MinIO e armazenamento local.
// Todos os serviços dependem desta interface — nunca do tipo concreto.
type FileStorage interface {
	Upload(ctx context.Context, key string, body io.Reader, contentType string) error
	Delete(ctx context.Context, key string) error
	PresignGet(ctx context.Context, key string, ttl time.Duration) (string, error)
	// PublicURL retorna uma URL permanente (sem expiração) para buckets públicos.
	PublicURL(key string) string
}
