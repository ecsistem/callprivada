# RULES.md — Fake WhatsApp Live Call

## Assinatura
- Usuário sem assinatura ativa não pode criar chamadas.
- Usuário com assinatura ativa pode criar chamadas ilimitadas.
- Assinatura é controlada via AbacatePay (PIX); status local (`subscriptions.status`) é
  sincronizado exclusivamente pelo webhook do AbacatePay, nunca alterado direto pelo usuário.
- Cancelamento de assinatura mantém acesso até `current_period_end`; após isso, vira `expired`/bloqueado.
- Chamadas já criadas continuam existindo mesmo se a assinatura expirar, mas não podem ser criadas novas.

## Vídeo
- Formatos aceitos: MP4, MOV, WEBM.
- Tamanho máximo: 2GB.
- Upload deve ser resumable e validado por MIME real, não apenas extensão.
- Vídeo só pode ser usado em chamada após status `ready` (processado/validado).

## Chamada
- Cada chamada possui um `slug` único, público, usado em `/c/:slug`.
- Chamada com `expires_at` no passado não pode mais ser acessada publicamente (retorna expirada/404 amigável).
- Página pública da chamada não expõe nenhuma informação do dono além do necessário para a simulação (nome exibido, foto, vídeo).
- Página pública bloqueia: clique direito, seleção de texto, controles nativos do `<video>`, barra de progresso, download direto.
- Vídeo da chamada inicia automaticamente a partir de `start_time_seconds`.

## Timeline / eventos
- Cada chamada pode ter múltiplos `call_events`.
- Cada evento é disparado no segundo exato (`trigger_at_seconds`) durante a reprodução.
- Tipos de evento: `popup`, `fullscreen`, `fake_billing`.
- Evento do tipo `fake_billing` deve ocupar a tela toda e pausar a percepção de "ligação" até o visitante clicar no botão configurado.
- Ao clicar no botão do evento, a reprodução da chamada continua normalmente.
- Não há limite de quantidade de eventos por chamada (a menos que definido o contrário em [DECISIONS.md](DECISIONS.md)).

## Visitas / Analytics
- Toda visita à página pública gera um registro em `visits`, mesmo sem interação.
- Dados coletados: IP, geolocalização (cidade/país), dispositivo, browser, sistema operacional, origem (referrer), tempo assistido.
- Tempo assistido é atualizado periodicamente durante a reprodução (não apenas no fim).

## Admin
- Usuário bloqueado (`is_blocked = true`) não pode autenticar nem acessar a API autenticada.
- Apenas usuários com `role = admin` acessam rotas `/admin/*`.
- Toda ação administrativa sensível (bloquear usuário, cancelar assinatura) gera um `audit_log`.

---

> Regras revogadas devem ser marcadas como `[REVOGADA]` aqui, nunca removidas. Justificativa em [DECISIONS.md](DECISIONS.md).
