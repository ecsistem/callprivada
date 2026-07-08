# Deploy — callprivada.online (aaPanel + Docker + Caddy)

> Pré-requisito: servidor com **aaPanel** instalado, **Docker** ativado no painel e o projeto **Cloakhide/convtrack** já rodando com Caddy na rede `convtrack_default`.

---

## 1. DNS

No painel do seu registrador, crie 3 registros **A** apontando para o IP do servidor:

| Nome | Tipo | Valor |
|------|------|-------|
| `callprivada.online` | A | `<IP do servidor>` |
| `www.callprivada.online` | A | `<IP do servidor>` |
| `storage.callprivada.online` | A | `<IP do servidor>` |

Aguarde a propagação (5–30 min) antes de continuar.

---

## 2. Clonar o repositório no servidor

No aaPanel, vá em **Terminal** (ou acesse via SSH) e execute:

```bash
cd /www/wwwroot
git clone https://github.com/SEU_USUARIO/callprivada.git
cd callprivada
```

---

## 3. Criar o arquivo de ambiente do backend

```bash
cp backend/.env.example backend/.env
nano backend/.env
```

Cole e preencha com seus valores:

```env
APP_ENV=production
HTTP_PORT=8080

DATABASE_URL=postgres://fwlc:fwlc@postgres:5432/fwlc?sslmode=disable
REDIS_URL=redis://redis:6379

JWT_SECRET=COLE_AQUI_O_RESULTADO_DO_COMANDO_ABAIXO
JWT_ACCESS_TTL_MIN=15
JWT_REFRESH_TTL_HOURS=168

S3_ENDPOINT=minio:9000
S3_PUBLIC_ENDPOINT=storage.callprivada.online
S3_REGION=us-east-1
S3_BUCKET=fwlc
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_USE_SSL=false

ABACATEPAY_API_KEY=SUA_CHAVE_ABACATEPAY_PRODUCAO
ABACATEPAY_WEBHOOK_SECRET=SEU_WEBHOOK_SECRET_ABACATEPAY
ABACATEPAY_BASE_URL=https://api.abacatepay.com

PUBLIC_BASE_URL=https://callprivada.online
WEBHOOK_BASE_URL=https://callprivada.online

STORAGE_DRIVER=s3
```

Para gerar o `JWT_SECRET`:

```bash
openssl rand -hex 32
```

Salve o arquivo: `Ctrl+O`, `Enter`, `Ctrl+X`.

---

## 4. Configurar o Caddy (adicionar blocos ao Caddyfile existente)

Localize o Caddyfile do convtrack. Normalmente está em:

```bash
find /www -name "Caddyfile" 2>/dev/null
# ou
docker inspect convtrack-caddy-1 | grep -A5 Mounts
```

Edite o arquivo e adicione os dois blocos abaixo **ao final**, antes de fechar:

```bash
nano /caminho/encontrado/Caddyfile
```

```caddy
# ── callprivada.online ────────────────────────────────────────────────────────
callprivada.online, www.callprivada.online {
    encode gzip zstd

    handle /api/* {
        reverse_proxy callprivada-backend-1:8080
    }
    handle /ws/* {
        reverse_proxy callprivada-backend-1:8080
    }
    handle /files/* {
        reverse_proxy callprivada-backend-1:8080
    }
    handle {
        reverse_proxy callprivada-frontend-1:80
    }
}

# ── MinIO storage (callprivada) ───────────────────────────────────────────────
storage.callprivada.online {
    encode gzip zstd
    reverse_proxy callprivada-minio-1:9000
}
```

Recarregue o Caddy:

```bash
docker exec convtrack-caddy-1 caddy reload --config /etc/caddy/Caddyfile
```

---

## 5. Subir os containers pelo aaPanel

### Opção A — via Terminal do aaPanel

```bash
cd /www/wwwroot/callprivada
docker compose up -d --build
```

### Opção B — via Docker Compose Manager do aaPanel

1. No aaPanel, vá em **Docker → Compose**
2. Clique em **Adicionar**
3. Defina o nome: `callprivada`
4. Aponte o caminho para `/www/wwwroot/callprivada`
5. Clique em **Iniciar**

---

## 6. Verificar se está tudo rodando

```bash
docker compose ps
```

Saída esperada (todos `running`):

```
NAME                        STATUS
callprivada-postgres-1      running
callprivada-redis-1         running
callprivada-minio-1         running
callprivada-minio-init-1    exited (0)   ← normal, roda só uma vez
callprivada-backend-1       running
callprivada-frontend-1      running
```

Verificar logs do backend (migrations + seed):

```bash
docker compose logs backend --tail=50
```

Você deve ver linhas como:

```
migrations applied successfully
seed: admin user created (contato@edsoncosta.online)
fwlc-backend listening on :8080 (env=production)
```

---

## 7. Acessar o sistema

| URL | O que é |
|-----|---------|
| `https://callprivada.online` | Frontend (dashboard) |
| `https://callprivada.online/api/v1/health` | Health check da API |
| `https://storage.callprivada.online` | MinIO (arquivos) |

**Login inicial:**
- Email: `contato@edsoncosta.online`
- Senha: `senha123`

> Troque a senha pelo painel de usuário após o primeiro login.

---

## 8. Atualizar o sistema no futuro

```bash
cd /www/wwwroot/callprivada
git pull
docker compose up -d --build
```

---

## Troubleshooting

**Caddy não resolve os containers do callprivada:**
```bash
# Confirme que os containers estão na rede convtrack_default
docker network inspect convtrack_default | grep callprivada
```

**MinIO não sobe (disco cheio):**
```bash
docker system prune -f
docker builder prune -f
```

**Banco não inicia:**
```bash
docker compose logs postgres
```

**Webhook do AbacatePay não chega:**
- Confirme que `WEBHOOK_BASE_URL=https://callprivada.online` está correto no `.env`
- No painel do AbacatePay, o webhook deve apontar para `https://callprivada.online/api/v1/webhooks/abacatepay`
