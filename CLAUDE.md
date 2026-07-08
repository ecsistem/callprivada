# Regras do Projeto — Fake WhatsApp Live Call

- Sempre ler a pasta `docs/` antes de modificar qualquer código.
- Nunca quebrar a Clean Architecture.
- Backend: Go 1.24+, Gin, GORM, PostgreSQL, Redis, JWT, WebSocket, AbacatePay (PIX — substituiu Stripe em 2026-07-02).
- Frontend: React, Vite, TypeScript, React Router, React Query, TailwindCSS, shadcn/ui, Zustand, Axios.
- Infra: Docker, Docker Compose, MinIO/S3, nginx (HTTPS ready), Makefile, GitHub Actions.
- Sempre atualizar `docs/TODO.md`.
- Sempre atualizar `docs/CHANGELOG.md`.
- Nunca remover código ou regra sem justificar em `docs/DECISIONS.md`.
- Sempre seguir o `docs/ROADMAP.md` (13 fases) — nunca implementar fora dele, nunca pular fases, nunca misturar duas fases.
- Esperar aprovação explícita antes de iniciar a próxima fase.

## Fluxo de trabalho obrigatório
1. Ler todos os arquivos em `docs/`.
2. Atualizar `docs/TODO.md`.
3. Planejar.
4. Implementar.
5. Atualizar `docs/CHANGELOG.md`.
6. Atualizar `docs/ROADMAP.md`.
7. Atualizar `docs/API.md` caso necessário.
8. Atualizar `docs/DATABASE.md` caso necessário.
9. Atualizar `docs/PROJECT.md` caso necessário.
10. Informar o que foi feito.

## Notas
- O projeto sofreu um pivot de escopo em 2026-06-29: de plataforma genérica de
  conteúdo por assinatura (CallPrivada) para um produto único — Fake WhatsApp
  Live Call. Ver `docs/DECISIONS.md` para o histórico da decisão.
- `linkpriv-clone/` na raiz não é mais referência relevante para este produto.
- Os eventos da timeline (`call_events`) são disparados client-side, sincronizados
  pelo tempo do `<video>` na página pública — não usar agendamento por data/hora
  do servidor para isso.
- Nenhuma tarefa deve ser concluída sem antes consultar `docs/`.
