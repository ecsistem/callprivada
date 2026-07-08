# ARCHITECTURE.md — Fake WhatsApp Live Call

## Visão geral

Backend Go/Gin com Clean Architecture, frontend React/Vite consumindo API
REST + WebSocket, mídia em MinIO/S3, dados em PostgreSQL, cache/rate-limit em
Redis, pagamentos via Stripe, tudo orquestrado por Docker Compose com nginx
como reverse proxy/TLS termination.

## Backend — `/backend`

```
backend/
  cmd/
    api/                 # entrypoint do servidor HTTP (main.go)
    worker/               # entrypoint de jobs (ex.: expirar chamadas, limpeza)
  internal/
    config/               # carregamento de env vars, configuração tipada
    domain/               # entidades puras + interfaces de repository/service (sem deps externas)
      user.go, subscription.go, plan.go, video.go, call.go, call_event.go, visit.go, session.go, audit_log.go
    services/             # regras de aplicação (usecases): orquestram repositories + domain
      auth_service.go, user_service.go, subscription_service.go, upload_service.go,
      call_service.go, event_service.go, visit_service.go, analytics_service.go, admin_service.go
    repositories/          # interfaces (contratos) — implementação fica em infra via GORM
    handlers/              # HTTP handlers (Gin) — tradução request/response <-> service
      auth_handler.go, user_handler.go, subscription_handler.go, upload_handler.go,
      call_handler.go, event_handler.go, visit_handler.go, analytics_handler.go,
      admin_handler.go, webhook_handler.go
    middlewares/           # auth (JWT), rate limit, CORS, logging, recovery, admin-only
    models/                # structs GORM (mapeamento tabela <-> struct), separados de domain
    storage/               # implementação de upload (MinIO/S3 SDK), geração de URLs assinadas
    stripe/                 # client Stripe, criação de checkout, tratamento de webhook
    ws/                     # hub de WebSocket (notificações em tempo real, ex. visita ao vivo)
    utils/                  # helpers puros (slug, hash, validação, paginação)
  migrations/              # SQL migrations versionadas
  pkg/                     # (se necessário) código compartilhável fora do módulo
```

**Regras de dependência (Clean Architecture):**
- `domain` não importa nada de `infra`, `handlers`, `services`.
- `services` dependem apenas de interfaces definidas em `domain`/`repositories`.
- `repositories` (implementação GORM) e `storage`/`stripe`/`ws` são "infra": implementam interfaces de `domain`.
- `handlers` dependem de `services`, nunca de `repositories`/GORM diretamente.
- Injeção de dependência manual: `main.go` monta repositories → services → handlers e injeta via construtores.

## Frontend — `/frontend`

```
frontend/
  src/
    components/        # componentes reutilizáveis (UI, shadcn/ui customizados)
    pages/              # telas/rotas: Login, Register, Dashboard, NewCall, EditCall,
                         # TimelineEditor, Subscription, Profile, Analytics, PublicCall,
                         # AdminUsers, AdminSubscriptions, AdminVideos, AdminCalls, AdminLogs
    hooks/              # hooks customizados (useAuth, useCall, useUpload, useTimeline...)
    services/            # camada de API (Axios instances + funções por domínio)
    stores/              # Zustand (auth store, upload store, timeline editor store)
    layouts/             # AuthLayout, DashboardLayout, PublicCallLayout, AdminLayout
    types/               # tipos TS compartilhados (mirror dos DTOs do backend)
    routes/              # definição de rotas (React Router) + guards (auth/admin)
    styles/              # Tailwind config/globals
```

## Comunicação

- Frontend ↔ Backend: REST/JSON (Axios + React Query), autenticação via JWT Bearer + refresh token via cookie httpOnly ou endpoint dedicado.
- Eventos da timeline: disparados client-side, sincronizados pelo tempo do `<video>`; **não** dependem de WebSocket para funcionar (precisam ser instantâneos e offline-resilientes).
- WebSocket: usado para feedback em tempo real ao assinante (ex.: "alguém está vendo sua chamada agora", progresso de upload entre abas, contagem de visitas ao vivo no dashboard).
- Backend ↔ Storage: SDK S3-compatível (MinIO em dev/self-host, S3 em produção), uploads resumable (multipart) com URLs assinadas.
- Backend ↔ Stripe: Checkout Session para assinatura, Webhook (`/webhooks/stripe`) para sincronizar `subscriptions`.
- nginx: termina TLS, faz proxy para backend (`/api`, `/ws`) e serve o build estático do frontend; também roteia `/c/:slug` para o frontend (SPA) que busca os dados públicos via API.

## Segurança (camadas)

- JWT de curta duração + refresh token rotativo, ambos validados via middleware.
- Rate limiting via Redis (por IP e por usuário) em rotas sensíveis (login, upload, endpoint público de chamada).
- CORS restrito a origens conhecidas; headers de segurança tipo Helmet (CSP, X-Frame-Options, etc.) aplicados no Gin.
- Validação e sanitização de entrada em todos os handlers (DTOs com validação, nunca bind direto em models GORM).
- Proteção contra SQL Injection: GORM com query parametrizada, nunca SQL concatenado.
- Proteção contra XSS: sanitização de campos ricos (descrição de evento), CSP no frontend.
- Proteção contra CSRF: tokens CSRF em formulários autenticados via cookie, ou uso exclusivo de Bearer token (a confirmar em [DECISIONS.md](DECISIONS.md)).
- Upload seguro: validação de MIME real (não só extensão), limite de tamanho, nome de arquivo gerado pelo backend (nunca o nome enviado pelo cliente).
- Página pública da chamada bloqueia clique-direito, seleção e tentativa de download via JS + headers, sabendo que isso é mitigação de UX, não segurança real.

## Ambientes

- Local/dev: `docker-compose.yml` com backend, frontend (Vite dev ou build), postgres, redis, minio, nginx.
- CI: GitHub Actions (lint, testes, build de imagens).
- Produção: a detalhar na Fase 10 (Deploy).
