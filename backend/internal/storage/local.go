package storage

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

// LocalStorage salva arquivos no sistema de arquivos local da VPS.
// PresignGet retorna uma URL autenticada por HMAC-SHA256 (expira em ttl).
// O backend precisa ter a rota GET /files/*key registrada para servir os arquivos.
type LocalStorage struct {
	basePath   string // diretório raiz dos uploads, ex: /data/uploads
	publicBase string // URL pública do backend, ex: https://meusite.com
	secret     string // segredo HMAC — use o mesmo JWT_SECRET
}

func NewLocalStorage(basePath, publicBase, secret string) (*LocalStorage, error) {
	if err := os.MkdirAll(basePath, 0o755); err != nil {
		return nil, fmt.Errorf("local storage: cannot create base dir %s: %w", basePath, err)
	}
	return &LocalStorage{basePath: basePath, publicBase: publicBase, secret: secret}, nil
}

// Upload escreve o corpo no caminho {basePath}/{key}, criando subdiretórios se necessário.
func (l *LocalStorage) Upload(_ context.Context, key string, body io.Reader, _ string) error {
	dest := filepath.Join(l.basePath, filepath.FromSlash(key))
	if err := os.MkdirAll(filepath.Dir(dest), 0o755); err != nil {
		return fmt.Errorf("local storage upload: mkdir: %w", err)
	}
	f, err := os.Create(dest)
	if err != nil {
		return fmt.Errorf("local storage upload: create file: %w", err)
	}
	defer f.Close()
	if _, err := io.Copy(f, body); err != nil {
		return fmt.Errorf("local storage upload: write: %w", err)
	}
	return nil
}

// Download abre o arquivo local. O chamador deve fechar.
func (l *LocalStorage) Download(_ context.Context, key string) (io.ReadCloser, error) {
	dest := filepath.Join(l.basePath, filepath.FromSlash(key))
	return os.Open(dest)
}

// Delete remove o arquivo do disco. Ignora se não existir.
func (l *LocalStorage) Delete(_ context.Context, key string) error {
	dest := filepath.Join(l.basePath, filepath.FromSlash(key))
	err := os.Remove(dest)
	if os.IsNotExist(err) {
		return nil
	}
	return err
}

// PresignGet gera uma URL autenticada com expiração:
// {publicBase}/files/{key}?expires={unix}&token={hmac}
func (l *LocalStorage) PresignGet(_ context.Context, key string, ttl time.Duration) (string, error) {
	expires := strconv.FormatInt(time.Now().Add(ttl).Unix(), 10)
	token := l.sign(key, expires)
	u := fmt.Sprintf("%s/files/%s?expires=%s&token=%s",
		strings.TrimRight(l.publicBase, "/"),
		url.PathEscape(key),
		expires,
		token,
	)
	return u, nil
}

// PublicURL para local storage retorna a mesma URL autenticada com TTL longo (sem expiração prática).
func (l *LocalStorage) PublicURL(key string) string {
	u, _ := l.PresignGet(context.Background(), key, 365*24*time.Hour)
	return u
}

// Verify valida o token e a expiração de uma URL local.
func (l *LocalStorage) Verify(key, expires, token string) bool {
	exp, err := strconv.ParseInt(expires, 10, 64)
	if err != nil || time.Now().Unix() > exp {
		return false
	}
	expected := l.sign(key, expires)
	return hmac.Equal([]byte(expected), []byte(token))
}

// FilePath retorna o caminho absoluto de um key no disco.
func (l *LocalStorage) FilePath(key string) string {
	return filepath.Join(l.basePath, filepath.FromSlash(key))
}

func (l *LocalStorage) sign(key, expires string) string {
	mac := hmac.New(sha256.New, []byte(l.secret))
	mac.Write([]byte(key + ":" + expires))
	return hex.EncodeToString(mac.Sum(nil))
}
