package main

import (
	"log"

	"github.com/joho/godotenv"

	"github.com/callprivada/fwlc-backend/internal/config"
)

// worker entrypoint reservado para jobs assíncronos (ex.: limpeza de chamadas
// expiradas, pós-processamento de vídeo). Sem jobs implementados ainda —
// adicionar a partir da fase do roadmap que os exigir.
func main() {
	_ = godotenv.Load()
	cfg := config.Load()
	log.Printf("fwlc-worker starting (env=%s) — nenhum job registrado ainda", cfg.AppEnv)
}
