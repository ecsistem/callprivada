# DATABASE.md — Fake WhatsApp Live Call

> Nenhuma migration foi aplicada ainda. Schema abaixo é a previsão a ser
> implementada por fase no [ROADMAP.md](ROADMAP.md). Toda mudança real no
> schema deve atualizar este arquivo no mesmo PR/commit.

## Entidades do domínio

`User`, `Plan`, `Subscription`, `Video`, `Call`, `CallEvent`, `Visit`,
`Session`, `AuditLog`.

## Tabelas

### users (Fase 2)
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| name | varchar | |
| email | varchar unique | índice único |
| password_hash | varchar | bcrypt/argon2 |
| role | varchar | `user` \| `admin` |
| is_blocked | boolean | default false |
| created_at / updated_at | timestamp | |

### sessions (Fase 2)
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK -> users.id | |
| refresh_token_hash | varchar | nunca armazenar token puro |
| user_agent | varchar | |
| ip | varchar | |
| expires_at | timestamp | |
| revoked_at | timestamp nullable | |
| created_at | timestamp | |

### plans (Fase 3)
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| name | varchar | ex.: `Mensal`, `Anual` |
| price_cents | integer | em centavos BRL |
| interval | varchar | `MONTHLY`\|`SEMIANNUALLY`\|`ANNUALLY` |
| abacatepay_product_id | varchar | ID do produto no AbacatePay |
| active | boolean | default true |
| created_at / updated_at | timestamp | |

### subscriptions (Fase 3)
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK -> users.id | índice |
| plan_id | uuid FK -> plans.id | |
| abacatepay_subscription_id | varchar nullable | ID da assinatura no AbacatePay |
| status | varchar | `active`\|`pending`\|`cancelled`\|`expired` |
| current_period_end | timestamp nullable | data até a qual o acesso está liberado |
| created_at / updated_at | timestamp | |

### videos (Fase 4)
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK -> users.id | |
| storage_key | varchar | path no S3/MinIO |
| original_name | varchar | |
| mime_type | varchar | mp4/mov/webm |
| size_bytes | bigint | máx. 2GB |
| duration_seconds | numeric | preenchido após processamento |
| status | varchar | `uploading`\|`ready`\|`failed` |
| created_at | timestamp | |

### calls (Fase 4/5/6)
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK -> users.id | |
| video_id | uuid FK -> videos.id | |
| slug | varchar unique | índice único, usado em `/c/:slug` |
| title | varchar | uso interno do assinante |
| display_name | varchar | nome exibido na tela de chamada |
| contact_photo_key | varchar nullable | foto do contato (storage key) |
| thumbnail_key | varchar nullable | |
| start_time_seconds | integer | ponto inicial do vídeo |
| expires_at | timestamp nullable | |
| status | varchar | `active`\|`expired`\|`disabled` |
| created_at / updated_at | timestamp | |

### call_events (Fase 6/7 do roadmap deste produto = editor de timeline)
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| call_id | uuid FK -> calls.id | índice |
| trigger_at_seconds | integer | momento exato no vídeo |
| type | varchar | `popup`\|`fullscreen`\|`fake_billing` |
| title | varchar | |
| description | text | |
| image_key | varchar nullable | |
| button_text | varchar nullable | |
| button_color | varchar nullable | hex |
| created_at / updated_at | timestamp | |

### visits (Fase 9 — Analytics)
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| call_id | uuid FK -> calls.id | índice |
| ip | varchar | |
| city | varchar nullable | resolvido via geo-IP |
| country | varchar nullable | |
| device | varchar nullable | mobile/desktop/tablet |
| browser | varchar nullable | |
| os | varchar nullable | |
| referrer | varchar nullable | origem |
| watched_seconds | integer | tempo assistido |
| created_at | timestamp | |

### audit_logs (Admin)
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| actor_user_id | uuid FK -> users.id | quem executou a ação |
| action | varchar | ex.: `block_user`, `cancel_subscription` |
| target_type | varchar | ex.: `user`, `subscription`, `call` |
| target_id | uuid | |
| metadata | jsonb nullable | |
| created_at | timestamp | |

## Índices
- `users.email` (unique)
- `calls.slug` (unique)
- `visits.call_id`
- `call_events.call_id`
- `subscriptions.user_id`
- `sessions.user_id`

## Relacionamentos (resumo)
- users 1—N videos
- users 1—N calls
- users 1—N subscriptions (histórico; "atual" = última ativa)
- users 1—N sessions
- plans 1—N subscriptions
- videos 1—N calls (um vídeo pode, em tese, ser reaproveitado — a confirmar regra em [RULES.md](RULES.md))
- calls 1—N call_events
- calls 1—N visits
- users 1—N audit_logs (como ator)
