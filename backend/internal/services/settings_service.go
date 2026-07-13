package services

import (
	"context"
	"errors"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/callprivada/fwlc-backend/internal/domain"
)

// ErrInvalidSetting é retornado quando um valor de configuração é inválido.
var ErrInvalidSetting = errors.New("invalid setting value")

// SettingsService lê/grava configurações globais e aplica um pequeno cache em
// memória para o CDN de vídeo (lido em toda visita a uma chamada pública).
type SettingsService struct {
	repo domain.AppSettingsRepository

	mu           sync.RWMutex
	cdnCache      string
	cdnCachedAt   time.Time
	cdnCacheValid bool

	abacateCache      string
	abacateCachedAt   time.Time
	abacateCacheValid bool
}

const cdnCacheTTL = 30 * time.Second

func NewSettingsService(repo domain.AppSettingsRepository) *SettingsService {
	return &SettingsService{repo: repo}
}

func (s *SettingsService) GetAll(ctx context.Context) (map[string]string, error) {
	return s.repo.GetAll(ctx)
}

// VideoCDNURL retorna a base configurada da CDN de vídeo (com cache de 30s).
func (s *SettingsService) VideoCDNURL(ctx context.Context) string {
	s.mu.RLock()
	if s.cdnCacheValid && time.Since(s.cdnCachedAt) < cdnCacheTTL {
		v := s.cdnCache
		s.mu.RUnlock()
		return v
	}
	s.mu.RUnlock()

	v, err := s.repo.Get(ctx, domain.SettingVideoCDNURL)
	if err != nil {
		return "" // em erro, cai no padrão do storage
	}
	s.mu.Lock()
	s.cdnCache = v
	s.cdnCachedAt = time.Now()
	s.cdnCacheValid = true
	s.mu.Unlock()
	return v
}

// SetVideoCDNURL valida e grava a base da CDN de vídeo (vazio = limpar).
func (s *SettingsService) SetVideoCDNURL(ctx context.Context, raw string) (string, error) {
	normalized := normalizeCDNBase(raw)
	if raw != "" && normalized == "" {
		return "", ErrInvalidSetting
	}
	if err := s.repo.Set(ctx, domain.SettingVideoCDNURL, normalized); err != nil {
		return "", err
	}
	s.mu.Lock()
	s.cdnCache = normalized
	s.cdnCachedAt = time.Now()
	s.cdnCacheValid = true
	s.mu.Unlock()
	return normalized, nil
}

// ApplyVideoCDN reescreve a URL de um objeto do storage para usar o domínio da
// CDN configurado (mantendo o path). Se não houver CDN, retorna a URL original.
func (s *SettingsService) ApplyVideoCDN(ctx context.Context, storageURL string) string {
	return rewriteToCDN(storageURL, s.VideoCDNURL(ctx))
}

// AbacatePayAPIKey retorna a chave configurada no painel (com cache de 30s).
// Vazia quando não configurada — o chamador deve aplicar o fallback do env.
func (s *SettingsService) AbacatePayAPIKey(ctx context.Context) string {
	s.mu.RLock()
	if s.abacateCacheValid && time.Since(s.abacateCachedAt) < cdnCacheTTL {
		v := s.abacateCache
		s.mu.RUnlock()
		return v
	}
	s.mu.RUnlock()

	v, err := s.repo.Get(ctx, domain.SettingAbacatePayAPIKey)
	if err != nil {
		return ""
	}
	s.mu.Lock()
	s.abacateCache = v
	s.abacateCachedAt = time.Now()
	s.abacateCacheValid = true
	s.mu.Unlock()
	return v
}

// SetAbacatePayAPIKey grava a chave do AbacatePay (vazio = limpar/usar env).
func (s *SettingsService) SetAbacatePayAPIKey(ctx context.Context, key string) error {
	key = strings.TrimSpace(key)
	if err := s.repo.Set(ctx, domain.SettingAbacatePayAPIKey, key); err != nil {
		return err
	}
	s.mu.Lock()
	s.abacateCache = key
	s.abacateCachedAt = time.Now()
	s.abacateCacheValid = true
	s.mu.Unlock()
	return nil
}

// MaskSecret devolve uma versão mascarada de um segredo (últimos 4 chars).
func MaskSecret(v string) string {
	if v == "" {
		return ""
	}
	if len(v) <= 4 {
		return "••••"
	}
	return "••••••" + v[len(v)-4:]
}

// normalizeCDNBase valida e normaliza a base da CDN: garante esquema (https por
// padrão) e remove barra final. Retorna "" se inválida ou vazia.
func normalizeCDNBase(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}
	if !strings.Contains(raw, "://") {
		raw = "https://" + raw
	}
	u, err := url.Parse(raw)
	if err != nil || u.Host == "" {
		return ""
	}
	u.Path = strings.TrimRight(u.Path, "/")
	u.RawQuery = ""
	u.Fragment = ""
	return u.String()
}

// rewriteToCDN troca esquema+host da storageURL pelos da CDN, preservando o
// path (ex: /bucket/videos/...). Um path na base da CDN é usado como prefixo.
func rewriteToCDN(storageURL, cdnBase string) string {
	if cdnBase == "" || storageURL == "" {
		return storageURL
	}
	src, err := url.Parse(storageURL)
	if err != nil {
		return storageURL
	}
	base, err := url.Parse(cdnBase)
	if err != nil || base.Host == "" {
		return storageURL
	}
	src.Scheme = base.Scheme
	src.Host = base.Host
	if prefix := strings.TrimRight(base.Path, "/"); prefix != "" {
		src.Path = prefix + src.Path
	}
	return src.String()
}
