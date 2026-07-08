package utils

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
)

// NewOpaqueToken gera um token aleatório seguro (usado para refresh token e
// reset de senha). Retorna o token em texto puro — quem o gera é responsável
// por armazenar apenas o hash (ver HashToken) e entregar o texto puro ao cliente.
func NewOpaqueToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

// HashToken aplica SHA-256 a um token em texto puro para armazenamento seguro.
func HashToken(plain string) string {
	sum := sha256.Sum256([]byte(plain))
	return hex.EncodeToString(sum[:])
}
