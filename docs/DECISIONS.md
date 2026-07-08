# DECISIONS.md — Fake WhatsApp Live Call

Registro de decisões técnicas e arquiteturais. Toda escolha de biblioteca,
framework ou padrão deve ser registrada aqui antes de ser adotada no código.

---

## 2026-07-03 — ZuckPay como gateway PIX dos overlays fake_billing

**Escolhemos:** ZuckPay (Basic Auth, `client_id:client_secret`), cada assinante do CallPrivada configura suas próprias credenciais. O dinheiro vai diretamente à conta ZuckPay do assinante.

**Por quê ZuckPay e não AbacatePay para os overlays:**
- AbacatePay é usado para as *assinaturas do CallPrivada* (planos dos criadores).
- ZuckPay é para os *pagamentos dos visitantes* nas chamadas — modelo multi-tenant onde cada criador tem suas próprias credenciais.

**Decisões de design:**
- `user_payment_configs` — uma linha por usuário, upsert via `ON CONFLICT (user_id)`.
- `billing_transactions` — rastreia cada cobrança; `external_id_client` = UUID da transação interna (usado para roteamento do webhook).
- Webhook único `POST /webhooks/zuckpay` para todos os usuários; roteamento por `external_id_client` → lookup da transação → lookup do usuário → validação HMAC com o `client_secret` desse usuário.
- `billing_amount_cents` no `call_event` — o criador define o valor na configuração do evento; o overlay usa esse valor para criar o PIX automaticamente.
- Secret mascarado na resposta da API (mostra apenas os últimos 4 caracteres) para não expor a credencial inteira.

---

## 2026-06-29 — Stack inicial do projeto

**Escolhemos:** Go (backend) + React (frontend) + PostgreSQL (banco) + MinIO/S3 (storage de mídia) + JWT (autenticação) + Clean Architecture.

**Motivo:**
- Go oferece performance e simplicidade para um backend que vai lidar com upload de arquivos grandes (até 2GB) e um motor de agendamento de eventos sensível a tempo.
- React é o padrão de mercado para SPAs com necessidade de UI rica (dashboard, player, timeline).
- PostgreSQL é robusto para dados relacionais (usuários, assinaturas, pagamentos) com necessidade de integridade referencial.
- MinIO em desenvolvimento permite simular S3 localmente sem custo, com migração direta para S3 em produção.
- Clean Architecture isola regras de negócio de frameworks/infra, facilitando testes e manutenção a longo prazo.

---

## Pendências de decisão (a resolver durante as fases — escopo antigo, mantidas por histórico)
- ~~Mecanismo do motor de agendamento de eventos~~ — não se aplica mais: eventos agora são disparados client-side pelo tempo do vídeo (ver pivot abaixo).
- Estratégia de transcodificação/streaming de vídeo: a definir (servir direto do S3 com URL assinada vs. proxy via backend).

---

## 2026-06-29 — Pivot de escopo: Fake WhatsApp Live Call

**Decidimos:** substituir o escopo genérico de "plataforma de conteúdo por assinatura" (CallPrivada) por um produto único e específico: SaaS que gera links de falsa chamada de vídeo estilo WhatsApp, com timeline de eventos (popup/fullscreen/cobrança falsa) e Stripe para assinatura.

**Motivo:**
- O usuário trouxe um briefing completo, específico e com fluxo de produto definido, substituindo o escopo amplo anterior.
- Mantém a base de Clean Architecture e Go/React já decidida, mas exige Gin, GORM, Redis, WebSocket e Stripe, que não estavam na decisão original.
- `linkpriv-clone/` deixa de ser referência relevante; nenhum código do escopo antigo havia sido escrito, então não há retrabalho de implementação, apenas de documentação.

**Escolhemos (estende a decisão de stack inicial):**
- Gin como framework HTTP (sobre net/http puro), pela produtividade e middlewares prontos (CORS, recovery, rate limit).
- GORM como ORM, com Repository Pattern por cima para manter Clean Architecture (services não conhecem GORM diretamente).
- Redis para rate limiting e suporte a cache/sessões.
- ~~Stripe como gateway de pagamento inicial~~ — substituído por AbacatePay (ver decisão 2026-07-02 abaixo).
- WebSocket nativo (gorilla/websocket ou equivalente) para notificações em tempo real no dashboard — não é usado para disparo dos eventos da timeline (esses são client-side, sincronizados pelo `currentTime` do vídeo, para garantir precisão e resiliência).
- Vite + TypeScript + TailwindCSS + shadcn/ui + Zustand + React Query + Axios no frontend, conforme solicitado.
- nginx como reverse proxy/TLS termination, com Makefile e GitHub Actions para padronizar comandos e CI.

**Pendências de decisão (novo escopo):**
- Estratégia de CSRF: cookie+token vs. Bearer-only (a confirmar na Fase 2). → resolvido: Bearer-only (JWT no header), sem cookie.
- Geolocalização por IP para analytics (Fase 9): provedor a definir (ex. base local MaxMind vs. serviço externo).
- Estratégia de upload resumable: multipart direto ao S3/MinIO assinado vs. proxy via backend (Fase 4).

---

## 2026-07-02 — Gateway de pagamento: AbacatePay (substitui Stripe)

**Decidimos:** usar **AbacatePay** como gateway de pagamento (PIX), substituindo Stripe.

**Motivo:**
- Produto é voltado ao mercado brasileiro — PIX é o método de pagamento dominante.
- AbacatePay suporta assinaturas recorrentes nativas (WEEKLY/MONTHLY/SEMIANNUALLY/ANNUALLY) com eventos de webhook (`subscription.renewed`, `subscription.cancelled`) — elimina necessidade de motor próprio de cobrança recorrente.
- Webhook verificável via HMAC-SHA256 com header `X-Webhook-Signature` — implementação direta em Go.
- Sandbox/dev mode integrado no dashboard (sem URL separada).
- BSPay (PixUp) foi avaliado e descartado: sem suporte a assinaturas recorrentes, sem sandbox documentado, sem verificação de webhook documentada.

**Contrato da interface de domínio mantido:** `domain.PaymentGateway` continua existindo como interface — AbacatePay implementa via infra, services nunca importam o SDK diretamente. Permite trocar por outro gateway no futuro sem reescrever regras de negócio.

**Variáveis de ambiente adicionadas:**
- `ABACATEPAY_API_KEY` — chave estática da API
- `ABACATEPAY_WEBHOOK_SECRET` — segredo para verificação HMAC-SHA256 do webhook
- `ABACATEPAY_BASE_URL` — default `https://api.abacatepay.com` (sobrescrito para sandbox/testes)

**Autenticação:** `Authorization: Bearer <ABACATEPAY_API_KEY>` em todas as requisições (sem OAuth).
