import type { EventType } from '../services/eventService';

// ── Textos secundários editáveis por tipo de evento ────────────────────────
// Cada entrada vira um input em "Textos avançados" (timeline e editor de
// vídeo); valor vazio usa o padrão do sistema no overlay.
export const COMMON_PAY_TEXTS = [
  { key: 'pay_header',   label: 'Cabeçalho da tela de pagamento', def: '' },
  { key: 'paid_title',   label: 'Título após pagar', def: 'Pagamento confirmado!' },
  { key: 'paid_subtitle',label: 'Subtítulo após pagar', def: 'Obrigado. Seu acesso foi liberado.' },
  { key: 'paid_button',  label: 'Botão após pagar', def: 'Continuar' },
  { key: 'copy_hint',    label: 'Dica do copia-e-cola', def: 'Ou use o código PIX copia e cola' },
  { key: 'copy_button',  label: 'Botão copiar código', def: 'Copiar código PIX' },
  { key: 'check_button', label: 'Botão "já paguei"', def: 'Já realizei o pagamento' },
  { key: 'secure_note',  label: 'Nota de segurança', def: 'Pagamento Seguro • Seus dados estão seguros' },
];

export const EXTRA_TEXT_FIELDS: Partial<Record<EventType, { key: string; label: string; def: string }[]>> = {
  countdown: [
    { key: 'badge', label: 'Badge de urgência', def: 'Oferta por tempo limitado' },
  ],
  offer_call: [
    { key: 'dismiss_text', label: 'Link "agora não"', def: 'Agora não' },
  ],
  upsell: [
    { key: 'badge', label: 'Badge do card', def: 'Oferta especial' },
    { key: 'dismiss_text', label: 'Link fechar', def: 'Fechar' },
  ],
  reconnect_paywall: [
    { key: 'lost_title',     label: 'Título "sem conexão"', def: 'Sem conexão' },
    { key: 'lost_subtitle',  label: 'Subtítulo "verificando"', def: 'Verificando a rede' },
    { key: 'trying_title',   label: 'Título "reconectando"', def: 'Reconectando' },
    { key: 'failed_title',   label: 'Título da falha', def: 'Conexão instável' },
    { key: 'secure_note',    label: 'Nota de segurança', def: '🔒 Pagamento seguro' },
    ...COMMON_PAY_TEXTS.filter(t => !['secure_note'].includes(t.key)),
  ],
  incoming_call: [
    { key: 'call_subtitle', label: 'Subtítulo da chamada', def: 'Ligação de WhatsApp' },
    { key: 'decline_text',  label: 'Botão recusar', def: 'Recusar' },
    { key: 'accept_text',   label: 'Botão atender', def: 'Atender' },
  ],
  battery_low: [
    { key: 'tap_hint', label: 'Dica "toque para fechar"', def: 'Toque para fechar' },
  ],
  viewer_count: [
    { key: 'suffix_text', label: 'Sufixo do contador', def: 'ao vivo' },
  ],
  social_proof: [
    { key: 'time_text', label: 'Texto de tempo', def: 'agora mesmo' },
  ],
  exclusive_access: [
    { key: 'dismiss_text', label: 'Link fechar', def: 'Fechar' },
  ],
  tip_jar: [
    { key: 'dismiss_text', label: 'Link "agora não"', def: 'Agora não' },
    ...COMMON_PAY_TEXTS,
  ],
  video_lock: COMMON_PAY_TEXTS,
  phone_block: COMMON_PAY_TEXTS,
  age_gate: [
    { key: 'verify_note', label: 'Nota de verificação (caixa amarela)', def: 'Uma cobrança simbólica é usada para verificar que você possui um cartão válido registrado em nome de um adulto.' },
    ...COMMON_PAY_TEXTS,
  ],
  fake_billing: [
    { key: 'payment_note', label: 'Nota abaixo do valor', def: 'Pagamento via PIX • instantâneo' },
    ...COMMON_PAY_TEXTS,
  ],
};
