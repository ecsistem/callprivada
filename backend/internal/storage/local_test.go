package storage_test

import (
	"bytes"
	"context"
	"net/url"
	"os"
	"testing"
	"time"

	"github.com/callprivada/fwlc-backend/internal/storage"
)

func newLocal(t *testing.T) *storage.LocalStorage {
	t.Helper()
	dir := t.TempDir()
	ls, err := storage.NewLocalStorage(dir, "http://localhost:8080", "test-secret")
	if err != nil {
		t.Fatalf("NewLocalStorage: %v", err)
	}
	return ls
}

func TestLocalStorage_UploadAndDelete(t *testing.T) {
	ls := newLocal(t)
	ctx := context.Background()

	body := []byte("hello world")
	r := newReader(body)
	if err := ls.Upload(ctx, "test/file.txt", r, "text/plain"); err != nil {
		t.Fatalf("Upload: %v", err)
	}

	// Verifica se o arquivo foi criado.
	path := ls.FilePath("test/file.txt")
	if _, err := os.Stat(path); err != nil {
		t.Fatalf("arquivo não encontrado após Upload: %v", err)
	}

	if err := ls.Delete(ctx, "test/file.txt"); err != nil {
		t.Fatalf("Delete: %v", err)
	}

	if _, err := os.Stat(path); !os.IsNotExist(err) {
		t.Error("arquivo deveria ter sido deletado")
	}
}

func TestLocalStorage_PresignAndVerify(t *testing.T) {
	ls := newLocal(t)
	ctx := context.Background()

	signed, err := ls.PresignGet(ctx, "videos/my-video.mp4", time.Hour)
	if err != nil {
		t.Fatalf("PresignGet: %v", err)
	}

	u, _ := url.Parse(signed)
	q := u.Query()
	expires := q.Get("expires")
	token := q.Get("token")
	// key vem do path, sem o /files/ prefix
	key := u.Path[len("/files/"):]

	if !ls.Verify(key, expires, token) {
		t.Errorf("Verify deveria retornar true para URL gerada pelo próprio storage")
	}
}

func TestLocalStorage_VerifyExpired(t *testing.T) {
	ls := newLocal(t)
	ctx := context.Background()

	// Gera URL com TTL negativo.
	signed, _ := ls.PresignGet(ctx, "k.mp4", -time.Hour)
	u, _ := url.Parse(signed)
	q := u.Query()
	key := u.Path[len("/files/"):]
	if ls.Verify(key, q.Get("expires"), q.Get("token")) {
		t.Error("Verify deveria retornar false para URL expirada")
	}
}

func TestLocalStorage_VerifyTamperedToken(t *testing.T) {
	ls := newLocal(t)
	ctx := context.Background()

	signed, _ := ls.PresignGet(ctx, "k.mp4", time.Hour)
	u, _ := url.Parse(signed)
	q := u.Query()
	key := u.Path[len("/files/"):]

	if ls.Verify(key, q.Get("expires"), "tampered-token") {
		t.Error("Verify deveria retornar false para token adulterado")
	}
}

func newReader(b []byte) *bytes.Reader {
	return bytes.NewReader(b)
}
