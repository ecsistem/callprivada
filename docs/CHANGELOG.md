# CHANGELOG.md — Fake WhatsApp Live Call

Todo entrega de funcionalidade deve ser registrada aqui: o que foi criado,
arquivos alterados/novos, e problemas encontrados.

## [2026-07-13b] — Endpoint para reotimizar vídeos já enviados

### Backend
- `storage`: novo método `Download(ctx, key) (io.ReadCloser, error)` na interface `FileStorage`, implementado em S3 (`GetObject`) e local (`os.Open`).
- `services/video_service.go`: `Reoptimize(userID, videoID)` — baixa o vídeo do storage, roda `optimizeVideo` (compressão + faststart) e regrava no mesmo storage key **apenas se o resultado ficar menor**; atualiza `size_bytes`. `ReoptimizeAll(userID)` percorre todos os vídeos do usuário.
- `handlers/video_handler.go` + rotas: `POST /videos/:id/reoptimize` e `POST /videos/reoptimize-all` (autenticados, com subscription).

### Frontend
- `services/videoService.ts`: `reoptimizeVideo(id)` e `reoptimizeAllVideos()` (timeout estendido — o encode roda no servidor).
- `pages/VideosPage.tsx`: botão ⚡ por vídeo que dispara a reotimização e mostra o ganho (ex: "138 MB → 32 MB (−77%)").

## [2026-07-13] — Performance mobile/Safari + Microsoft Clarity

### Backend
- `services/video_optimize.go` (novo) + `video_service.go` — upload agora otimiza o vídeo: `ffprobe` mede resolução/fps/bitrate e, se for grande (>800px, >30fps ou >2.5 Mbps), recodifica para H.264 ~720p/30fps CRF 26 (preset veryfast) + AAC 128k + `+faststart`; senão faz só o remux faststart. Redução medida no vídeo de produção: 138 MB/6 Mbps → ~32 MB/1.5 Mbps. Fallback seguro para o original se o ffmpeg falhar.
- `Dockerfile` — instala `ffmpeg` (traz `ffprobe`).
- `handlers/file_handler.go` — Content-Type por magic bytes (uploads locais sem extensão eram servidos como `application/octet-stream`, que o iOS Safari não faz streaming progressivo); `Cache-Control: immutable` + `Accept-Ranges: bytes`.
- Tracking: coluna `clarity_project_id` (migration 000036) em domain/model/repo/handler; incluída também nos mapas de tracking das páginas públicas (`call_handler`, `presell_handler`), junto com `dracofy_token` que estava faltando.

### Frontend
- `App.tsx` — code-splitting por rota com `React.lazy` + `Suspense`. O bundle único de 809 KB foi quebrado por página; um lead em `/c/:slug` baixa ~118 KB gzip (framework + página da chamada), sem o editor de vídeo/admin.
- `styles/index.css` — `-webkit-backdrop-filter` no `.glass-input-wrap`; utilitário `.min-h-screen-safe` (`100dvh`).
- `pages/PresellPublicPage.tsx` — usa `.min-h-screen-safe` (evita corte pela barra de endereço no iOS Safari).
- `pages/CallPublicPage.tsx` — `<video>` com `preload="auto"`, `poster` (foto do contato) e `onLoadedData`.
- Clarity: `clarity_project_id` no tipo/serviço, injeção do script em `useTrackingScripts` e campo no `TrackingSettingsPage`.

## [2026-07-12m] — Pixels: InitiateCheckout e Purchase nos pontos corretos

### Frontend
- `hooks/useTrackingScripts.ts` — novo `trackPixelEvent('InitiateCheckout'|'Purchase', {amountCents, currency})`: dispara em todos os pixels carregados — Meta (`fbq`), TikTok (`ttq`, Purchase → `CompletePayment`), GA4 (`gtag`, `begin_checkout`/`purchase`) e GTM (`dataLayer.push`). Nunca lança erro (não pode quebrar o checkout).
- `EventOverlay.tsx` (`PixStep`) — `InitiateCheckout` ao montar a tela de pagamento (1× por overlay) e `Purchase` quando o status vira pago (1×, com o valor real da transação).
- `CreditsOverlay.tsx` — `InitiateCheckout` ao escolher um pacote de minutos; `Purchase` na confirmação (polling e verificação manual). Moeda vem do `getPaymentConfig()`.

## [2026-07-12l] — Fix: botões de horário do presell não eram deletados

### Frontend
- `PresellEditorPage.tsx` — ao carregar um presell existente, o editor só aplicava os `slot_labels` salvos quando a lista era não-vazia; com zero horários salvos, as 3 linhas padrão reapareciam (e um novo save as re-gravava). Agora o estado espelha sempre o que foi salvo, inclusive lista vazia.

## [2026-07-12k] — Fix: evento "Verificação de idade" não era criado

### Backend
- `services/call_event_service.go` — `age_gate` adicionado ao mapa `validEventTypes`. O tipo já estava no binding do handler e no editor, mas o service rejeitava a criação com "tipo de evento inválido: age_gate" — por isso o editor de vídeo não conseguia adicionar a camada. **Requer rebuild do container backend** (junto com o fix do tracking de 2026-07-12f).

## [2026-07-12j] — WayMB Multibanco sem formulário de dados

### Frontend
- `EventOverlay.tsx` e `CreditsOverlay.tsx` — ao escolher **Multibanco**, a cobrança é gerada imediatamente (entidade + referência não dependem do pagador); o body envia placeholders ("Visitante"/"999999990"/e-mail genérico) que satisfazem o binding do handler. **MB WAY** continua exigindo o formulário completo (o push de aprovação vai para o telemóvel do pagador). Retry de erro no EventOverlay volta para a escolha de método.

## [2026-07-12i] — WayMB: método primeiro, todos os campos obrigatórios, erros detalhados

### Frontend
- `EventOverlay.tsx` (`PixStep`) — fluxo invertido: 1) escolha do método (MB WAY/Multibanco), 2) formulário de dados com o método exibido no topo e link "← Trocar método de pagamento". Todos os campos obrigatórios (nome, NIF, e-mail, telemóvel) com validação própria e mensagem inline; erro de pagamento mostra a mensagem real da API (fallbacks por status: 400 dados inválidos, 402/422 recusado, 5xx indisponível, sem resposta = sem ligação); retry volta ao formulário com os dados preservados.
- `CreditsOverlay.tsx` — mesma inversão: pacote → método → dados do pagador → "Pagar agora" (com loading). NIF obrigatório; validação campo a campo; mensagens de erro da API idem.

## [2026-07-12h] — Editor de vídeo: todos os textos dos eventos editáveis

### Frontend
- `lib/eventExtraTexts.ts` — novo: registry `EXTRA_TEXT_FIELDS`/`COMMON_PAY_TEXTS` compartilhado (movido de `TimelineEditorPage.tsx`).
- `VideoEditorPage.tsx` — painel de propriedades do evento ganhou a seção colapsável "✏️ Textos avançados" com os textos secundários do tipo selecionado (mesmos overrides `extra_texts` usados pelos overlays); salvamento usa o mesmo debounce de 500ms dos demais campos.
- `TimelineEditorPage.tsx` — passa a importar o registry compartilhado.

## [2026-07-12g] — WayMB: textos trocados de espanhol para português de Portugal

### Frontend
- `EventOverlay.tsx` e `CreditsOverlay.tsx` — todos os textos do checkout WayMB agora em pt-PT ("A gerar o pagamento…", "Como pretende pagar?", "Telemóvel", "Já efetuei o pagamento", "Sem ligação", "Entidade/Referência", "Pague no ATM ou homebanking", etc.). PIX (ZuckPay) permanece em pt-BR e `extra_texts` continua com prioridade.

## [2026-07-12f] — VideoEditor: defaults válidos para `signal_drop` e `screenshot_alert`

### Frontend
- `frontend/src/pages/VideoEditorPage.tsx` — os defaults dos tipos `signal_drop` e `screenshot_alert` passaram a preencher `title`, evitando falha de validação no backend ao criar a camada.

### Validação
- `npx tsc -p tsconfig.json --noEmit` — ok.

## [2026-07-12f] — Fix save de rastreamento + select de DDI no telefone WayMB

### Backend
- `models/user_tracking_config.go` — colunas explícitas `tiktok_pixel_id` e `utmify_token`: o naming strategy do GORM gerava `tik_tok_pixel_id`/`ut_mify_token` (inexistentes) e o `PUT /settings/tracking` falhava com 500 (SQLSTATE 42703). O GET também retornava esses dois campos sempre vazios. **Requer rebuild do container backend.**

### Frontend
- `components/PhoneInput.tsx` — novo: select de país com bandeira + DDI (padrão 🇵🇹 +351, cobre Europa + Brasil/EUA) ao lado do input de número; emite o telefone completo `+DDInúmero`.
- `EventOverlay.tsx` (form do pagador WayMB) e `CreditsOverlay.tsx` (dados do pagador) — campo de telefone trocado pelo `PhoneInput`.

## [2026-07-12e] — Editor de eventos: whitelist do backend para `age_gate`

### Backend
- `backend/internal/handlers/call_event_handler.go` — a validação do campo `type` passou a aceitar `age_gate`.

### Validação
- `go test ./internal/handlers` — ok.

## [2026-07-12e] — WayMB: textos do checkout em português do Brasil

### Frontend
- `EventOverlay.tsx` — helper `t(key, pt, waymb)`: com gateway WayMB os textos padrão do fluxo de pagamento ficam em português do Brasil (formulário "Nome completo/E-mail/Telefone celular/NIF-DNI", "Como você deseja pagar?", "Gerando pagamento…", "Pagamento confirmado!", "Já realizei o pagamento", Entidade/Referência, telas do reconnect paywall "Sem conexão/Reconectando/Conexão instável"). PIX (ZuckPay) permanece em português e os overrides via `extra_texts` continuam tendo prioridade.
- `CreditsOverlay.tsx` — telas exclusivas do WayMB (dados do pagador, escolha de método, aguardando MB WAY, dados Multibanco) traduzidas para português do Brasil.

## [2026-07-12d] — Pagamentos públicos: switch automático para WayMB

### Backend
- `backend/internal/services/call_service.go` — `PublicCallData` passou a carregar `active_gateway` a partir da configuração do dono.
- `backend/internal/handlers/call_handler.go` — endpoint público `/public/calls/:slug` agora expõe `active_gateway` no payload.

### Frontend
- `frontend/src/services/callService.ts` — `PublicCall.active_gateway` adicionado.
- `frontend/src/pages/CallPublicPage.tsx` — paywall de entrada troca o texto entre PIX e WayMB conforme o gateway público.
- `frontend/src/components/EventOverlay.tsx` — overlays de cobrança passam a criar/consultar WayMB quando o gateway ativo é `waymb`.

### Validação
- `go test ./internal/services ./internal/handlers` — ok.
- `npx tsc -p tsconfig.json --noEmit` — ok.

## [2026-07-12d] — WayMB nos eventos de cobrança: coleta de dados do pagador

### Frontend
- `EventOverlay.tsx` (`PixStep`) — com o gateway WayMB ativo, o overlay de cobrança (fake_billing, video_lock, phone_block, age_gate, tip_jar, reconnect_paywall) agora segue o mesmo fluxo da ligação por minutos: formulário de dados (nome, e-mail, telemóvel obrigatório, NIF opcional) → escolha de método (MB WAY / Multibanco) → cobrança. Antes disparava automaticamente com dados falsos ("Visitante"/"00000000000") e método fixo `mbway`, e o pagamento nunca funcionava.
- Retry de erro no WayMB volta para a escolha de método; PIX (ZuckPay) mantém o comportamento anterior.

## [2026-07-12c] — WayMB: tolerância para `referenceData.expiresAt`

### Backend
- `backend/internal/waymb/client.go` — `ReferenceData.ExpiresAt` agora usa um tipo próprio que aceita `expiresAt` como número ou string na resposta da API.
- `backend/internal/services/billing_service.go` — cast explícito para `int64` ao persistir/expor `multibanco_expires_at`.

### Validação
- `go test ./internal/waymb ./internal/services` — ok.

## [2026-07-12c] — Todos os textos editáveis (presell + eventos da timeline)

### Backend
- Migration `000035_add_extra_texts_to_call_events` — coluna `extra_texts JSONB DEFAULT '{}'`.
- `domain/call_event.go` + `models/call_event.go` — `ExtraTexts map[string]string` (serializado como JSONB).
- `services/call_event_service.go`, `handlers/call_event_handler.go`, `handlers/call_handler.go` (payload público) — `extra_texts` em create/update/list.
- `domain/presell_page.go` + `handlers/presell_handler.go` — `PresellConfig` ganha `original_price_label`, `discounted_price_label`, `discount_badge` e `extra_texts` (antes os campos de preço eram descartados pelo struct tipado).

### Frontend
- `EventOverlay.tsx` — helper `xt(event, key, fallback)`; ~25 textos antes fixos agora sobrescritíveis: telas de pagamento (pago, copiar PIX, "já paguei", nota de segurança, cabeçalhos), reconnect paywall, incoming call (subtítulo/atender/recusar), badges de countdown/upsell, contadores, links de fechar.
- `TimelineEditorPage.tsx` — registry `EXTRA_TEXT_FIELDS` por tipo + seção colapsável "✏️ Textos avançados" no formulário do evento.
- `PresellPublicPage.tsx` — helper `ct(config, key, fallback)`; textos editáveis: label/expirado do countdown, contador de pessoas, labels de horários, "Esgotado", disclaimer do CTA, modal exit-intent (5 textos), faixas de downsell/upsell.
- `PresellEditorPage.tsx` — registry `PRESELL_EXTRA_TEXTS` + seção "Textos avançados" na aba Conteúdo, filtrada por tipo de página.
- `eventService.ts`, `callService.ts`, `presellService.ts` — tipos atualizados com `extra_texts`.

## [2026-07-12b] — Dashboard: filtro por data personalizado; Downsell: bloco de preço e design system

### Backend
- `domain/billing_transaction.go` — assinatura `GetStatsByUser` recebe `from, to string`.
- `repositories/billing_transaction_repository.go` — suporte a `period=custom` com `from`/`to`.
- `services/billing_service.go` — `GetStats` repassa `from`, `to`.
- `handlers/billing_handler.go` — lê query params `from` e `to`.

### Frontend
- `services/dashboardService.ts` — `PaymentPeriod` inclui `'custom'`; `getPaymentStats` aceita `from?`, `to?`.
- `pages/DashboardPage.tsx` — nova tab "Período" com date pickers; cores `#FE015C`.
- `services/presellService.ts` — campos de preço downsell em `PresellConfig`.
- `pages/PresellEditorPage.tsx` — design system rosa; bloco preço/desconto para downsell.
- `pages/PresellPublicPage.tsx` — bloco de comparação de preço no downsell público.

## [2026-07-12] — Admin: delete plano, impersonação, senha, landing dinâmica, design system

### Backend
- `domain/plan.go` — `Delete` adicionado ao `PlanRepository`.
- `repositories/plan_repository.go` — `Delete` implementado.
- `services/subscription_service.go` — `DeletePlan`.
- `handlers/subscription_handler.go` — `DeletePlan` (DELETE /admin/plans/:id).
- `services/admin_service.go` — `ImpersonateUser` (gera JWT curto para o usuário) e `ChangeUserPassword`.
- `handlers/admin_handler.go` — `NewAdminHandler` recebe `*JWTService`; `ImpersonateUser` e `ChangeUserPassword` handlers.
- `cmd/api/main.go` — novas rotas: `POST /admin/users/:id/impersonate`, `PUT /admin/users/:id/password`, `DELETE /admin/plans/:id`.

### Frontend
- `services/adminService.ts` — `deleteAdminPlan`, `impersonateUser`, `changeUserPassword`.
- `pages/AdminPage.tsx` — Planos: botão Excluir com confirmação. Usuários: botão "Acessar" (impersonação redireciona ao dashboard do usuário), botão "Senha" (modal para alterar senha). Botões primários: verde → pink `#FE015C`. Input focus ring: verde → pink.
- `pages/LandingPage.tsx` — seção Preços agora busca planos via `GET /plans`; cards dinâmicos (skeleton enquanto carrega, último plano recebe badge POPULAR e estilo destaque).
- `components/AppLayout.tsx` — item ativo da sidebar: verde → pink `#FE015C`; avatar: gradiente verde → gradiente pink.
- `pages/DashboardPage.tsx` — todos os acentos verdes substituídos por pink `#FE015C` (botão, ícones, banner do plano, checklist, PaymentsPanel).

---

## [2026-07-12] — Dashboard: painel de pagamentos + Admin: email nas assinaturas

### Backend
- `domain/billing_transaction.go` — `PaymentStats` struct; `GetStatsByUser` adicionado ao `BillingTransactionRepository`.
- `repositories/billing_transaction_repository.go` — `GetStatsByUser`: JOIN `billing_transactions → calls` por `user_id`, filtro por período (day/month/year/all), contagem geradas + pagas + soma receita.
- `services/billing_service.go` — `GetStats(ctx, userID, period)` delega ao repo.
- `handlers/billing_handler.go` — `GetPaymentStats` (GET `/billing/stats?period=`), autenticado.
- `cmd/api/main.go` — grupo `/billing` autenticado com rota `GET /stats`.
- `domain/subscription.go` — `SubscriptionWithEmail` struct; `FindAllWithEmail` adicionado ao `SubscriptionRepository`.
- `repositories/subscription_repository.go` — `FindAllWithEmail`: JOIN com `users` retorna `user_email` e `user_name`.
- `services/admin_service.go` — `ListSubscriptionsWithEmail`.
- `handlers/admin_handler.go` — `ListSubscriptions` agora chama `ListSubscriptionsWithEmail`.

### Frontend
- `services/dashboardService.ts` — `PaymentStats`, `PaymentPeriod`, `getPaymentStats`.
- `pages/DashboardPage.tsx` — `PaymentsPanel`: card com filtros Hoje/Este mês/Este ano/Total, colunas Gerados/Pagos/Receita, barra de conversão, estado vazio amigável.
- `pages/AdminPage.tsx` — aba Assinaturas mostra nome e email do usuário em vez de UUID.

---

## [2026-07-12] — Limites de plano: max_videos + wiring VideoHandler

### Backend
- `backend/internal/domain/video.go` — `CountByUserID` adicionado ao `VideoRepository` interface.
- `backend/internal/repositories/video_repository.go` — implementação de `CountByUserID`.
- `backend/internal/services/video_service.go` — `CheckCreateLimit` verifica `max_videos` do plano antes do upload.
- `backend/internal/handlers/video_handler.go` — `VideoHandler` agora recebe `*SubscriptionService`; `Upload` chama `CheckCreateLimit`.
- `backend/cmd/api/main.go` — `NewVideoHandler(videoService, subService)` — injeção do `SubscriptionService`.

### Frontend
- `frontend/src/pages/SubscriptionPage.tsx` — badge "até N vídeos" exibido quando `max_videos > 0`.

---

## [2026-07-12] — Fix signal_drop/screenshot_alert + age_gate + preview /calls/new

### Fixes
- `pages/CallPublicPage.tsx` — `dismissEvent` e `resumeVideo` envolvidos em `useCallback`; `BILLING_TYPES` movido para fora do componente. Resolve o bug crítico onde `signal_drop` e `screenshot_alert` nunca descartavam o overlay (timers resetavam a cada render causado pelo `useCallTimer`).
- `pages/NewCallPage.tsx` — `VideoCard` agora envolve `VideoThumbnail` com `stopPropagation` e passa `playInline={true}`, permitindo preview inline do vídeo sem selecionar o card.
- `components/EventOverlay.tsx` — `age_gate`, `video_lock`, `phone_block`, `tip_jar` excluídos do auto-dismiss global (não devem ser descartados por timer).

### Novo evento: Verificação de Idade (age_gate)
- `backend/internal/domain/call_event.go` — constante `EventTypeAgeGate = "age_gate"`.
- `frontend/src/services/eventService.ts` e `callService.ts` — tipo `age_gate` adicionado ao union.
- `components/EventOverlay.tsx` — `AgeGateOverlay`: overlay +18 com cobrança PIX simbólica para verificação de maioridade; pausa o vídeo até confirmação.
- `pages/VideoEditorPage.tsx` — preview, ícone, cor, label, help, default e seção de billing para `age_gate`.
- `pages/TimelineEditorPage.tsx` — `TYPE_META` atualizado com entrada `age_gate`.
- `pages/CallPublicPage.tsx` — `age_gate` incluído em `BILLING_TYPES` e na lista de eventos que pausam o vídeo e disparam `resumeVideo` após pagamento.

## [2026-07-12] — Propagação de moeda + WayMB completo

### Frontend
- `lib/currency.ts` (novo) — `CURRENCIES`, `formatPrice(cents, currency)`.
- `pages/CallPublicPage.tsx` — `EntryPaywall` aceita `currency` prop; `<EventOverlay>` recebe `currency={call.currency}`; importa `formatPrice`.
- `pages/DashboardPage.tsx`, `pages/SubscriptionPage.tsx`, `pages/AdminPage.tsx`, `pages/VideoEditorPage.tsx` — substituídas todas as formatações BRL hardcoded pela função `formatPrice` compartilhada.
- `components/EventOverlay.tsx` — `currency` prop propagada para todos os sub-overlays (`PixStep`, `TipJarOverlay`, `VideoLockOverlay`, `PhoneBlockOverlay`, `ReconnectPaywallOverlay`).
- `pages/PaymentSettingsPage.tsx` — seletor de moeda (BRL, EUR, USD, GBP) + tabs de gateway ZuckPay/WayMB.
- `components/CreditsOverlay.tsx` — modo `payer` (coleta nome/email/telefone/documento) + modo `method` (MB WAY / Multibanco / Bizum) + modo `waymb` (tela de espera por método).
- `services/billingService.ts` — `createWayMBPayment`, `checkWayMBStatus`.
- `services/paymentConfigService.ts` — campos WayMB + `active_gateway` + `currency`.
- `services/callService.ts` — `PublicCall.currency`.

### Backend
- `migrations/000032–000034` — colunas WayMB, gateway ativo e moeda em `user_payment_configs`; colunas gateway/WayMB em `billing_transactions`.
- `internal/waymb/client.go` — cliente HTTP para WayMB API.
- `internal/domain/`, `internal/models/`, `internal/repositories/` — atualizados com novos campos.
- `internal/services/billing_service.go` — `CreateWayMBPayment`, `GetWayMBStatus`, `ProcessWayMBWebhook`.
- `internal/services/call_service.go` — `GetPublic` inclui `currency` do dono.
- `internal/handlers/billing_handler.go`, `payment_config_handler.go`, `call_handler.go` — novos endpoints WayMB e campos expostos.
- `cmd/api/main.go` — rotas WayMB registradas.

## [2026-07-06] — Integração Dracofy por usuário (DB-based)

### Backend
- `migrations/000031_add_dracofy_token_to_tracking.up.sql` — `ALTER TABLE user_tracking_configs ADD COLUMN dracofy_token VARCHAR(255) NOT NULL DEFAULT ''`.
- `domain/tracking.go` — campo `DracofyToken string` adicionado a `UserTrackingConfig`.
- `models/user_tracking_config.go` — campo `DracofyToken` adicionado; `ToDomain`/`TrackingConfigFromDomain` atualizados.
- `handlers/tracking_handler.go` — `dracofy_token` incluído em `trackingToMap`, `saveTrackingRequest` e `Save`.
- `repositories/tracking_repository.go` — `dracofy_token` adicionado aos campos do upsert `ON CONFLICT`.

### Frontend
- `services/trackingService.ts` — `dracofy_token: string` adicionado à interface `TrackingConfig`.
- `hooks/useTrackingScripts.ts` — injeta o script `cdn.dracofy.com.br/v1/index.js` com `data-token` quando `dracofy_token` estiver configurado.
- `pages/TrackingSettingsPage.tsx` — card Dracofy adicionado; campo `dracofy_token` em `EMPTY`.
- `lib/dracofy.ts` / `App.tsx` — mantidos: `dracofyPageview` é no-op quando o script não está carregado.

### Revertido (abordagem errada via env)
- `index.html` — removido `<script data-token="%VITE_DRACOFY_TOKEN%">` estático.
- `frontend/Dockerfile` — removido `ARG/ENV VITE_DRACOFY_TOKEN`.
- `docker-compose.yml` — removido `build.args.VITE_DRACOFY_TOKEN`.
- `frontend/.env.example` — removido `VITE_DRACOFY_TOKEN`.

## [2026-07-06] — Admin panel completo: planos CRUD, criar usuário, vincular plano

### Backend
- `domain/plan.go` — `PlanRepository` agora tem `Create`, `FindAllAdmin`.
- `repositories/plan_repository.go` — implementa `Create`, `FindAllAdmin`; `Update` agora atualiza todos os campos (nome, preço, recorrência, product ID, active, limites).
- `services/subscription_service.go` — `ListAllPlans`, `CreatePlan` (com `CreatePlanInput`), `UpdatePlan` (com `UpdatePlanInput`).
- `services/admin_service.go` — `CreateUser` (hash bcrypt, sem fluxo de email), `AssignPlan` (cria assinatura ativa sem AbacatePay, cancela a anterior se existir). Recebe `PlanRepository` no construtor.
- `handlers/admin_handler.go` — `CreateUser` (`POST /admin/users`), `AssignPlan` (`POST /admin/users/:id/assign-plan`).
- `handlers/subscription_handler.go` — `ListAllPlans` (`GET /admin/plans`), `CreatePlan` (`POST /admin/plans`), `UpdatePlan` (`PUT /admin/plans/:id`).
- `cmd/api/main.go` — registra 5 novas rotas no grupo `/admin`.

### Frontend
- `services/subscriptionService.ts` — `Plan.abacate_pay_product_id` adicionado como campo opcional.
- `pages/AdminPage.tsx` — reescrita completa:
  - **Aba Planos**: formulário de criação inline, edição completa (nome, preço, recorrência, product ID, limites, ativo/inativo), usa `GET /admin/plans` que retorna todos (incluindo inativos).
  - **Aba Usuários**: botão "Criar usuário" com modal inline (nome, email, senha), botão "Vincular plano" por linha com dropdown de planos disponíveis.

---

## 2026-07-06 — UX Flow: Melhorias de criação e uso do sistema

**O que foi implementado:**
- `DashboardPage.tsx`: `SetupChecklist` (5 passos acionáveis com links diretos) exibido quando usuário ainda não tem chamadas; `FunnelGuide` permanece para usuários com chamadas existentes.
- `EditCallPage.tsx`: banner "3 passos para lançar" ao chegar via `?created=1`; atalhos rápidos (Timeline / Editor de vídeo / Analytics); painel "Presells vinculados" com badges de tipo.
- `CallsPage.tsx`: health bar por card (eventos ✓, presell ✓, foto ✓); badge "N pendências"; atalho de timeline por card; confirmação de exclusão inline.
- `NewCallPage.tsx`: redirect para `?created=1` para acionar o onboarding.

**Arquivos alterados:**
- `frontend/src/pages/DashboardPage.tsx`
- `frontend/src/pages/EditCallPage.tsx`
- `frontend/src/pages/CallsPage.tsx`
- `frontend/src/pages/NewCallPage.tsx`

**TypeScript check:** 0 erros.

---

## 2026-07-06 — Feature: 4 Pendências (Vínculos / Analytics / Preview Mobile / Limites)

**O que foi implementado:**
- Presell sem vinculação bidirecional → `GET /calls/:id/presells` + painel no `EditCallPage`.
- Analytics do funil → `cta_clicks` no presell + seção de conversão no `AnalyticsPage`.
- Preview mobile no editor → phone frame sticky no `TimelineEditorPage`.
- Limites de plano → migrations 000029/000030 + `CheckCreateLimit` + UI no `AdminPage` e `SubscriptionPage`.

**Arquivos alterados/criados:**
- `backend/migrations/000029_add_cta_clicks_to_presell_pages.up.sql`
- `backend/migrations/000030_add_limits_to_plans.up.sql`
- `backend/internal/domain/{errors,plan,presell_page,call}.go`
- `backend/internal/models/{plan,presell_page}.go`
- `backend/internal/repositories/{presell,call,plan}_repository.go`
- `backend/internal/services/{call,presell,subscription}_service.go`
- `backend/internal/handlers/{call,presell,subscription,errors}.go`
- `backend/cmd/api/main.go`
- `frontend/src/services/{presellService,subscriptionService}.ts`
- `frontend/src/pages/{PresellPublicPage,EditCallPage,AnalyticsPage,TimelineEditorPage,AdminPage,SubscriptionPage}.tsx`

**Go build:** limpo. **TypeScript check:** 0 erros.

---

## 2026-07-05 — Feature: Downsell Pages

**O que foi implementado:**
- Coluna `type VARCHAR(20) DEFAULT 'presell'` na tabela `presell_pages` (migration `000024`).
- Backend completo: domain, model, repository (`typeFilter`), service, handler — todos propagando `type`. Endpoint `GET /presell?type=downsell` filtra pelo tipo.
- `presellService.ts`: campo `type` nos tipos, `DOWNSELL_TEMPLATES` (4 templates: Espera!, Última Chance, FOMO, Reconsidera), `listDownsells()` helper.
- `PresellEditorPage` refatorado com prop `pageType` — reutilizado para presell e downsell sem duplicação.
- `PresellPublicPage` recebe prop `isDownsell` — exibe banner vermelho "⚠️ ESPERA! Antes de sair..." no topo.
- Novos arquivos: `DownsellEditorPage.tsx`, `DownsellPublicPage.tsx`, `DownsellsPage.tsx`.
- Rota pública `/d/:slug` para página de downsell.
- Sidebar com item "Downsell" (ícone `TrendingDown`).

**Arquivos criados:** `000024_add_type_to_presell_pages.up.sql`, `000024_add_type_to_presell_pages.down.sql`, `DownsellEditorPage.tsx`, `DownsellPublicPage.tsx`, `DownsellsPage.tsx`

**Arquivos modificados:** `presell_page.go` (domain/model), `presell_repository.go`, `presell_service.go`, `presell_handler.go`, `presellService.ts`, `PresellEditorPage.tsx`, `PresellPublicPage.tsx`, `App.tsx`, `AppLayout.tsx`

---

## 2026-07-05 — Correção: loop, eventos, watched e casts no editor/chamada

**Bugs corrigidos:**
- `firedEvents` não era limpo no loop — eventos só disparavam na 1ª volta; agora disparam a cada loop.
- `watchedRef` resetava para `currentTime` a cada loop — agora usa `watchedAccRef` para acumular tempo total assistido atravessando todas as voltas.
- `lastTimeRef` adicionado para calcular delta sem saltos negativos no loop.
- Lógica de loop extraída para função `loopBack()`: centraliza `firedEvents.clear()`, acumulo de `watchedAcc` e reposicionamento.
- Casts desnecessários `(call as Call & { end_time_seconds?: number })` removidos do VideoEditorPage (campo já existe em `Call`).

**Arquivos:** `CallPublicPage.tsx`, `VideoEditorPage.tsx`

## 2026-07-05 — Editor de vídeo: zoom, posição, velocidade e corte na chamada

**Novos campos `playback_rate`, `video_zoom`, `video_x`, `video_y` em `calls`:**
- Migration `000023_add_video_settings_to_calls.up.sql` adicionada.
- `backend/internal/domain/call.go` — 4 novos campos.
- `backend/internal/models/call.go` — mapeamento GORM + `ToDomain`/`CallFromDomain`.
- `backend/internal/services/call_service.go` — `CreateCallInput`, `UpdateCallInput`, lógica de update.
- `backend/internal/handlers/call_handler.go` — `callDTO`, `updateCallRequest`, handler público.

**Frontend:**
- `callService.ts` — `Call`, `PublicCall`, `UpdateCallPayload` atualizados.
- `VideoEditorPage.tsx` — controles de zoom (slider 1x–3x), posição X/Y (slider -50%/+50%), reset; preview PhoneFrame reflete transform em tempo real; velocidade e zoom/posição salvos com "Salvar corte".
- `CallPublicPage.tsx` — aplica `video_zoom`/`video_x`/`video_y` via CSS transform; aplica `playback_rate`; `end_time_seconds` respeitado via `timeupdate` (loop para `start_time_seconds` ou encerra).

## 2026-07-05 — Eventos de call, badge por IP, bug de loading na presell

**Eventos (camadas) não disparavam na call:**
- `frontend/src/pages/CallPublicPage.tsx` — dependência do `useEffect` do `timeupdate` era `[call]`, mas `videoRef.current` é `null` quando `call` carrega (vídeo ainda não montado no estado 'ringing'). Corrigido para `[call, state]`: o listener é registrado novamente quando `state` vira `'call'` e o `<video>` monta.

**Badge de localização por IP do visitante:**
- `frontend/src/pages/PresellPublicPage.tsx` — `fetch('https://ipapi.co/json/')` detecta `city`/`region` do visitante e exibe no badge; `config.location_city` do editor vira fallback se detecção falhar.
- Badge agora aparece se `ipCity` OU `config.location_city` OU `config.location_label` estiver preenchido.
- `frontend/src/pages/PresellEditorPage.tsx` — campo "Cidade de fallback" com nota explicando a detecção automática; toggle habilita/desabilita o badge.

**Presell ficava em loading infinito:**
- `frontend/src/pages/PresellPublicPage.tsx` — quando `show_viewer_count` era `true`, o `return () => clearInterval(interval)` dentro do `.then()` impedia que `setLoading(false)` fosse chamado. Corrigido separando o cleanup do setLoading.

---

## 2026-07-05 — Redirect ao encerrar, presell editor fix, câmera arrastável

**Redirect ao encerrar chamada:**
- `backend/migrations/000022_add_end_call_redirect_to_calls.up.sql` — coluna `end_call_redirect_url VARCHAR(2048) NOT NULL DEFAULT ''`.
- `backend/internal/domain/call.go` — campo `EndCallRedirectURL` no struct `Call`.
- `backend/internal/models/call.go` — mapeado em `ToDomain()` / `CallFromDomain()`.
- `backend/internal/services/call_service.go` — `CreateCallInput` e `UpdateCallInput` com `EndCallRedirectURL`.
- `backend/internal/handlers/call_handler.go` — DTO, requests, public response atualizados.
- `frontend/src/services/callService.ts` — `Call.end_call_redirect_url`, `UpdateCallPayload.end_call_redirect_url`, `PublicCall.end_call_redirect_url`.
- `frontend/src/pages/EditCallPage.tsx` — picker de presell + campo URL manual; estado `endCallRedirectUrl` salvo no update.
- `frontend/src/pages/CallPublicPage.tsx` — redirect automático ao `onEnded` e ao botão PhoneOff; suporta URL relativa e absoluta.

**Presell editor corrigido:**
- `backend/internal/handlers/presell_handler.go` — `presellConfigDTO` expandido com todos os campos (slots, countdown, viewers, location, video, comments); `configFromDTO` e `toPresellDTO` completos; helpers `commentsToDTO`/`commentsFromDTO`.

**Câmera arrastável:**
- `frontend/src/pages/CallPublicPage.tsx` — self-cam usa Pointer Events API (`onPointerDown/Move/Up`, `setPointerCapture`) para arrastar; posição clampada nas bordas; estado inicial top-right (padrão), passa para absolute após primeiro drag.

---

## 2026-07-04 — Configuração de Rastreamento (Facebook, TikTok, GA4, GTM, UTMify, Script custom)

**Backend:**
- `backend/internal/domain/tracking.go` — domínio `UserTrackingConfig` + interface `TrackingConfigRepository`.
- `backend/internal/models/user_tracking_config.go` — GORM model + `ToDomain()` / `TrackingConfigFromDomain()`.
- `backend/internal/repositories/tracking_repository.go` — `Upsert` (ON CONFLICT user_id) + `FindByUserID`.
- `backend/internal/services/tracking_service.go` — `Get` (retorna config vazia se não existir) + `Save`.
- `backend/internal/handlers/tracking_handler.go` — `GET /settings/tracking` + `PUT /settings/tracking`.
- `backend/internal/handlers/call_handler.go` — injetado `TrackingService`; `GetPublic` retorna campo `"tracking"`.
- `backend/internal/handlers/presell_handler.go` — injetado `TrackingService`; `GetPublic` retorna campo `"tracking"`.
- `backend/cmd/api/main.go` — wired `trackingRepo → trackingService → trackingHandler`; rotas registradas; `NewPresellHandler` atualizado para 2 args.
- `backend/migrations/000021_create_user_tracking_configs.up.sql` — tabela `user_tracking_configs`.

**Frontend:**
- `frontend/src/services/trackingService.ts` — `TrackingConfig` interface + `get` / `save` API calls.
- `frontend/src/hooks/useTrackingScripts.ts` — hook que injeta FB Pixel, TikTok Pixel, GA4, GTM, UTMify e script custom no `<head>` (idempotente por id).
- `frontend/src/pages/TrackingSettingsPage.tsx` — formulário de configuração de rastreamento com cards por plataforma.
- `frontend/src/App.tsx` — rota `/settings/tracking` adicionada.
- `frontend/src/components/AppLayout.tsx` — nav item "Rastreamento" adicionado.
- `frontend/src/pages/CallPublicPage.tsx` — `useTrackingScripts(call?.tracking)` chamado ao carregar a chamada.
- `frontend/src/pages/PresellPublicPage.tsx` — `useTrackingScripts(tracking)` chamado ao carregar a presell.
- `frontend/src/services/callService.ts` — `PublicCall.tracking` adicionado.
- `frontend/src/services/presellService.ts` — `PresellPage.tracking` adicionado.

---

## 2026-07-04 — Chamada WhatsApp v2 — Retenção, paywall de reconexão e UI imersiva

**Novos tipos de evento:**
- `reconnect_paywall` — simula queda de internet durante a chamada: tela "Sem conexão" → 3 tentativas de reconexão animadas → tela de falha com botão → PIX para restaurar a chamada. Vídeo pausa quando o evento dispara e retoma após pagamento.
- `signal_drop` — efeito de sinal fraco semi-transparente com noise CSS + texto "Sinal fraco…" / "Reconectando…". Auto-descarta após `duration_seconds`. Não bloqueia o vídeo — mantém o usuário ansioso sem interromper.

**Melhorias WhatsApp UI na página de chamada (`CallPublicPage.tsx`):**
- `FakeStatusBar` — status bar nativa falsa no topo: horário real do dispositivo, barras de sinal, ícone WiFi, bateria.
- Substituído badge "Chamada de vídeo WhatsApp" por "🔒 Criptografia de ponta a ponta" (mais imersivo).
- `FakeNotifBubble` — bolhas de notificação WhatsApp que aparecem automaticamente durante a chamada (25s, 55s, 95s, 145s, 205s): "Ana está digitando…", "Ana enviou uma foto", "Ana quer te mostrar algo especial…" etc.
- Animação `slideInTop` adicionada ao `index.css`.

**Backend:**
- `domain/call_event.go` — constantes `EventTypeReconnectPaywall` e `EventTypeSignalDrop`.
- `handlers/call_event_handler.go` — `oneof` atualizado para aceitar `reconnect_paywall` e `signal_drop`.

**Frontend:**
- `services/callService.ts` / `services/eventService.ts` — novos tipos adicionados ao union `PublicEvent.type` e `EventType`.
- `components/EventOverlay.tsx` — `ReconnectPaywallOverlay` e `SignalDropOverlay` implementados; prop `onResume` adicionada ao `EventOverlay`.
- `pages/TimelineEditorPage.tsx` — novos tipos no `<select>`, `TYPE_LABELS` e `TYPE_COLORS`.

---

## 2026-07-04 — Presell Pages v2 — Detecção de horário real + UX +18

**Novos recursos na feature Presell:**

- `services/presellService.ts` — 5 templates +18 reescritos (Ao Vivo, Íntimo, Urgência, VIP, Direto); novos campos `PresellConfig`: `use_real_time`, `show_viewer_count`, `viewer_count_base`, `show_countdown`, `countdown_seconds`.
- `pages/PresellPublicPage.tsx` — detecta horário real de acesso do lead (`new Date()`) e gera slots dinâmicos (ex: "Agora — 14:32 · 1 vaga", "Em 15 min — 14:47 · 2 vagas"). Contador de viewers fake randomizado + drift lento a cada 8s. Countdown timer com `setInterval`. Headline suporta variável `{hora}` substituída em tempo real.
- `components/presell/PresellPreview.tsx` — preview ao vivo refletindo viewer count, countdown (frozen em 04:57), e slots em tempo real.
- `pages/PresellEditorPage.tsx` — toggles "Usar horário real do lead", "Contador de pessoas online" (com campo base), "Countdown de urgência" (com campo segundos) na seção Conteúdo. Template padrão alterado para "Ao Vivo".

---

## 2026-07-04 — Presell Pages

**Nova feature: páginas de presell `/p/:slug`**

**Backend:**
- `migrations/000019_create_presell_pages.up.sql` — tabela `presell_pages` (uuid, user_id, call_id nullable, slug unique, template_slug, config JSONB).
- `domain/presell_page.go` — `PresellPage`, `PresellConfig` (todos os campos customizáveis), `PresellPageRepository`.
- `models/presell_page.go` — GORM model com `presellConfigJSON` (driver `Value`/`Scan` para JSONB).
- `repositories/presell_repository.go` — CRUD completo + `FindBySlug` + `SlugExists`.
- `services/presell_service.go` — lógica de negócio, geração de slug aleatório 8 chars (retry até 10x).
- `handlers/presell_handler.go` — 5 handlers autenticados + 1 público (`GetPublic`).
- `cmd/api/main.go` — rotas `/api/v1/presell` (CRUD + sub) e `/api/v1/public/presell/:slug`.

**Frontend:**
- `services/presellService.ts` — tipos `PresellConfig`/`PresellPage`, array `TEMPLATES` (4 templates: formal, coach, fitness, simples), `getTemplateDefaults`, CRUD + público.
- `components/presell/PresellPreview.tsx` — preview ao vivo renderizado como HTML inline em escala.
- `pages/PresellsPage.tsx` — lista com copiar link, preview externo, editar, excluir.
- `pages/PresellEditorPage.tsx` — editor com 4 seções (Template / Conteúdo / Visual / CTA & Destino) + preview ao vivo na coluna direita; picker de funil de destino.
- `pages/PresellPublicPage.tsx` — página pública `/p/:slug`, sem navbar; suporte a cores, imagem de fundo, avatar, badge, headline, subheadline, slots de horário, botão CTA customizável.
- `App.tsx` — rotas `/p/:slug` (público), `/presell`, `/presell/new`, `/presell/:id/edit`.
- `AppLayout.tsx` — item "Presell" na sidebar.

---

## 2026-07-04 — Rebranding "rodar hot" + UX/UI melhorias

**Frontend — reposicionamento para afiliados/tráfego pago:**
- `AppLayout.tsx` — Brand renomeada "FakeCall" → "HotCall"; nav labels: "Chamadas"→"Funis", "Dashboard"→"Painel", "Assinatura"→"Plano".
- `DashboardPage.tsx` — Vocabulário de performance marketing: "Funis criados", "Leads alcançados", "bora fechar mais leads hoje". Novo `FunnelGuide` com 3 passos (sobe vídeo → cria chamada → dispara no funil). WS toasts "🔥 Lead entrou" e "💰 PIX recebido".
- `CallsPage.tsx` — "Chamadas" → "Funis de Chamada"; badge "X rodando"; empty state com copy afiliado.
- `SubscriptionPage.tsx` — Features reescritas para afiliados (funis ilimitados, leads, analytics, PIX); "Pagar com PIX" como CTA.
- `NewCallPage.tsx` — Wizard 3 etapas; labels: "Título interno"→"Nome da campanha", "Nome exibido"→"Nome do contato"; "Criar chamada"→"Criar funil"; "Cobrar na entrada (PIX)".
- `EditCallPage.tsx` — Mesmos labels do `NewCallPage`; "Informações da chamada"→"Informações do funil".
- `hooks/use-image-upload.ts` — Novo hook para preview local (blob URL) + `setServerUrl()` pós-upload.
- `components/ui/ImageDropzone.tsx` — Dropzone com drag-and-drop e preview de imagem.
- `components/ui/VideoDropzone.tsx` — Dropzone com drag-and-drop e preview de vídeo.
- `VideosPage.tsx` — `VideoDropzone` sempre visível no topo.

**Backend:**
- `handlers/call_handler.go` — `GET /calls/:id` agora presigna `contact_photo_url`.
- `domain/` — todos os structs com `json:` tags corretas (snake_case).

---

## 2026-07-04 — Correções de serialização JSON e botão encerrar chamada

**Backend — JSON tags em todos os domínios:**
- `internal/domain/plan.go` — tags `json:` adicionadas em todos os campos (`price_cents`, `interval`, etc.); `PasswordHash` exposto nunca (`json:"-"`).
- `internal/domain/user.go` — tags `json:` em todos os campos; `PasswordHash` com `json:"-"`.
- `internal/domain/subscription.go` — tags `json:` em todos os campos.
- `internal/domain/call.go` — tags `json:` em todos os campos.
- `internal/domain/call_event.go` — tags `json:` em todos os campos.
- `internal/domain/audit_log.go` — tags `json:` em todos os campos.

**Problema resolvido:** API retornava campos PascalCase (`PriceCents`, `IsBlocked`, etc.) em vez de snake_case, quebrando `/subscription` e o painel Admin.

**Frontend:**
- `pages/CallPublicPage.tsx` — botão `PhoneOff` agora chama `setCallEnded(true)` e pausa o vídeo; exibe tela "Chamada encerrada" corretamente.

---

## 2026-07-03 — Editor de vídeo: novos tipos de camada + duração configurável

**Backend:**
- `migrations/000018_add_fields_to_call_events.up.sql` — `duration_seconds INT DEFAULT 0` e `offer_call_slug TEXT DEFAULT ''` em `call_events`.
- `internal/domain/call_event.go` — constantes `EventTypeOfferCall`, `EventTypeCountdown`, `EventTypeUpsell`; campos `DurationSeconds` e `OfferCallSlug`.
- `internal/models/call_event.go` — propagação GORM + `ToDomain`/`CallEventFromDomain`.
- `internal/services/call_event_service.go` — validação dos novos tipos; propagação em `Create`/`Update`.
- `internal/handlers/call_event_handler.go` — `eventDTO`, `upsertEventRequest` e mapeamentos atualizados; validação `oneof` ampliada.
- `internal/handlers/call_handler.go` — `GetPublic` expõe `duration_seconds`, `offer_call_slug` e campos de billing nos eventos públicos.

**Frontend:**
- `services/eventService.ts` — tipo `EventType` ampliado; `CallEvent` e `UpsertEventPayload` com `duration_seconds` e `offer_call_slug`.
- `services/callService.ts` — `PublicEvent` com novos tipos e campos.
- `pages/VideoEditorPage.tsx` — reescrito: 6 tipos de camada com ícones, cores e descrições; painel agrupado por categoria (Engajamento/Vendas/Pagamento); campo `duration_seconds` no `EventPropsPanel`; campo `offer_call_slug` para `offer_call`; chips na timeline com largura proporcional à duração; preview de todos os novos tipos no frame do celular; `defaultPayload` por tipo.
- `components/EventOverlay.tsx` — `CountdownOverlay` (timer regressivo real usando `duration_seconds`), `OfferCallOverlay` (link para `/c/offer_call_slug`), `UpsellOverlay`; auto-dismiss via `setTimeout` para todos os tipos com `duration_seconds > 0`.
- `pages/TimelineEditorPage.tsx` — `TYPE_LABELS` e `TYPE_COLORS` atualizados para incluir novos tipos.

---

## 2026-07-03 — Fase 12: Segurança, Testes e Hardening

**Segurança — novos middlewares:**
- `internal/middlewares/rate_limit.go` — `RateLimiter(rdb, max, window, keyFunc)`: sliding-window counter via Redis pipeline; headers `X-RateLimit-*`; fail-open quando Redis indisponível; helpers `ByIP` e `ByUserID`.
- `internal/middlewares/security.go` — `SecurityHeaders()`: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `Content-Security-Policy`.
- Redis opcional no `main.go`: se `REDIS_URL` não configurada, rate limiting desativado graciosamente.

**Rate limits aplicados:**
- Global (todas as rotas): 500 req/min por IP.
- `POST /api/v1/auth/*`: 20 req/min por IP (brute-force protection).
- `POST /api/v1/public/*`: 60 req/min por IP (spam de visitas e PIX).

**Testes unitários (backend):**
- `internal/domain/call_test.go` — 5 casos de `IsPubliclyAccessible` (ativa, expirada, não expirada, disabled, expired).
- `internal/domain/user_payment_config_test.go` — 4 casos de `IsConfigured`.
- `internal/utils/useragent_test.go` — 8 casos de `ParseUA` (Chrome/Windows, Safari/iOS, Tablet, Firefox/Linux, Edge) e `ClientIP` (X-Real-IP, X-Forwarded-For, remoteAddr).
- `internal/services/jwt_service_test.go` — 5 casos (gerar+parsear, token inválido, secret errado, token expirado, role admin).
- `internal/zuckpay/client_test.go` — 3 casos de `VerifyWebhookSignature` (válido, inválido, body adulterado).
- `internal/storage/local_test.go` — 4 casos de `LocalStorage` (upload+delete, presign+verify, URL expirada, token adulterado).

**Resultado:** 5 packages, 25 testes, 0 falhas.

**Arquivos alterados:**
- `backend/go.mod` / `go.sum` — adicionado `github.com/redis/go-redis/v9`.
- `backend/cmd/api/main.go` — Redis client opcional, `SecurityHeaders` e `RateLimiter` aplicados globalmente e nas rotas auth/public.

---

## 2026-07-03 — Fase 11: WebSocket e Notificações em Tempo Real

**O que foi criado:**
- `backend/internal/ws/hub.go` — Hub WebSocket: gerencia conexões por `userID`, canal de broadcast tipado com `Event{Type, Payload}`.
- `backend/internal/ws/client.go` — Client: `readPump` (mantém ping/pong vivo), `writePump` (envia mensagens do hub); reconnect implícito via `onclose` no frontend.
- `backend/internal/handlers/ws_handler.go` — `GET /ws/dashboard?token=<access_token>`; autentica via JWT no query string (necessário pois browsers não suportam headers em WebSocket).
- `frontend/src/hooks/useWebSocket.ts` — hook React que conecta ao hub, reconecta automaticamente após 5s em caso de queda, atualiza handler sem re-conectar.
- `frontend/src/components/WSToast.tsx` — componente de toast com auto-dismiss (5s), estilos distintos para `new_visit` (cinza escuro) e `payment_received` (verde).

**Arquivos alterados:**
- `backend/internal/services/visit_service.go` — `Track()` retorna `*TrackVisitResult{Visit, CallUserID, CallTitle}` em vez de só `*Visit`.
- `backend/internal/handlers/visit_handler.go` — recebe `*ws.Hub`; após `Track()` faz `hub.Broadcast(CallUserID, "new_visit", {...})`.
- `backend/internal/services/billing_service.go` — `ProcessWebhook()` retorna `*WebhookResult{CallUserID, CallTitle, AmountCents, Status}`.
- `backend/internal/handlers/billing_handler.go` — recebe `*ws.Hub`; quando `Status == "PAID"` faz `hub.Broadcast(CallUserID, "payment_received", {...})`.
- `backend/cmd/api/main.go` — cria hub (`ws.NewHub()`), `go hub.Run()`, passa hub para `NewBillingHandler` e `NewVisitHandler`, cria `wsHandler`, registra rota `GET /ws/dashboard`.
- `frontend/src/pages/DashboardPage.tsx` — `useWebSocket(handleWsEvent)`: evento `new_visit` → toast + `invalidateQueries(['dashboard-summary'])`; evento `payment_received` → toast com valor formatado. `<WSToastList>` renderizado acima do conteúdo.

**Eventos WebSocket:**
- `new_visit` — `{call_title, device, referrer}` — disparado ao rastrear nova visita pública.
- `payment_received` — `{call_title, amount_cents}` — disparado quando webhook ZuckPay chega com `Status == "PAID"`.

---

## 2026-07-03 — Fase 10: Painel Admin

**O que foi criado:**
- `backend/migrations/000014_create_audit_logs.up.sql` — tabela `audit_logs` (id, admin_id, action, target, target_id, detail, created_at).
- `backend/internal/domain/audit_log.go` — entidade `AuditLog`; interface `AuditLogRepository`.
- `backend/internal/models/audit_log.go` — GORM model.
- `backend/internal/repositories/audit_log_repository.go` — `Create`, `List` com paginação.
- `backend/internal/middlewares/admin.go` (já existia em auth.go) — `RequireAdmin()` verifica role="admin" no JWT.
- `backend/internal/services/admin_service.go` — `Stats`, `ListUsers`, `BlockUser`, `UnblockUser`, `DeleteUser`, `ListSubscriptions`, `CancelSubscription`, `ListCalls`, `DeleteCall`, `ListAuditLogs`; toda ação mutante grava audit_log.
- `backend/internal/handlers/admin_handler.go` — 10 endpoints admin.
- `frontend/src/services/adminService.ts` — `getAdminStats`, `listAdminUsers`, `blockUser`, `unblockUser`, `deleteAdminUser`, `listAdminSubscriptions`, `cancelAdminSubscription`, `listAdminCalls`, `deleteAdminCall`, `listAuditLogs`.
- `frontend/src/pages/AdminPage.tsx` — painel com 5 abas: Visão Geral (4 stat cards), Usuários (busca, bloquear/desbloquear/excluir), Assinaturas (cancelar), Chamadas (excluir), Audit Log (tabela paginada).

**Arquivos alterados:**
- `backend/internal/domain/user.go` — interface `UserRepository` estendida com `FindAll`, `SetBlocked`, `CountAll`.
- `backend/internal/domain/subscription.go` — interface `SubscriptionRepository` estendida com `FindAll`, `CountActive`.
- `backend/internal/domain/call.go` — interface `CallRepository` estendida com `FindAllAdmin`, `CountAll`.
- `backend/internal/repositories/user_repository.go` — implementações dos métodos admin.
- `backend/internal/repositories/subscription_repository.go` — implementações dos métodos admin.
- `backend/internal/repositories/call_repository.go` — implementações dos métodos admin.
- `backend/cmd/api/main.go` — `auditLogRepo`, `adminService`, `adminHandler`, grupo `/admin` com 10 rotas (RequireAuth + RequireAdmin).
- `frontend/src/pages/DashboardPage.tsx` — card "Painel Admin" visível apenas para `user.role === 'admin'`.
- `frontend/src/App.tsx` — rota `/admin` adicionada.

**Novas rotas:**
- `GET /api/v1/admin/stats`
- `GET /api/v1/admin/users`
- `PUT /api/v1/admin/users/:id/block`
- `PUT /api/v1/admin/users/:id/unblock`
- `DELETE /api/v1/admin/users/:id`
- `GET /api/v1/admin/subscriptions`
- `DELETE /api/v1/admin/subscriptions/:id`
- `GET /api/v1/admin/calls`
- `DELETE /api/v1/admin/calls/:id`
- `GET /api/v1/admin/audit-logs`

---

## 2026-07-03 — Fase 9: Analytics e Rastreamento de Visitas

**O que foi criado:**
- `backend/migrations/000013_create_visits.up.sql` — tabela `visits` (id, call_id, ip, country, city, device_type, browser, os, referrer, watched_seconds, timestamps).
- `backend/internal/domain/visit.go` — entidades `Visit`, `CallAnalytics`, `ReferrerCount`; interface `VisitRepository`.
- `backend/internal/models/visit.go` — GORM model com `ToDomain()`.
- `backend/internal/repositories/visit_repository.go` — `Create`, `UpdateWatched`, `FindByID`, `Analytics` (5 queries agregadas), `CountByCallIDs`.
- `backend/internal/utils/useragent.go` — `ParseUA()` (device/browser/OS sem deps externas), `ClientIP()` (respeita X-Real-IP / X-Forwarded-For).
- `backend/internal/services/visit_service.go` — `Track()`, `UpdateWatched()`, `Analytics()` (com check de ownership).
- `backend/internal/handlers/visit_handler.go` — `POST /public/calls/:slug/visits`, `PATCH /public/visits/:visit_id`, `GET /calls/:id/analytics`.
- `frontend/src/services/visitService.ts` — `trackVisit()`, `updateWatched()`.
- `frontend/src/services/analyticsService.ts` — `getCallAnalytics()`.
- `frontend/src/pages/AnalyticsPage.tsx` — visitas totais, tempo médio, barras de dispositivos/browsers/OS, top referrers.

**Arquivos alterados:**
- `backend/internal/services/dashboard_service.go` — aceita `visits` como 4ª dependência; `total_views` agora real via `CountByCallIDs`.
- `backend/cmd/api/main.go` — `visitRepo`, `visitService`, `visitHandler` adicionados; `NewDashboardService` recebe `visitRepo`; novas rotas registradas.
- `frontend/src/pages/CallPublicPage.tsx` — rastreia visita no mount, atualiza `watched_seconds` a cada 15s e no `beforeunload` via `navigator.sendBeacon`.
- `frontend/src/pages/EditCallPage.tsx` — card de atalho para analytics adicionado.
- `frontend/src/App.tsx` — rota `/calls/:id/analytics` adicionada.

**Novas rotas:**
- `POST /api/v1/public/calls/:slug/visits` (público, retorna `{visit_id}`)
- `PATCH /api/v1/public/visits/:visit_id` (público, atualiza `watched_seconds`)
- `GET /api/v1/calls/:id/analytics` (RequireAuth + ownership)

---

## 2026-07-03 — Storage plugável: S3/MinIO ou disco local da VPS

**O que foi criado:**
- `internal/storage/interface.go` — interface `FileStorage` com `Upload`, `Delete`, `PresignGet`.
- `internal/storage/local.go` — `LocalStorage`: salva arquivos em disco, gera URLs autenticadas por HMAC-SHA256 com expiração (`/files/*key?expires=...&token=...`).
- `internal/handlers/file_handler.go` — `GET /files/*key` (ativo apenas quando `STORAGE_DRIVER=local`).
- `internal/config/config.go` — campos `StorageDriver` e `LocalStoragePath`.
- `backend/.env.example` — exemplos das duas configs.

**Arquivos alterados:**
- `services/video_service.go` e `services/call_service.go` — dependem agora de `storage.FileStorage` (interface) em vez de `*storage.S3Client` (concreto).
- `cmd/api/main.go` — constrói `fileStore` como `LocalStorage` ou `S3Client` dependendo de `STORAGE_DRIVER`.

**Como usar:**
- MinIO/S3 (padrão): `STORAGE_DRIVER=s3` + variáveis `S3_*` existentes.
- Local: `STORAGE_DRIVER=local` + `LOCAL_STORAGE_PATH=/data/uploads`; arquivos servidos pelo próprio backend via `/files/*key` com token HMAC time-limited.

---

## 2026-07-03 — Integração ZuckPay (overlays fake_billing)

**O que foi criado:**
- Migrations 000009 (`user_payment_configs`), 000010 (`billing_amount_cents` em `call_events`), 000011 (`billing_transactions`).
- `domain/user_payment_config.go`, `domain/billing_transaction.go` — entidades e interfaces de repositório.
- `domain/errors.go` — adicionado `ErrPaymentNotConfigured`.
- `models/user_payment_config.go`, `models/billing_transaction.go` — GORM models.
- `repositories/payment_config_repository.go` — upsert por `user_id`.
- `repositories/billing_transaction_repository.go` — Create, UpdateStatus, FindByID.
- `zuckpay/client.go` — HTTP Basic Auth, `CreatePixQRCode()`, `VerifyWebhookSignature()`.
- `services/payment_config_service.go` — Get (retorna config vazia se não configurada), Save.
- `services/billing_service.go` — `CreatePIX()` (cria transação local, chama ZuckPay), `ProcessWebhook()` (valida HMAC-SHA256 com client_secret do usuário dono da chamada, atualiza status).
- `handlers/payment_config_handler.go` — `GET/PUT /settings/payment`; secret exibido mascarado.
- `handlers/billing_handler.go` — `POST /public/calls/:slug/billing/pix`, `POST /webhooks/zuckpay`.
- `handlers/errors.go` — mapeado `ErrPaymentNotConfigured` → HTTP 422.
- `domain/call_event.go`, `models/call_event.go`, `services/call_event_service.go`, `handlers/call_event_handler.go` — campo `billing_amount_cents` propagado em todo o stack.

**Frontend:**
- `services/paymentConfigService.ts`, `services/billingService.ts` — chamadas às novas rotas.
- `pages/PaymentSettingsPage.tsx` (`/settings/payment`) — formulário para salvar client_id/secret; exibe webhook URL.
- `components/EventOverlay.tsx` — overlay `fake_billing` agora tem 3 passos: formulário de dados do pagador → loading → exibe QR code PIX + código copia-e-cola.
- `services/eventService.ts`, `services/callService.ts` — campo `billing_amount_cents` adicionado aos tipos.
- `pages/TimelineEditorPage.tsx` — campo "Valor da cobrança" visível quando type === fake_billing; valor exibido no card da timeline.
- `pages/DashboardPage.tsx` — atalho rápido "Configurar ZuckPay" adicionado.
- `App.tsx` — rota `/settings/payment` adicionada.

**Novas rotas:**
- `POST /api/v1/public/calls/:slug/billing/pix` (público, sem auth)
- `GET /api/v1/settings/payment` (RequireAuth)
- `PUT /api/v1/settings/payment` (RequireAuth)
- `POST /api/v1/webhooks/zuckpay` (público, sem JWT)

---

## 2026-07-03 — Fase 8: Dashboard

**O que foi criado:**
- `backend/internal/services/dashboard_service.go` — calcula `calls_count`, `active_links`, `total_views` (0, fase 9), `plan` do usuário.
- `backend/internal/handlers/dashboard_handler.go` — `GET /api/v1/dashboard/summary`.
- `backend/cmd/api/main.go` — rotas `/dashboard/summary` (RequireAuth).
- `frontend/src/services/dashboardService.ts` — `getDashboardSummary()`.
- `frontend/src/pages/DashboardPage.tsx` — cards de métricas, plano atual, atalhos rápidos; botão de logout mantido.

**Arquivos alterados:**
- `backend/cmd/api/main.go` (novas instâncias de `DashboardService` e `DashboardHandler`, rota adicionada).
- `frontend/src/pages/DashboardPage.tsx` (substituído placeholder pelo dashboard real com React Query).

---

## 2026-06-29 — Documentação inicial do projeto

**O que foi criado:**
- Estrutura completa de documentação em `docs/`.
- Roadmap com 10 fases definidas.
- Lista inicial de tarefas (TODO).
- Registro da decisão de stack inicial.

**Arquivos novos:**
- `docs/PROJECT.md`
- `docs/ROADMAP.md`
- `docs/ARCHITECTURE.md`
- `docs/DATABASE.md`
- `docs/API.md`
- `docs/RULES.md`
- `docs/TODO.md`
- `docs/DECISIONS.md`
- `docs/CHANGELOG.md`
- `CLAUDE.md` (raiz do projeto)

**Arquivos alterados:**
- Nenhum (projeto novo).

**Problemas encontrados:**
- Nenhum código de funcionalidade foi escrito ainda, conforme solicitado. `linkpriv-clone/` existe no diretório como referência visual/funcional de um produto similar, mas não faz parte do código-fonte do CallPrivada.

---

## 2026-06-29 — Pivot de escopo: Fake WhatsApp Live Call

**O que foi feito:**
- Escopo do projeto substituído: de plataforma genérica de conteúdo por assinatura para SaaS específico de simulação de chamada de vídeo estilo WhatsApp, com editor de timeline de eventos e Stripe.
- Toda a documentação em `docs/` reescrita para refletir o novo escopo, stack (Gin, GORM, Redis, WebSocket, Stripe, Vite/TS/Tailwind/shadcn/Zustand/React Query) e fluxo completo do produto.
- Roadmap expandido de 10 para 13 fases, agora específico do novo produto.
- `docs/TODO.md`: tarefas do escopo anterior marcadas como obsoletas (não removidas), novas tarefas adicionadas por fase do novo roadmap.
- `docs/DECISIONS.md`: pivot registrado com motivo e novas decisões de stack/padrões.

**Arquivos alterados:**
- `docs/PROJECT.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `docs/API.md`, `docs/RULES.md`, `docs/ROADMAP.md`, `docs/TODO.md`, `docs/DECISIONS.md`, `docs/CHANGELOG.md`.

**Arquivos novos:**
- Nenhum.

**Problemas encontrados:**
- Nenhum. Como nenhum código havia sido escrito no escopo anterior, o pivot não exigiu remoção/retrabalho de implementação, apenas de documentação.

---

## 2026-06-29 — Fase 1: Estrutura base

**O que foi criado:**
- Backend Go (módulo `github.com/callprivada/fwlc-backend`, Go 1.24+) com esqueleto de Clean Architecture: `cmd/api`, `cmd/worker`, `internal/{config,domain,services,repositories,handlers,middlewares,models,storage,stripe,ws,utils}`, `migrations/`, `pkg/`.
- `cmd/api/main.go`: servidor Gin mínimo com `GET /health` e grupo `/api/v1` reservado (rotas reais a partir da Fase 2).
- `cmd/worker/main.go`: entrypoint reservado para jobs assíncronos, sem jobs ainda.
- `internal/config/config.go`: carregamento tipado de variáveis de ambiente (DB, Redis, JWT, S3/MinIO, Stripe, URL pública).
- Dependências adicionadas ao `go.mod` (gin, gorm + driver postgres, go-redis, golang-jwt, gorilla/websocket, stripe-go, godotenv, google/uuid) — `go mod tidy` removeu as ainda não importadas no código; serão readicionadas quando usadas nas próximas fases.
- Frontend Vite + React + TypeScript montado manualmente (ambiente local com Node 18/npm 8, incompatível com o CLI `create-vite` atual): `package.json`, `vite.config.ts` (proxy `/api` e `/ws` para o backend), `tsconfig.json`/`tsconfig.node.json`, Tailwind + PostCSS configurados, ESLint configurado (`.eslintrc.cjs`), estrutura `src/{components,pages,hooks,services,stores,layouts,types,routes,styles}`, `App.tsx` com placeholder e `main.tsx` com `BrowserRouter` + `QueryClientProvider`.
- `docker-compose.yml` na raiz: `postgres`, `redis`, `minio`, `backend`, `frontend`, `nginx`, com healthchecks e volumes nomeados.
- `infra/nginx/nginx.conf` (proxy reverso `/api`, `/ws`, `/` e bloco HTTPS de referência comentado para a Fase 13) e `infra/nginx/frontend.conf` (serve o build estático do frontend).
- `Dockerfile` do backend (multi-stage Go) e do frontend (multi-stage Node build + nginx).
- `Makefile` (up, down, restart, logs, build, shells, migrate-up/down placeholder, test, lint).
- `.github/workflows/ci.yml`: jobs `backend` (vet, build, test) e `frontend` (lint, build).
- `.env.example` no backend e no frontend; `.env` local do backend criado a partir do example (não versionado).
- `.gitignore` na raiz.
- `.claude/launch.json` atualizado com a configuração `fwlc-frontend` (npm run dev, porta 5173) para uso do preview.

**Arquivos novos:** ver lista de criação acima — toda a estrutura `backend/`, `frontend/`, `infra/nginx/`, `docker-compose.yml`, `Makefile`, `.github/workflows/ci.yml`, `.gitignore`.

**Arquivos alterados:**
- `.claude/launch.json` (adicionada configuração do frontend).
- `docs/TODO.md`, `docs/ROADMAP.md` (Fase 1 marcada como concluída).

**Verificação realizada:**
- Backend: `go build ./...`, `go vet ./...` e `gofmt -l .` limpos.
- Frontend: `npm install`, `npm run build` (tsc + vite build) e `npm run lint` (eslint) sem erros.
- Preview visual via `preview_start`/`preview_screenshot`: página placeholder renderizada corretamente em `http://localhost:5173` com Tailwind aplicado.

**Problemas encontrados:**
- Ambiente local usa Node 18.10/npm 8, incompatível com `create-vite@9` (exige Node ≥20.19) — projeto Vite foi montado manualmente arquivo por arquivo, com o mesmo resultado funcional.
- `npm install` é lento neste ambiente (~30s) e a primeira tentativa em background não populou `node_modules` corretamente; resolvido reexecutando em foreground.
- `go.mod` teve a diretiva `go` ajustada automaticamente pelo toolchain local (1.26.3 → 1.25.0 após `go mod tidy`); mantido acima do mínimo exigido (1.24+), sem impacto.

---

## 2026-07-02 — Fase 2: Autenticação

**O que foi criado:**

_Backend:_
- `backend/migrations/000001_create_users.{up,down}.sql` — tabela `users` com UUID PK, bcrypt hash, role, is_blocked.
- `backend/migrations/000002_create_sessions.{up,down}.sql` — tabela `sessions` com refresh_token_hash (SHA-256), FK users CASCADE.
- `backend/migrations/000003_create_password_reset_tokens.{up,down}.sql` — tabela `password_reset_tokens` com token_hash, used_at.
- `backend/internal/domain/{errors,user,session,password_reset_token}.go` — entidades de domínio e interfaces de repositório.
- `backend/internal/models/{user,session,password_reset_token}.go` — modelos GORM com conversão ToDomain()/FromDomain().
- `backend/internal/repositories/{user,session,password_reset_token}_repository.go` — implementações GORM das interfaces de domínio.
- `backend/internal/utils/{password,token}.go` — bcrypt e SHA-256/opaque token helpers.
- `backend/internal/services/jwt_service.go` — geração e parse de JWT HS256 (access token).
- `backend/internal/services/auth_service.go` — Register, Login, Refresh (rotação), Logout, ForgotPassword, ResetPassword.
- `backend/internal/services/user_service.go` — GetByID, UpdateProfile, DeleteAccount.
- `backend/internal/handlers/{dto,errors,auth_handler,user_handler}.go` — handlers Gin com validação ShouldBindJSON.
- `backend/internal/middlewares/{auth,cors}.go` — RequireAuth (JWT), RequireAdmin, CORS.
- `backend/internal/storage/{postgres,migrate}.go` — conexão GORM e migrations via golang-migrate/v4.
- `backend/internal/config/config.go` — configuração tipada de variáveis de ambiente.
- `backend/cmd/api/main.go` — wiring completo de DI, rotas auth e `/users/me`.

_Frontend:_
- `frontend/src/types/auth.ts` — tipos User, AuthResponse, LoginPayload, RegisterPayload.
- `frontend/src/services/api.ts` — instância Axios com interceptors de token (Bearer) e refresh automático com fila.
- `frontend/src/services/authService.ts` — register(), login(), logout().
- `frontend/src/stores/authStore.ts` — Zustand store (setAuth, clearAuth, hydrate via localStorage).
- `frontend/src/routes/PrivateRoute.tsx` — guard de rota (redireciona /login se não autenticado).
- `frontend/src/pages/LoginPage.tsx` — formulário de login com feedback de erro.
- `frontend/src/pages/RegisterPage.tsx` — formulário de cadastro com feedback de erro.
- `frontend/src/pages/DashboardPage.tsx` — placeholder de dashboard com logout.
- `frontend/src/App.tsx` — rotas: /login, /register, /dashboard (privado), * → /login.

**Arquivos alterados:**
- `docs/TODO.md`, `docs/ROADMAP.md` (Fase 2 marcada como concluída).

**Verificação realizada:**
- Backend: `gofmt -w`, `go build ./...`, `go vet ./...` — sem erros.
- Frontend: `npm run build` (tsc + vite, 153 módulos) e `npm run lint` — sem erros.

**Problemas encontrados:**
- Dois arquivos (`internal/handlers/dto.go`, `internal/services/jwt_service.go`) necessitavam `gofmt -w` — corrigido antes do build final.
- `main.tsx` já continha `BrowserRouter`; `App.tsx` não recebeu um segundo wrapper para evitar router aninhado.

---

## 2026-07-02 — Fase 3: Assinatura (AbacatePay/PIX)

**Decisão de gateway:** Stripe substituído por AbacatePay — gateway brasileiro com PIX, assinaturas recorrentes nativas e webhook HMAC-SHA256 verificável. BSPay (PixUp) avaliado e descartado (sem suporte a recorrência, sem sandbox documentado). Registrado em `docs/DECISIONS.md`.

**O que foi criado:**

_Backend:_
- `backend/migrations/000004_create_plans.{up,down}.sql` — tabela `plans` com `abacatepay_product_id`, intervalo, preço em centavos. Seed de 1 plano Mensal (R$29,90).
- `backend/migrations/000005_create_subscriptions.{up,down}.sql` — tabela `subscriptions` com `abacatepay_subscription_id`, status, `current_period_end`.
- `backend/internal/domain/{plan,subscription,payment_gateway}.go` — entidades, interface `PaymentGateway` (abstrai o gateway concreto), interface `SubscriptionRepository`, `PlanRepository`. Constantes de status.
- `backend/internal/domain/errors.go` — adicionados `ErrSubscriptionRequired` e `ErrAlreadySubscribed`.
- `backend/internal/models/{plan,subscription}.go` — modelos GORM com `ToDomain()`/`FromDomain()`.
- `backend/internal/repositories/{plan,subscription}_repository.go` — implementações GORM.
- `backend/internal/abacatepay/{client,subscription,webhook}.go` — cliente HTTP do AbacatePay, criação/cancelamento de assinatura, verificação de assinatura HMAC-SHA256 (`X-Webhook-Signature`).
- `backend/internal/services/subscription_service.go` — `ListPlans`, `Checkout` (cria sub pendente + retorna URL), `GetMySubscription`, `Cancel`, `HandleWebhookEvent` (sincroniza status local via eventos `subscription.completed/renewed/cancelled`).
- `backend/internal/middlewares/subscription.go` — `RequireSubscription`: bloqueia rotas com HTTP 402 se assinatura inativa.
- `backend/internal/handlers/{subscription_handler,webhook_handler}.go` — handlers Gin para planos, checkout, status, cancelamento e webhook.
- `backend/internal/handlers/errors.go` — mapeados `ErrSubscriptionRequired` → 402, `ErrAlreadySubscribed` → 409.
- `backend/internal/config/config.go` — variáveis `ABACATEPAY_API_KEY`, `ABACATEPAY_WEBHOOK_SECRET`, `ABACATEPAY_BASE_URL` (Stripe removido).
- `backend/cmd/api/main.go` — wiring de `planRepo`, `subRepo`, `abacateClient`, `subService`, `subHandler`, `webhookHandler`; rotas `/plans`, `/subscriptions/*`, `/webhooks/abacatepay`.
- `backend/.env.example` — substituídas vars Stripe pelas AbacatePay.

_Frontend:_
- `frontend/src/services/subscriptionService.ts` — `listPlans()`, `checkout()`, `getMySubscription()`, `cancelSubscription()`.
- `frontend/src/pages/SubscriptionPage.tsx` — tela de assinatura com listagem de planos, status atual, botão de cancelar. Redireciona para URL de checkout do AbacatePay.
- `frontend/src/App.tsx` — rota privada `/subscription` adicionada.

**Arquivos alterados:**
- `docs/DECISIONS.md`, `docs/DATABASE.md`, `docs/API.md`, `docs/RULES.md`, `CLAUDE.md` — Stripe → AbacatePay.
- `docs/TODO.md`, `docs/ROADMAP.md` — Fase 3 marcada como concluída.

**Verificação realizada:**
- Backend: `go build ./...`, `go vet ./...` — sem erros.
- Frontend: `npm run build` (155 módulos) e `npm run lint` — sem erros.

**Problemas encontrados:**
- `subscription_service.go`: `FindByID` requer `context.Context` — corrigido passando `ctx` na chamada.

---

## 2026-07-03 — Fase 4: Upload de vídeo (MinIO/S3)

**O que foi criado:**

_Backend:_
- `backend/migrations/000006_create_videos.{up,down}.sql` — tabela `videos` (storage_key, mime_type, size_bytes, duration_seconds, status: uploading/ready/failed).
- `backend/internal/domain/video.go` — entidade `Video`, interface `VideoRepository`, constantes `VideoMaxBytes` (2 GB), `AllowedVideoMIMEs` (mp4/quicktime/webm), status.
- `backend/internal/domain/errors.go` — adicionados `ErrFileTooLarge`, `ErrUnsupportedMIME`, `ErrVideoNotReady`.
- `backend/internal/models/video.go` — modelo GORM com `ToDomain()`/`VideoFromDomain()`.
- `backend/internal/repositories/video_repository.go` — CRUD GORM (Create, Update, FindByID, FindByUserID, Delete).
- `backend/internal/storage/s3.go` — `S3Client` via AWS SDK v2: `Upload()` (multipart, 10 MB/parte), `Delete()`, `PresignGet()` (1h). `UsePathStyle=true` para compatibilidade com MinIO. Endpoint customizável via env.
- `backend/internal/services/video_service.go` — `Upload()`: lê 512 bytes para detecção MIME real (`http.DetectContentType`), rejeita arquivo se MIME inválido ou tamanho > 2GB, faz multipart upload ao S3, marca status `ready`/`failed`. Também: `List`, `GetByID` (checa dono), `PresignURL`, `Delete`.
- `backend/internal/handlers/video_handler.go` — handlers Gin: `POST /videos` (multipart/form-data, campo `video`), `GET /videos`, `GET /videos/:id`, `GET /videos/:id/url`, `DELETE /videos/:id`. DTO de saída nunca expõe `storage_key`.
- `backend/internal/handlers/errors.go` — mapeados `ErrFileTooLarge` → 413, `ErrUnsupportedMIME` → 422, `ErrVideoNotReady` → 409.
- `backend/cmd/api/main.go` — wiring de `videoRepo`, `s3Client`, `videoService`, `videoHandler`; rotas `/videos/*` com `RequireAuth` + `RequireSubscription`.

_Frontend:_
- `frontend/src/services/videoService.ts` — `uploadVideo()` (com `onUploadProgress`), `listVideos()`, `getVideoURL()`, `deleteVideo()`.
- `frontend/src/pages/VideosPage.tsx` — tela `/videos`: botão de upload com input file oculto, barra de progresso, lista de vídeos com badge de status (pronto/enviando/falhou), exclusão. Validação de tamanho client-side (> 2GB) antes de enviar.
- `frontend/src/App.tsx` — rota privada `/videos` adicionada.

**Arquivos alterados:**
- `docs/TODO.md`, `docs/ROADMAP.md` — Fase 4 marcada como concluída.

**Verificação realizada:**
- Backend: `go build ./...`, `go vet ./...` — sem erros.
- Frontend: `npm run build` (157 módulos) e `npm run lint` — sem erros.

**Decisão de estratégia de upload:**
- Proxy via backend (não upload direto ao S3 pelo browser). Motivo: permite validação de MIME por magic bytes antes de persistir no storage, mantém `storage_key` opaco para o cliente, e simplifica o controle de acesso (RequireSubscription).
- Upload direto assinado (presigned PUT) seria mais eficiente para arquivos grandes, mas exigiria validação post-upload — decidido manter proxy para garantir integridade antes do registro. Pode ser revisado na Fase 12 (hardening).

**Observação:**
- Upload de imagens (thumbnail/foto de contato) postergado para Fase 5, onde será usado diretamente na criação de chamada.

---

## 2026-07-03 — Fase 5: Criação de chamada e link público

**O que foi criado:**

_Backend:_
- `backend/migrations/000007_create_calls.{up,down}.sql` — tabela `calls` (slug único, display_name, contact_photo_key, thumbnail_key, start_time_seconds, expires_at, status).
- `backend/internal/domain/call.go` — entidade `Call`, método `IsPubliclyAccessible()`, interface `CallRepository` (Create/Update/Delete/FindByID/FindBySlug/FindByUserID/SlugExists).
- `backend/internal/domain/errors.go` — adicionados `ErrCallExpired`, `ErrForbidden`.
- `backend/internal/models/call.go` — modelo GORM com `ToDomain()`/`CallFromDomain()`.
- `backend/internal/repositories/call_repository.go` — CRUD GORM com paginação em `FindByUserID`.
- `backend/internal/utils/slug.go` — `NewSlug(n)`: gera slug URL-safe via `crypto/rand` + base64.
- `backend/internal/services/call_service.go` — `Create` (valida vídeo pronto + gera slug único com retry), `Update`, `Delete`, `GetByID`, `List` (paginado), `GetPublic` (retorna URL pré-assinada 4h), `UploadImage` (magic bytes, JPEG/PNG/WEBP, 10MB), `SetContactPhoto`, `PresignImageURL`.
- `backend/internal/handlers/call_handler.go` — handlers Gin: POST/GET/PUT/DELETE `/calls`, POST `/calls/:id/image/:kind`, GET `/public/calls/:slug`. Helper `mustUserID()`, `parseTime()`.
- `backend/internal/handlers/errors.go` — mapeados `ErrCallExpired` → 410, `ErrForbidden` → 403.
- `backend/cmd/api/main.go` — wiring de `callRepo`, `callService`, `callHandler`; rotas `/calls/*` (RequireAuth + RequireSubscription), `/public/calls/:slug` (público).

_Frontend:_
- `frontend/src/services/callService.ts` — `listCalls`, `getCall`, `createCall`, `updateCall`, `deleteCall`, `uploadContactPhoto`, `getPublicCall`.
- `frontend/src/pages/CallsPage.tsx` — lista com status badge, links para editar/abrir/excluir.
- `frontend/src/pages/NewCallPage.tsx` — formulário de criação com seleção de vídeo pronto, nome, título, tempo de início, data de expiração.
- `frontend/src/pages/EditCallPage.tsx` — edição de chamada existente, upload de foto de contato, link público com botão copiar.
- `frontend/src/App.tsx` — rotas `/calls`, `/calls/new`, `/calls/:id/edit`.

**Verificação:**
- Backend: `go build ./...`, `go vet ./...` — sem erros.
- Frontend: `npm run build` (161 módulos), `npm run lint` — sem erros.

---

## 2026-07-03 — Fase 6: Página pública da chamada (clone WhatsApp Web)

**O que foi criado:**

_Frontend:_
- `frontend/src/pages/CallPublicPage.tsx` — página `/c/:slug`, rota pública (fora de `PrivateRoute`):
  - Busca `GET /api/v1/public/calls/:slug`; trata estados `loading`, `expired` (HTTP 410/404) e `error`.
  - `<video>` fullscreen com `autoPlay`, `playsInline`, `loop`, `disablePictureInPicture`, `controlsList="nodownload nofullscreen noremoteplayback"`, `pointerEvents: none` (impede pausa via clique), inicia em `start_time_seconds`.
  - Retenta `video.play()` na primeira interação do usuário caso autoplay seja bloqueado pelo browser.
  - Overlay gradient topo/base para legibilidade.
  - Topo: foto do contato (ou avatar SVG padrão), nome exibido, cronômetro MM:SS (hook `useCallTimer`), badge "Chamada de vídeo WhatsApp" com ícone verde.
  - Canto superior direito: miniatura de câmera própria com avatar.
  - Rodapé: botões decorativos mic (toggle muted/unmuted), encerrar (vermelho `#f02849`), câmera (toggle on/off), alto-falante, emoji — todos com ícones SVG inline.
  - `document.addEventListener('contextmenu', preventDefault)` e `selectstart` — bloqueia clique-direito e seleção em toda a página.
- `frontend/src/styles/index.css` — adicionados seletores `video::-webkit-media-controls*` para suprimir controles nativos via CSS mesmo quando o atributo `controls` não está presente (defesa extra).
- `frontend/src/App.tsx` — rota `/c/:slug` adicionada fora do bloco `PrivateRoute` (acesso público sem autenticação).

**Verificação:**
- Frontend: `npm run build` (162 módulos), `npm run lint` — sem erros.

---

## 2026-07-03 — Fase 7: Editor de timeline e eventos

**O que foi criado:**

_Backend:_
- `backend/migrations/000008_create_call_events.{up,down}.sql` — tabela `call_events` (trigger_at_seconds, type: popup/fullscreen/fake_billing, title, description, button_text, button_color).
- `backend/internal/domain/call_event.go` — entidade `CallEvent`, constantes de tipo, interface `CallEventRepository`.
- `backend/internal/models/call_event.go` — modelo GORM com `ToDomain()`/`CallEventFromDomain()`.
- `backend/internal/repositories/call_event_repository.go` — CRUD GORM; `FindByCallID` ordena por `trigger_at_seconds ASC`.
- `backend/internal/services/call_event_service.go` — `Create`/`List`/`ListPublic`/`Update`/`Delete`; valida tipo e ownership via chamada pai.
- `backend/internal/handlers/call_event_handler.go` — handlers Gin para criação, listagem, atualização e exclusão de eventos.
- `backend/internal/services/call_service.go` — `GetPublic` atualizado: agora recebe `CallEventRepository`, retorna `PublicCallData{Call, VideoURL, Events}` em vez de tupla. Assinatura de `NewCallService` atualizada.
- `backend/internal/handlers/call_handler.go` — `GetPublic` atualizado: serializa eventos como `[]publicEvent` no response JSON do endpoint `/public/calls/:slug`.
- `backend/cmd/api/main.go` — wiring de `callEventRepo`, `callEventService`, `callEventHandler`; rotas `GET/POST /calls/:callId/events`, `PUT/DELETE /events/:id`.

_Frontend:_
- `frontend/src/services/eventService.ts` — `listEvents`, `createEvent`, `updateEvent`, `deleteEvent`.
- `frontend/src/services/callService.ts` — adicionados tipos `PublicEvent` e campo `events: PublicEvent[]` em `PublicCall`.
- `frontend/src/pages/TimelineEditorPage.tsx` — editor visual: formulário (tipo, trigger em segundos + exibição MM:SS, título, descrição, texto/cor do botão com color picker), lista de eventos como linha do tempo vertical ordenada por tempo.
- `frontend/src/components/EventOverlay.tsx` — três overlays: `popup` (card flutuante na base), `fullscreen` (tela escura centralizada), `fake_billing` (tela completa estilo WhatsApp Pay).
- `frontend/src/pages/CallPublicPage.tsx` — hook `onTimeUpdate` no vídeo: dispara evento quando `currentTime >= trigger_at_seconds` (uma vez por evento via `Set`), pausa vídeo, exibe overlay; `dismissEvent()` fecha e retoma reprodução.
- `frontend/src/pages/EditCallPage.tsx` — link "Timeline de eventos" adicionado.
- `frontend/src/App.tsx` — rota privada `/calls/:id/timeline`.

**Verificação:**
- Backend: `go build ./...`, `go vet ./...` — sem erros.
- Frontend: `npm run build` (165 módulos), `npm run lint` — sem erros.

## [Unreleased] — 2026-07-06

### Adicionado
- **Modo Créditos por Minuto** (`billing_mode = 'credits'`): lead compra pacotes PIX (5/15/30/60min) antes de entrar na call; créditos são consumidos a 1/s; aviso em badge flutuante; alerta com 2min restantes; recarga sem desligar; call encerrada automaticamente ao zerar saldo.
- `CreditsOverlay.tsx`: componente com máquina de estados `select → pix → active → warning → topup → ended`.
- `EditCallPage.tsx`: toggle de ativação do modo créditos com exibição dos pacotes.
- `CallPublicPage.tsx`: orquestração do `CreditsOverlay` para tela inicial e badge durante a call.

## [Unreleased] — Funil completo 2026-07-06

### Adicionado
- **Upsell pages** (`type = 'upsell'`, rota `/u/:slug`): novo tipo de página criado como variante do presell, com 3 templates (VIP Upgrade, Premium, Bônus) e banner roxo de identificação.
- **`UpsellsPage`, `UpsellEditorPage`, `UpsellPublicPage`**: CRUD completo + página pública.
- **Migration 000028**: coluna `upsell_slug` em `call_events` para que o evento `upsell` saiba para onde navegar.
- **EventOverlay**: botão do evento `upsell` agora redireciona para a página de upsell vinculada.
- **TimelineEditorPage**: seletor de upsell_slug para eventos do tipo `upsell`; seletor de offer_call_slug para eventos do tipo `offer_call`.
- **PresellEditorPage**: suporte a `pageType="upsell"` com templates próprios + seletor "Página Upsell pós-call".
- **EditCallPage**: seletor de upsell pós-call (preenche `end_call_redirect_url` automaticamente).
- **FunnelsPage** (`/funnels`): visão completa do funil mostrando presell → call → upsell + downsell do presell para cada chamada.
- **AppLayout**: itens "Funis" (GitBranch) e "Upsell" (TrendingUp) adicionados à sidebar.

### Conexões do funil
- Presell → Call: dropdown "Funil de destino" no editor de presell seleciona chamada e auto-preenche `redirect_url`.
- Call → Upsell (pós-call): seletor na EditCallPage preenche `end_call_redirect_url`.
- Call → Upsell (in-call): evento `upsell` na timeline com `upsell_slug` navega para página.
- Presell → Downsell: exit-intent existente, agora visível na FunnelsPage.

## [2026-07-08] — Deploy production-ready

### Backend
- `cmd/api/main.go`: seed de usuário admin (`contato@edsoncosta.online`) na inicialização — idempotente, só cria se não existir.

### Infra
- `docker-compose.yml`: removido serviço `nginx`; backend e frontend conectados à rede `convtrack_default` (Caddy existente faz proxy reverso).
- `docs/DEPLOY.md`: tutorial completo de deploy para aaPanel + Docker + Caddy + MinIO na VPS.

## [2026-07-06] — Vínculos bidirecionais, analytics de funil, preview mobile, limites de plano

### Backend
- Migration `000029`: `cta_clicks INT DEFAULT 0` em `presell_pages`.
- Migration `000030`: `max_calls`, `max_presells`, `max_videos INT DEFAULT 0` em `plans`.
- `GET /calls/:id/presells` — lista presells vinculados a uma chamada.
- `POST /public/presell/:slug/cta-click` — incrementa contador de cliques no CTA.
- `PUT /admin/plans/:id/limits` — configura limites de criação por plano.
- `ErrPlanLimitReached` → HTTP 403 quando limite atingido.
- `CallService.CheckCreateLimit` / `PresellService.CheckCreateLimit` — verificam limite do plano antes de criar.

### Frontend
- `EditCallPage` — painel "Presells vinculados" mostra presells que apontam para a chamada, com CTA clicks e links de edição.
- `AnalyticsPage` — seção "Funil de conversão" por presell: CTA clicks / visitas call / % conversão.
- `PresellPublicPage` — dispara `POST /public/presell/:slug/cta-click` ao clicar no CTA.
- `TimelineEditorPage` — phone frame preview lateral (sticky, desktop) mostrando overlay do evento selecionado.
- `AdminPage` — nova aba "Planos" para configurar `max_calls`, `max_presells`, `max_videos` por plano.
- `SubscriptionPage` — badges mostram limites do plano ativo (ex: "até 5 chamadas").
