# TODO.md — Fake WhatsApp Live Call

Regras:
- Quando uma tarefa terminar, marque como concluída (`[x]`) — nunca remova.
- Sempre adicione novas tarefas conforme forem identificadas.
- Tarefas de escopo descontinuado são marcadas `[~] (obsoleta — ver pivot 2026-06-29)`, nunca apagadas.

## Fase 0 — Documentação e setup inicial
- [x] Criar estrutura `docs/`.
- [x] Criar PROJECT.md, ROADMAP.md, ARCHITECTURE.md, DATABASE.md, API.md, RULES.md, TODO.md, DECISIONS.md, CHANGELOG.md.
- [x] Criar CLAUDE.md na raiz do projeto.

## Pivot 2026-06-29 — Fake WhatsApp Live Call
- [x] Reescrever PROJECT.md, ARCHITECTURE.md, DATABASE.md, API.md, RULES.md, ROADMAP.md para o novo escopo.
- [x] Registrar pivot e novas decisões em DECISIONS.md.
- [ ] Aprovação do responsável para iniciar Fase 1 (Estrutura base) do novo roadmap.

## Bugs corrigidos / melhorias (fora de fase)
- [x] `signal_drop` / `screenshot_alert` overlays nunca descartados — `useCallback` em `dismissEvent`/`resumeVideo`.
- [x] Preview de vídeo em `/calls/new` não funcionava — `playInline={true}` + `stopPropagation`.
- [x] `age_gate` adicionado como evento de verificação +18 com cobrança PIX.
- [x] Propagação de moeda (BRL/EUR/USD/GBP) em todas as páginas do frontend.
- [x] WayMB: webhook lookup por `waymb_txn_id`, auth no body, persistência de dados Multibanco.
- [x] WayMB: `referenceData.expiresAt` agora aceita string ou número ao desserializar a resposta da API.
- [x] Pagamentos públicos: `/public/calls/:slug` expõe `active_gateway` e as telas de cobrança trocam de PIX para WayMB quando configurado.
- [x] Limite `max_videos` do plano aplicado no upload de vídeo (backend + frontend badge).

### Tarefas do escopo anterior (CallPrivada genérico) — obsoletas
- [~] (obsoleta) Criar estrutura de pastas do backend (Clean Architecture) — refeita na Fase 1 do novo roadmap.
- [~] (obsoleta) Criar estrutura de pastas do frontend (React) — refeita na Fase 1 do novo roadmap.
- [~] (obsoleta) Configurar docker-compose (Postgres + MinIO) — refeita na Fase 1 do novo roadmap (inclui Redis, nginx).
- [~] (obsoleta) Cadastro de usuário/criador — substituído por cadastro simples (Fase 2 do novo roadmap).
- [~] (obsoleta) Dashboard do criador / Perfil/vitrine — vitrine não existe mais no novo escopo.
- [~] (obsoleta) Upload de vídeo/mídia genérico — substituído por upload de vídeo de chamada (Fase 4 do novo roadmap).
- [~] (obsoleta) Player de vídeo genérico — substituído pela página pública de chamada (Fase 6).
- [~] (obsoleta) Timeline de conteúdos/eventos genérica — substituída pelo editor de timeline de call_events (Fase 7).
- [~] (obsoleta) Eventos agendados / motor de agendamento por data — substituído por eventos disparados pelo tempo do vídeo (Fase 7).
- [~] (obsoleta) Assinaturas/planos genéricos — refeito especificamente com Stripe (Fase 3 do novo roadmap).
- [~] (obsoleta) Analytics genérica (conversão/receita) — substituída por analytics de visita/tempo assistido (Fase 9).
- [~] (obsoleta) Pipeline CI/CD e deploy genérico — refeito na Fase 13 do novo roadmap.

## Fase 1 — Estrutura base
- [x] Estrutura de pastas backend (Clean Architecture).
- [x] Estrutura de pastas frontend (Vite/React/TS).
- [x] docker-compose.yml (postgres, redis, minio, backend, frontend, nginx).
- [x] Makefile.
- [x] GitHub Actions inicial (lint + build).
- [ ] Aprovação do responsável para iniciar Fase 2.

## Fase 2 — Autenticação
- [x] Migrations `users`, `sessions`, `password_reset_tokens`.
- [x] Registro, login, JWT + refresh, logout, reset de senha.
- [x] Middleware de auth (RequireAuth, RequireAdmin) + guards no frontend (PrivateRoute).
- [x] Telas Login/Cadastro.
- [ ] Aprovação do responsável para iniciar Fase 3.

## Fase 3 — Assinatura (AbacatePay/PIX)
- [x] Migrations `plans`, `subscriptions`.
- [x] AbacatePay Checkout + webhook (HMAC-SHA256).
- [x] Middleware `RequireSubscription` (bloqueio por assinatura).
- [x] Tela Assinatura (`/subscription`).
- [ ] Aprovação do responsável para iniciar Fase 4.

## Fase 4 — Upload de vídeo
- [x] Migration `videos`.
- [x] Cliente S3/MinIO (AWS SDK v2, multipart 10MB/parte, path-style para MinIO).
- [x] Validação MIME real (magic bytes via `http.DetectContentType`), limite 2GB.
- [x] VideoService: Upload, List, GetByID, PresignURL (1h), Delete.
- [x] VideoHandler: POST/GET/DELETE `/videos`, GET `/videos/:id/url`.
- [x] Middleware RequireSubscription aplicado nas rotas de vídeo.
- [x] Tela `/videos` com progresso de upload, lista, status badge e exclusão.
- [ ] Upload de imagens (thumbnail/foto de contato) — postergado para Fase 5 (usado na criação de chamada).
- [ ] Aprovação do responsável para iniciar Fase 5.

## Fase 5 — Criação de chamada e link público
- [x] Migration `calls` (slug único, status, expires_at, contact_photo_key).
- [x] CRUD de chamadas + geração de slug único (6 bytes URL-safe, retry até 10x).
- [x] Upload de foto de contato e thumbnail via `POST /calls/:id/image/:kind`.
- [x] Endpoint público `GET /public/calls/:slug` (sem auth, retorna video_url pré-assinada 4h).
- [x] Telas `/calls`, `/calls/new`, `/calls/:id/edit` (com link público + botão copiar).
- [ ] Aprovação do responsável para iniciar Fase 6.

## Fase 6 — Página pública (clone WhatsApp)
- [x] Página `/c/:slug` com UI estilo tela de chamada WhatsApp Web.
- [x] Player `<video>` autoplay, fullscreen, sem controles nativos, sem download, sem clique-direito, sem seleção de texto.
- [x] Cronômetro de duração em tempo real (MM:SS).
- [x] Foto do contato (ou avatar SVG padrão), nome exibido, badge "Chamada de vídeo WhatsApp".
- [x] Miniatura de câmera própria (canto superior direito).
- [x] Controles decorativos: microfone (toggle), câmera (toggle), encerrar chamada, alto-falante, emoji.
- [x] Estados: loading, expired (410/404), error.
- [x] CSS global: `video::-webkit-media-controls` oculto via stylesheet.
- [x] Botão encerrar chamada (`PhoneOff`) funcional — pausa vídeo e exibe tela "Chamada encerrada".
- [ ] Aprovação do responsável para iniciar Fase 7.

## Fase 7 — Editor de timeline e eventos
- [x] Migration `call_events` (trigger_at_seconds, type, title, description, button_text, button_color).
- [x] CRUD de eventos: POST/GET `/calls/:callId/events`, PUT/DELETE `/events/:id`.
- [x] Endpoint público `/public/calls/:slug` atualizado para retornar `events[]`.
- [x] Editor de timeline (`/calls/:id/timeline`): formulário + lista visual com linha do tempo.
- [x] Disparo client-side no player público via `video.ontimeupdate` + `currentTime` (sem agendamento server-side).
- [x] Overlays: `popup`, `fullscreen`, `fake_billing`, `offer_call`, `countdown`, `upsell`.
- [x] Overlay `reconnect_paywall` — queda de internet simulada com paywall PIX para restaurar.
- [x] Overlay `signal_drop` — sinal fraco visual, auto-descarta, mantém usuário ansioso.
- [x] Pausa do vídeo durante exibição do evento; retomada ao clicar no botão.
- [x] Link "Timeline de eventos" adicionado ao EditCallPage.
- [x] Status bar falsa (hora/sinal/bateria) na página de chamada.
- [x] Badge "🔒 Criptografia de ponta a ponta" na chamada.
- [x] Notificações falsas de WhatsApp durante a chamada (retenção).
- [x] Área de rastreamento (Facebook Pixel, TikTok Pixel, GA4, GTM, UTMify, script custom) — `user_tracking_configs` + UI + injeção automática em páginas públicas.
- [x] Integração Dracofy — token por usuário em `user_tracking_configs.dracofy_token`; configurável no dashboard em Rastreamento; script injetado dinamicamente nas páginas públicas via `useTrackingScripts`.
- [x] Redirecionamento ao encerrar chamada — campo `end_call_redirect_url` em `calls`; picker de presell + URL manual no editor; redirect automático ao fim do vídeo e ao clicar em encerrar.
- [x] Câmera do usuário arrastável — drag com Pointer Events API, clamp nas bordas da tela.
- [x] Presell editor corrigido — `presellConfigDTO` agora inclui todos os campos novos (slots, countdown, viewers, location, video, comments); `configFromDTO` e `toPresellDTO` atualizados.
- [ ] Aprovação do responsável para iniciar Fase 8.

## Fase 8 — Dashboard
- [x] Endpoint `/dashboard/summary`.
- [x] Tela Dashboard.
- [ ] Aprovação do responsável para iniciar Fase 9.

## Fase 9 — Analytics e visitas
- [x] Migrations `visits`.
- [x] Tracking de visita (IP/geo/device/browser/OS/origem/tempo assistido).
- [x] Endpoint e tela de Analytics.
- [ ] Aprovação do responsável para iniciar Fase 10.

## Fase 10 — Painel Admin
- [x] Migrations `audit_logs`.
- [x] Endpoints e telas admin (usuários, assinaturas, chamadas, logs, bloquear, cancelar).
- [ ] Aprovação do responsável para iniciar Fase 11.

## Fase 11 — WebSocket e tempo real
- [x] Hub WebSocket `/ws/dashboard`.
- [x] Notificações em tempo real no dashboard (nova visita, PIX recebido).
- [ ] Aprovação do responsável para iniciar Fase 12.

## Melhorias pós-fase 11 (fora do roadmap — aprovadas pelo responsável)
- [x] Dashboard redesenhado (dark premium, StatCards, QuickActions com ícones lucide-react).
- [x] Vídeo não pausa ao exibir overlay de evento (popup, fullscreen, fake_billing).
- [x] Opção loop/encerramento do vídeo: toggle no EditCallPage + tela de encerramento estilo WhatsApp.
- [x] Migration 000017: `loop_video BOOLEAN DEFAULT true` na tabela `calls`.
- [x] Editor de vídeo: novos tipos de camada para vendas (offer_call, countdown, upsell).
- [x] Editor de vídeo: campo `duration_seconds` por evento (duração configurável da camada).
- [x] Editor de vídeo: chips na timeline com largura proporcional à duração.
- [x] Editor de vídeo: painel de camadas agrupado por categoria (Engajamento / Vendas / Pagamento).
- [x] Editor de vídeo: preview dos novos tipos no frame do celular.
- [x] EventOverlay: novos overlays (CountdownOverlay com timer real, OfferCallOverlay, UpsellOverlay).
- [x] EventOverlay: auto-dismiss após `duration_seconds` (exceto countdown que usa o timer interno).
- [x] Migration 000018: `duration_seconds INT DEFAULT 0` e `offer_call_slug TEXT DEFAULT ''` em `call_events`.
- [x] TimelineEditorPage: atualizado para reconhecer novos tipos de evento.

## Fase 12 — Segurança, testes e hardening
- [x] Rate limiting Redis (sliding-window, fail-open).
- [x] Headers de segurança OWASP (CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy).
- [x] Testes unitários backend (domain, JWT, ZuckPay, LocalStorage, UA parser) — 25 testes, 0 falhas.
- [ ] Aprovação do responsável para iniciar Fase 13.

## Melhorias pós-fase 12 — Rebranding "rodar hot" (aprovadas)
- [x] Brand "FakeCall" → "HotCall" em `AppLayout.tsx`.
- [x] Nav labels: "Chamadas"→"Funis", "Dashboard"→"Painel", "Assinatura"→"Plano".
- [x] `DashboardPage.tsx` reescrito com vocabulário de performance marketing (funis, leads, PIX).
- [x] `CallsPage.tsx` — "Funis de Chamada", badge "X rodando", empty state afiliado.
- [x] `SubscriptionPage.tsx` — features e CTAs voltados para afiliados, PIX em destaque.
- [x] `NewCallPage.tsx` — labels "Nome da campanha", "Nome do contato", "Criar funil", "Cobrar na entrada (PIX)".
- [x] `EditCallPage.tsx` — mesmos labels atualizados.
- [x] `use-image-upload.ts` — hook de preview local com blob URL + `setServerUrl()`.
- [x] `ImageDropzone.tsx` — dropzone com drag-and-drop e preview de imagem.
- [x] `VideoDropzone.tsx` — dropzone com drag-and-drop e preview de vídeo.
- [x] `VideosPage.tsx` — `VideoDropzone` sempre visível.
- [x] Backend: presign de `contact_photo_url` no `GET /calls/:id` autenticado.
- [x] Admin page: `EmptyState` e `ErrorState` em todas as abas.
- [x] Audit log: seed de registro de teste via psql.

## Presell Pages (feature aprovada 2026-07-04)
- [x] Migration `000019_create_presell_pages` — tabela `presell_pages` com `config JSONB`.
- [x] Domain `presell_page.go` — `PresellPage`, `PresellConfig`, `PresellPageRepository`.
- [x] Model GORM `presell_page.go` — `presellConfigJSON` (driver JSONB), `ToDomain`/`FromDomain`.
- [x] Repository `presell_repository.go` — CRUD + `FindBySlug` + `SlugExists`.
- [x] Service `presell_service.go` — `Create`, `List`, `GetByID`, `GetPublic`, `Update`, `Delete`, slug aleatório 8 chars.
- [x] Handler `presell_handler.go` — 5 rotas autenticadas + 1 pública (`GET /public/presell/:slug`).
- [x] `main.go` — rotas registradas (`/api/v1/presell` e `/api/v1/public/presell/:slug`).
- [x] `presellService.ts` — tipos, TEMPLATES (5 templates +18), CRUD + público.
- [x] Upload de imagem de presell via `POST /presell/:id/image` (multipart).
- [x] `PresellPreview.tsx` — preview ao vivo com viewer count, countdown e slots dinâmicos.
- [x] `PresellsPage.tsx` — listagem com copiar link, visualizar, editar, excluir.
- [x] `PresellEditorPage.tsx` — editor 4 seções + toggles `use_real_time`, `show_viewer_count`, `show_countdown`.
- [x] `PresellPublicPage.tsx` — página `/p/:slug` pública com horário real do lead, contador animado e countdown.
- [x] `App.tsx` — rotas `/p/:slug`, `/presell`, `/presell/new`, `/presell/:id/edit`.
- [x] `AppLayout.tsx` — item "Presell" na sidebar com ícone `LayoutTemplate`.
- [x] Templates reescritos para nicho +18: Ao Vivo, Íntimo, Urgência, VIP, Direto.
- [x] `ImageDropzone` nos campos de avatar e background (sem URL manual).
- [x] `VideoThumbnail` em `VideosPage` e `NewCallPage`.

## Downsell Pages (feature aprovada 2026-07-05)
- [x] Migration `000024`: coluna `type VARCHAR(20) DEFAULT 'presell'` em `presell_pages`.
- [x] Domain `presell_page.go` — constantes `PresellTypePresell` / `PresellTypeDownsell`, campo `Type` em `PresellPage`.
- [x] Model GORM `presell_page.go` — campo `Type` com default `'presell'`, `ToDomain`/`FromDomain` atualizados.
- [x] Repository `presell_repository.go` — `FindByUserID` aceita `typeFilter` e aplica `WHERE type = ?`.
- [x] Service `presell_service.go` — `Create`, `Update`, `List` aceitam e propagam `Type`/`typeFilter`.
- [x] Handler `presell_handler.go` — `Type` no DTO, `upsertPresellRequest`, `toPresellDTO`, `Create`, `Update`, `List` (query param `?type=`), `GetPublic`.
- [x] `presellService.ts` — campo `type` em `PresellPage` e `UpsertPresellPayload`; `listPresells(page, type)` com type param; `listDownsells(page)` helper; `DOWNSELL_TEMPLATES` (4 templates).
- [x] `PresellEditorPage.tsx` — prop `pageType?: string`; templates dinâmicos; `type` no payload; back link e título dinâmicos.
- [x] `PresellPublicPage.tsx` — prop `isDownsell?: boolean`; banner vermelho "⚠️ ESPERA!" no topo.
- [x] `DownsellEditorPage.tsx` — wrapper thin: `<PresellEditorPage pageType="downsell" />`.
- [x] `DownsellPublicPage.tsx` — wrapper thin: `<PresellPublicPage isDownsell />`.
- [x] `DownsellsPage.tsx` — listagem de downsells com link `/d/:slug`, ações editar/excluir.
- [x] `App.tsx` — rotas `/d/:slug`, `/downsell`, `/downsell/new`, `/downsell/:id/edit`.
- [x] `AppLayout.tsx` — item "Downsell" na sidebar com ícone `TrendingDown`.

## Melhorias pós-fase 12 — Editor de vídeo avançado (aprovadas 2026-07-05)
- [x] Migration `000023`: campos `playback_rate`, `video_zoom`, `video_x`, `video_y` em `calls`.
- [x] Backend: domain, model, service, handler e endpoint público atualizados com os novos campos.
- [x] Editor de vídeo: controles de zoom (1x–3x) e posição X/Y do vídeo com botão de reset.
- [x] Editor de vídeo: velocidade (`playback_rate`) salva junto com o corte ao clicar "Salvar corte".
- [x] Editor de vídeo: preview do PhoneFrame reflete zoom/posição em tempo real.
- [x] Chamada pública: aplica `playback_rate`, `video_zoom`, `video_x`, `video_y` do banco.
- [x] Chamada pública: `end_time_seconds` respeitado via `timeupdate` (loop para `start_time_seconds` ou encerra).

## Fase 13 — Deploy
- [x] Seed de usuário admin na inicialização do backend (idempotente).
- [x] `docker-compose.yml` ajustado para produção: sem nginx, containers backend/frontend na rede `convtrack_default` do Caddy.
- [x] `docs/DEPLOY.md` — tutorial completo de deploy (aaPanel + Docker + Caddy + MinIO + DNS).
- [ ] Pipeline GitHub Actions completo + variáveis de produção.

## Modo Créditos por Minuto (aprovado 2026-07-06)
- [x] Migration `000027`: coluna `billing_mode VARCHAR(20) DEFAULT 'none'` em `calls`.
- [x] Backend: domain, model, service, handler e endpoint público atualizados com `billing_mode`.
- [x] `CreditsOverlay.tsx` — componente React com estados: `select` (escolha de pacote), `pix` (QR + polling), `active` (badge flutuante com tempo), `warning` (2min restantes), `topup` (recarga durante call), `ended` (saldo zerado).
- [x] Pacotes fixos: 5min/R$10, 15min/R$25, 30min/R$45, 60min/R$80.
- [x] `EditCallPage.tsx` — toggle "Créditos por minuto" + listagem dos pacotes disponíveis.
- [x] `CallPublicPage.tsx` — renderiza `CreditsOverlay` quando `billing_mode === 'credits'`.

## Funil Completo + Upsell (aprovado 2026-07-06)
- [x] Migration `000028`: coluna `upsell_slug VARCHAR(20) DEFAULT ''` em `call_events`.
- [x] Domain/model/service/handler de `call_events` propagam `UpsellSlug`.
- [x] `PresellTypeUpsell = "upsell"` adicionado ao domain de presell_pages.
- [x] Backend: rota pública `/c/:slug` expõe `upsell_slug` e `billing_collect_payer_info`/`billing_payer_email` nos eventos.
- [x] `UPSELL_TEMPLATES` (3 templates) + `listUpsells()` adicionados ao `presellService.ts`.
- [x] `UpsellsPage.tsx`, `UpsellEditorPage.tsx`, `UpsellPublicPage.tsx` criados.
- [x] Rotas `/u/:slug`, `/upsell`, `/upsell/new`, `/upsell/:id/edit` adicionadas ao `App.tsx`.
- [x] `AppLayout.tsx` — itens "Funis" e "Upsell" na sidebar.
- [x] `EventOverlay.tsx` — botão do evento `upsell` navega para `/u/:upsell_slug`.
- [x] `TimelineEditorPage.tsx` — seletor de upsell_slug no evento `upsell`; seletor de offer_call_slug no evento `offer_call`.
- [x] `PresellEditorPage.tsx` — suporta `pageType="upsell"` com templates próprios; seletor de upsell pós-call.
- [x] `PresellPublicPage.tsx` — suporta `isUpsell` com banner roxo e sem exit-intent.
- [x] `EditCallPage.tsx` — seletor de upsell pós-call (preenche `end_call_redirect_url`).
- [x] `FunnelsPage.tsx` — visão completa do funil: presell → call → upsell + downsell do presell.

## 4 Features — Vínculos / Analytics / Preview Mobile / Limites (2026-07-06)
- [x] Migration `000029`: coluna `cta_clicks INT DEFAULT 0` em `presell_pages`.
- [x] Migration `000030`: colunas `max_calls`, `max_presells`, `max_videos INT DEFAULT 0` em `plans`.
- [x] Backend: `PresellPageRepository` — métodos `FindByCallID`, `CountByUserID`, `IncrementCTAClicks`.
- [x] Backend: `CallRepository` — método `CountByUserID`.
- [x] Backend: `PlanRepository` — método `Update`.
- [x] Backend: rota `GET /calls/:id/presells` — retorna presells vinculados à chamada.
- [x] Backend: rota `POST /public/presell/:slug/cta-click` — incrementa `cta_clicks`.
- [x] Backend: rota `PUT /admin/plans/:id/limits` — configura `max_calls`, `max_presells`, `max_videos`.
- [x] Backend: `CallService.CheckCreateLimit` + `PresellService.CheckCreateLimit` — barram criação quando limite atingido.
- [x] Backend: domínio `ErrPlanLimitReached` + resposta HTTP 403 `plan_limit_reached`.
- [x] Frontend: `EditCallPage` — painel "Presells vinculados" com CTA clicks, links de edição e criação.
- [x] Frontend: `AnalyticsPage` — seção "Funil de conversão" com CTA clicks / visitas / % conversão por presell.
- [x] Frontend: `PresellPublicPage` — dispara `trackCTAClick` ao clicar no CTA.
- [x] Frontend: `TimelineEditorPage` — phone frame preview (lado direito, sticky, mostra overlay do evento selecionado).
- [x] Frontend: `AdminPage` — aba "Planos" com edição de limites por plano.
- [x] Frontend: `SubscriptionPage` — exibe badges de limites do plano ativo.

## Admin panel completo (2026-07-06)
- [x] Backend: `PlanRepository.Create` + `FindAllAdmin`.
- [x] Backend: `SubscriptionService.CreatePlan` + `UpdatePlan` (full) + `ListAllPlans`.
- [x] Backend: `AdminService.CreateUser` (sem fluxo de email, hash bcrypt direto).
- [x] Backend: `AdminService.AssignPlan` (assinatura ativa sem pagamento, cancela anterior).
- [x] Backend: rotas `POST /admin/plans`, `PUT /admin/plans/:id`, `GET /admin/plans`, `POST /admin/users`, `POST /admin/users/:id/assign-plan`.
- [x] Frontend: `AdminPage` — aba Planos com CRUD completo (criar, editar tudo, toggle ativo).
- [x] Frontend: `AdminPage` — aba Usuários com "Criar usuário" e "Vincular plano" por linha.

## UX Flow — Melhorias de criação e uso (2026-07-06)
- [x] `NewCallPage.tsx` — redireciona para `/calls/:id/edit?created=1` após criar.
- [x] `EditCallPage.tsx` — banner "3 passos para lançar" ao chegar com `?created=1`; fecha e limpa o param.
- [x] `EditCallPage.tsx` — atalhos rápidos: Timeline, Editor de vídeo, Analytics.
- [x] `EditCallPage.tsx` — painel "Presells vinculados" com badges de tipo e link de criação.
- [x] `CallsPage.tsx` — health bar por card (eventos / presell / foto); atalho de timeline; confirmação de exclusão inline.
- [x] `DashboardPage.tsx` — `SetupChecklist` para usuários sem chamadas (5 passos acionáveis); `FunnelGuide` para usuários com chamadas.


## WayMB — Gateway europeu (aprovado 2026-07-11)
- [x] Migrations 000032 e 000033: campos WayMB em `user_payment_configs` e `billing_transactions`.
- [x] Pacote `internal/waymb/client.go` — `CreateTransaction` (mbway/multibanco/bizum) + `GetTransactionInfo`.
- [x] Domain `user_payment_config.go` — campos WayMB + `ActiveGateway` + `IsWayMBConfigured()` + `Gateway()`.
- [x] Domain `billing_transaction.go` — campos `Gateway`, `WayMBTxnID`, `WayMBMethod`, `Multibanco*`.
- [x] Models e repositories atualizados (Upsert propaga todos os campos WayMB, `UpdateWayMBTxnID`).
- [x] `PaymentConfigService.Save` aceita `SavePaymentConfigInput` com todos os campos.
- [x] `BillingService` — `CreateWayMBPayment`, `GetWayMBStatus`, `ProcessWayMBWebhook`.
- [x] `BillingHandler` — `CreateWayMBPayment`, `GetWayMBStatus`, `WayMBWebhook`.
- [x] Rotas: `POST /public/calls/:slug/billing/waymb`, `GET /public/billing/transactions/:id/waymb-status`, `POST /webhooks/waymb`.
- [x] `PaymentSettingsPage` — seletor ZuckPay/WayMB + seções colapsáveis + webhook URL de cada gateway.
- [x] `paymentConfigService.ts` — tipos e `savePaymentConfig` atualizados para WayMB.
- [x] `billingService.ts` — `createWayMBPayment` e `checkWayMBStatus`.
- [x] `CreditsOverlay` — mode `method` (seleção MB WAY/Multibanco/Bizum) + mode `waymb` (tela pós-criação com dados de Multibanco ou confirmação MB WAY/Bizum).

## Dashboard & Downsell — 2026-07-12
- [x] `DashboardPage.tsx` / `dashboardService.ts` — filtro por intervalo de data personalizado no painel de Pagamentos (tab "Período" + date pickers from/to).
- [x] Backend `billing_transaction_repository.go` + `billing_service.go` + `billing_handler.go` — suporte a `period=custom&from=YYYY-MM-DD&to=YYYY-MM-DD`.
- [x] `PresellEditorPage.tsx` — cores do design system unificadas (green → pink `#FE015C`): inputCls, Toggle, botão salvar, estado ativo de template.
- [x] `presellService.ts` — campos `original_price_label`, `discounted_price_label`, `discount_badge` em `PresellConfig`.
- [x] `PresellEditorPage.tsx` — bloco "preço/desconto" exclusivo para downsell (preço original riscado + preço com desconto + badge).
- [x] `PresellPublicPage.tsx` — bloco de comparação de preço renderizado na página pública do downsell.
