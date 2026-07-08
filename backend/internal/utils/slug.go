package utils

import (
	"crypto/rand"
	"encoding/base64"
	"strings"
)

// NewSlug gera um slug URL-safe de n bytes (resultando em ~n*4/3 chars).
func NewSlug(n int) (string, error) {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	s := base64.URLEncoding.EncodeToString(b)
	s = strings.TrimRight(s, "=")
	return s[:min(len(s), n*2)], nil
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
