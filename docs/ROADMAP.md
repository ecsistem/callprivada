# ROADMAP.md — Fake WhatsApp Live Call

Cada fase só é iniciada após aprovação explícita do responsável pelo projeto.
Nunca misturar duas fases. Nunca pular etapas.

## Fase 1 — Estrutura base
- Estrutura de pastas backend (Clean Architecture) e frontend (Vite/React/TS).
- `docker-compose.yml` com postgres, redis, minio, backend, frontend, nginx.
- Makefile (up, down, migrate, test, lint).
- Configuração inicial GitHub Actions (lint + build).
- Config tipada (env vars) no backend.

## Fase 2 — Autenticação
- Migrations: `users`, `sessions`.
- Registro, login, JWT + refresh token, logout, reset de senha.
- Middleware de auth (Gin) e guards de rota (frontend).
- Telas: Login, Cadastro.

## Fase 3 — Assinatura (Stripe)
- Migrations: `plans`, `subscriptions`.
- Integração Stripe Checkout + webhook.
- Middleware de bloqueio por assinatura (gate para criar chamadas).
- Tela: Assinatura/Perfil (status do plano).

## Fase 4 — Upload de vídeo
- Migrations: `videos`.
- Upload resumable para MinIO/S3, validação MIME/tamanho (até 2GB), progresso.
- Endpoint de upload de imagens (thumbnail/foto de contato).

## Fase 5 — Criação de chamada e link público
- Migrations: `calls`.
- Endpoint de criação/edição/listagem de chamadas, geração de `slug`.
- Tela: Nova chamada / Editar chamada.
- Endpoint público `GET /public/calls/:slug`.

## Fase 6 — Página pública da chamada (clone visual WhatsApp)
- Página `/c/:slug`: UI estilo tela de chamada do WhatsApp Web.
- Player autoplay, tela cheia, sem controles/download/clique-direito.
- Cronômetro de duração, nome, foto, ícones.

## Fase 7 — Editor de timeline e eventos
- Migrations: `call_events`.
- CRUD de eventos (popup, fullscreen, fake_billing).
- Editor de timeline no frontend (estilo editor de vídeo).
- Disparo dos eventos no player público no segundo exato.

## Fase 8 — Dashboard ✅ Concluída (2026-07-03)
- Endpoint de resumo (`/dashboard/summary`).
- Tela Dashboard: quantidade de chamadas, visualizações, links ativos, plano.

## Fase 9 — Analytics e visitas
- Migrations: `visits`.
- Tracking de visita (IP, geo, device, browser, OS, origem, tempo assistido).
- Endpoint e tela de Analytics por chamada.

## Fase 10 — Painel Admin
- Migrations: `audit_logs`.
- Endpoints admin (usuários, assinaturas, vídeos, chamadas, logs, bloquear, cancelar).
- Telas admin correspondentes.

## Fase 11 — WebSocket e tempo real
- Hub de WebSocket (`/ws/dashboard`).
- Notificações em tempo real de visita/upload no dashboard do usuário.

## Fase 12 — Segurança, testes e hardening
- Rate limiting (Redis), CORS, headers de segurança, validação/sanitização revisadas.
- Testes unitários e de integração (backend), testes de componentes (frontend).

## Fase 13 — Deploy
- nginx com HTTPS, pipeline GitHub Actions completo (build + deploy), variáveis de produção.

---

## Status das fases
| Fase | Nome | Status |
|------|------|--------|
| 1 | Estrutura base | Concluída |
| 2 | Autenticação | Concluída |
| 3 | Assinatura (AbacatePay/PIX) | Concluída |
| 4 | Upload de vídeo | Concluída |
| 5 | Criação de chamada e link público | Concluída |
| 6 | Página pública (clone WhatsApp) | Concluída |
| 7 | Editor de timeline e eventos | Concluída |
| 8 | Dashboard | Concluída |
| 9 | Analytics e visitas | Concluída |
| 10 | Painel Admin | Concluída |
| 11 | WebSocket e tempo real | Concluída |
| 12 | Segurança, testes e hardening | Concluída |
| 13 | Deploy | Não iniciada |
