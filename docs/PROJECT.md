# PROJECT.md — Fake WhatsApp Live Call (FWLC)

> **Pivot de escopo (2026-06-29):** o projeto evoluiu de uma plataforma genérica
> de conteúdo por assinatura para um produto único e específico: simular uma
> chamada de vídeo do WhatsApp para fins de prank/engajamento/marketing. Esta
> versão substitui o escopo anterior. Ver [DECISIONS.md](DECISIONS.md).
> O repositório `linkpriv-clone/` deixou de ser referência relevante.

## Objetivo

Fake WhatsApp Live Call é um SaaS onde o assinante cria uma "falsa chamada de
vídeo" estilo WhatsApp, faz upload de um vídeo MP4, e gera um link público
(`/c/:slug`). Quando qualquer pessoa abre esse link, vê uma tela praticamente
idêntica à tela de chamada de vídeo do WhatsApp Web, com o vídeo enviado
tocando automaticamente como se fosse uma ligação real em andamento. Durante a
reprodução, o assinante pode configurar "pontos" (eventos da timeline) que
exibem popups, telas cheias ou uma tela de cobrança falsa em momentos exatos
do vídeo.

## Funcionalidades

- Cadastro/login com email e senha (JWT + refresh token).
- Assinatura mensal via Stripe (adaptável a outros provedores).
- Sem assinatura ativa → não pode criar chamadas. Com assinatura → chamadas ilimitadas.
- Dashboard: quantidade de chamadas, visualizações, links ativos, plano atual.
- Criação de chamada: título, upload de vídeo MP4 (até 2GB, resumable), thumbnail opcional, nome exibido, foto do contato, tempo inicial do vídeo, data de expiração.
- Geração de link público curto (`https://dominio.com/c/abc123xyz`).
- Página pública da chamada: clone visual da tela de chamada do WhatsApp Web — nome, foto, cronômetro de duração, ícones de chamada, vídeo em tela cheia, autoplay, sem controles, sem botão direito, sem download, sem barra de progresso.
- Editor de timeline (estilo editor de vídeo): pontos no tempo do vídeo que disparam eventos — popup, tela cheia, ou tela de cobrança falsa (título, descrição, imagem, botão, cor personalizáveis). Ao clicar no botão do evento, a ligação continua.
- Analytics por chamada: visitantes, tempo médio assistido, origem, cidade, IP, dispositivo, browser, sistema operacional.
- Painel administrativo: usuários, assinaturas, vídeos, chamadas, relatórios, logs, bloquear usuário, cancelar assinatura.
- Webhook do Stripe para sincronizar status de assinatura.

## Stack e Tecnologias

**Backend:** Go 1.24+, Gin, GORM, PostgreSQL, Redis, JWT, WebSocket, Stripe SDK, S3/MinIO SDK, Clean Architecture, Repository Pattern, Dependency Injection.

**Frontend:** React, Vite, TypeScript, React Router, React Query, TailwindCSS, shadcn/ui, Zustand, Axios.

**Infra:** Docker, Docker Compose, nginx (HTTPS ready), Makefile, GitHub Actions, MinIO (S3-compatível).

Qualquer mudança de biblioteca ou padrão deve ser registrada em [DECISIONS.md](DECISIONS.md) antes de ser adotada.

## Fluxo completo

1. **Cadastro/Login** — usuário cria conta (email/senha) → recebe JWT + refresh token.
2. **Assinatura** — usuário assina plano mensal via Stripe Checkout. Webhook do Stripe atualiza `subscriptions.status`.
3. **Bloqueio por assinatura** — middleware verifica assinatura ativa antes de permitir criar chamada.
4. **Criar chamada** — usuário faz upload do vídeo (resumable, progresso, validação de tipo/tamanho) → preenche dados (nome exibido, foto, tempo inicial, expiração) → backend gera `slug` único e salva em `calls`.
5. **Editor de timeline** — usuário adiciona eventos (`call_events`) na linha do tempo do vídeo: popup, tela cheia, cobrança falsa, cada um com tempo (segundos), título, descrição, imagem, botão, cor.
6. **Compartilhar link** — usuário copia `https://dominio.com/c/{slug}` e envia para o destinatário.
7. **Visitante abre o link** — página pública carrega dados da chamada (sem autenticação), renderiza UI estilo WhatsApp, inicia o vídeo automaticamente a partir do `start_time` configurado.
8. **Disparo de eventos** — conforme o vídeo avança, o player dispara os `call_events` no segundo exato (client-side, sincronizado pelo `currentTime` do `<video>`).
9. **Registro de visita** — backend registra `visits` (IP, geolocalização, dispositivo, browser, OS, tempo assistido, origem) via WebSocket ou requisição assíncrona.
10. **Expiração** — chamadas com `expires_at` no passado deixam de responder no endpoint público.
11. **Analytics** — dashboard do usuário agrega `visits` por chamada.
12. **Admin** — superusuário audita tudo via painel administrativo (`audit_logs`, bloqueio de usuários, cancelamento de assinaturas).

## Padrões utilizados

- Clean Architecture no backend: `domain` → `usecase`/`service` → `repository` (interface) → `infra` (implementação) → `handler` (Gin).
- Repository Pattern para acesso a dados (GORM por trás de interfaces).
- Dependency Injection manual via construtores (sem framework de DI, a menos que decidido em contrário — ver [DECISIONS.md](DECISIONS.md)).
- Documentação em `docs/` como fonte única de verdade.
- Nenhuma funcionalidade fora do [ROADMAP.md](ROADMAP.md). Nenhuma fase pulada ou misturada.
- Toda decisão técnica em [DECISIONS.md](DECISIONS.md); toda regra de negócio em [RULES.md](RULES.md).
