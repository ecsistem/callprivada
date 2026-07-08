# API.md — Fake WhatsApp Live Call

> Nenhuma rota implementada ainda. Contrato previsto, a confirmar/ajustar
> durante a implementação de cada fase.

## Convenções
- Base path: `/api/v1`
- Auth: `Authorization: Bearer <jwt>` (exceto rotas públicas e webhook)
- Erros: `{ "error": { "code": string, "message": string } }`
- Paginação: `?page=1&per_page=20`

## Auth
- `POST /auth/register` — `{name, email, password}` → `{user, access_token, refresh_token}` — público
- `POST /auth/login` — `{email, password}` → `{user, access_token, refresh_token}` — público
- `POST /auth/refresh` — `{refresh_token}` → `{access_token, refresh_token}` — público (token válido)
- `POST /auth/logout` — revoga sessão — autenticado
- `POST /auth/forgot-password` — `{email}` — público
- `POST /auth/reset-password` — `{token, new_password}` — público

## Users
- `GET /users/me` — perfil do usuário autenticado
- `PUT /users/me` — atualizar nome/senha
- `DELETE /users/me` — encerrar conta

## Subscription
- `GET /plans` — lista planos ativos — público
- `POST /subscriptions/checkout` — `{plan_id}` → `{checkout_url}` — autenticado
- `GET /subscriptions/me` — status da assinatura atual — autenticado
- `POST /subscriptions/cancel` — cancela assinatura atual — autenticado

## Upload
- `POST /uploads/videos` — inicia upload resumable → `{upload_id, upload_url}` — autenticado, requer assinatura ativa
- `PATCH /uploads/videos/:upload_id` — chunk/parte do upload — autenticado
- `POST /uploads/videos/:upload_id/complete` — finaliza, valida MIME/tamanho → `{video}` — autenticado
- `POST /uploads/images` — upload de thumbnail/foto/imagem de evento → `{image}` — autenticado

## Calls
- `POST /calls` — cria chamada `{title, video_id, display_name, contact_photo_key, thumbnail_key, start_time_seconds, expires_at}` → `{call}` — autenticado, requer assinatura ativa
- `GET /calls` — lista chamadas do usuário (paginado)
- `GET /calls/:id` — detalhe (dono)
- `PUT /calls/:id` — editar chamada
- `DELETE /calls/:id` — remover/desativar chamada
- `GET /public/calls/:slug` — dados da chamada para a página pública (sem auth) → `{display_name, contact_photo_url, video_url, start_time_seconds, events[]}`

## Events (timeline)
- `POST /calls/:id/events` — cria evento `{trigger_at_seconds, type, title, description, image_key, button_text, button_color}`
- `GET /calls/:id/events` — lista eventos da chamada (dono)
- `PUT /events/:id` — editar evento
- `DELETE /events/:id` — remover evento

## Visits (tracking — chamado pela página pública)
- `POST /public/calls/:slug/visits` — registra início de visita → `{visit_id}` — público, rate-limited
- `PATCH /public/visits/:visit_id` — atualiza `watched_seconds` periodicamente — público, rate-limited

## Analytics
- `GET /calls/:id/analytics` — métricas agregadas (visitantes, tempo médio, origem, cidade, device, browser, OS) — autenticado, dono

## Dashboard
- `GET /dashboard/summary` — `{calls_count, total_views, active_links, plan}` — autenticado

## Webhook
- `POST /webhooks/abacatepay` — eventos de assinatura/pagamento PIX (`subscription.completed`, `subscription.renewed`, `subscription.cancelled`, `transparent.completed`) — verificação via HMAC-SHA256 no header `X-Webhook-Signature`, sem JWT

## Admin (role=admin)
- `GET /admin/users` — lista/busca usuários
- `POST /admin/users/:id/block` — bloquear usuário
- `POST /admin/users/:id/unblock`
- `GET /admin/subscriptions` — lista assinaturas
- `POST /admin/subscriptions/:id/cancel`
- `GET /admin/videos` — lista vídeos
- `GET /admin/calls` — lista chamadas
- `GET /admin/logs` — audit logs (paginado/filtrável)

## WebSocket
- `WS /ws/dashboard` — autenticado (JWT via query/header no handshake) — eventos: `visit.started`, `visit.updated`, `upload.progress`
