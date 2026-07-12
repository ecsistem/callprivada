import api from './api';

export interface PresellConfig {
  // Visual
  bg_color: string;
  text_color: string;
  bg_image_url?: string;

  // Identity
  avatar_url?: string;
  name: string;
  badge?: string;

  // Copy
  headline: string;
  subheadline?: string;

  // Slots
  show_slots: boolean;
  slot_labels?: string[];
  /** true = disponível (clicável), false = esgotado (disabled) — índice espelha slot_labels */
  slot_availability?: boolean[];
  /** Gera slots baseados no horário real de acesso do lead */
  use_real_time?: boolean;

  // Social proof
  /** Mostra "X pessoas tentando entrar agora" */
  show_viewer_count?: boolean;
  /** Base para randomizar o contador (ex: 47 → mostra 40–54) */
  viewer_count_base?: number;

  // Countdown
  /** Mostra timer regressivo de urgência */
  show_countdown?: boolean;
  /** Segundos do countdown (padrão 300 = 5min) */
  countdown_seconds?: number;

  // Location badge
  /** Label pequeno acima da cidade, ex: "Ligação Exclusiva" */
  location_label?: string;
  /** Nome da cidade/região em destaque, ex: "Capanema" */
  location_city?: string;

  // Video
  /** URL direta de vídeo MP4 ou embed do YouTube */
  video_url?: string;
  /** URL da thumbnail/poster exibida antes do play */
  video_poster_url?: string;

  // Comments
  show_comments?: boolean;
  comments?: PresellComment[];

  // CTA
  cta_text: string;
  cta_color: string;
  redirect_url: string;
  downsell_slug?: string;

  /**
   * Textos avançados — sobrescreve qualquer texto secundário da página pública.
   * Chaves: countdown_label, countdown_expired_text, viewer_count_text,
   * slots_label, slots_label_manual, sold_out_label, cta_disclaimer,
   * exit_modal_header, exit_modal_title, exit_modal_text, exit_modal_button,
   * exit_modal_dismiss, downsell_banner_text, upsell_banner_text.
   * Valor vazio usa o padrão do sistema.
   */
  extra_texts?: Record<string, string>;

  // Downsell — price comparison block
  /** Preço original riscado, ex: "R$ 497" */
  original_price_label?: string;
  /** Preço com desconto, ex: "R$ 197" */
  discounted_price_label?: string;
  /** Badge de desconto, ex: "60% OFF — só hoje" */
  discount_badge?: string;
}

export interface PresellComment {
  name: string;
  avatar_emoji?: string;
  text: string;
  time?: string;
  likes?: number;
}

export interface PresellPage {
  id: string;
  call_id?: string;
  slug: string;
  type: string; // "presell" | "downsell" | "upsell"
  template_slug: string;
  config: PresellConfig;
  cta_clicks: number;
  tracking?: import('./trackingService').TrackingConfig;
  created_at: string;
  updated_at: string;
}

export interface UpsertPresellPayload {
  call_id?: string;
  type?: string;
  template_slug: string;
  config: PresellConfig;
}

export const TEMPLATES: { slug: string; label: string; description: string; defaults: Partial<PresellConfig> }[] = [
  {
    slug: 'ao-vivo',
    label: '🔴 Ao Vivo',
    description: 'Detecta o horário real do lead e gera slots dinâmicos — máxima urgência e personalização',
    defaults: {
      bg_color: '#0a0a0a',
      text_color: '#ffffff',
      badge: '🔴 AO VIVO AGORA',
      headline: 'Você chegou na hora certa — só sobrou 1 vaga',
      subheadline: 'Estou online agora e escolhi você. Selecione um horário abaixo antes que feche.',
      cta_text: '🔥 Garantir minha vaga agora',
      cta_color: '#dc2626',
      show_slots: true,
      slot_labels: ['Agora — 1 vaga disponível', 'Em 15 min — 0 vagas', 'Em 30 min — 0 vagas'],
      slot_availability: [true, false, false],
      use_real_time: true,
      show_viewer_count: true,
      viewer_count_base: 43,
      show_countdown: true,
      countdown_seconds: 300,
    },
  },
  {
    slug: 'intimo',
    label: '🔒 Íntimo',
    description: 'Visual escuro e elegante — exclusividade e mistério para atrair fãs que pagam por VIP',
    defaults: {
      bg_color: '#0d0d0d',
      text_color: '#ffffff',
      badge: '🔒 Conteúdo Exclusivo +18',
      headline: 'Tenho algo gravado só pra você — não mostro pra qualquer um',
      subheadline: 'Esse conteúdo fica disponível por pouco tempo. Garanta agora antes de eu tirar do ar.',
      cta_text: '🔥 Quero ver agora',
      cta_color: '#e11d48',
      show_slots: false,
      show_viewer_count: true,
      viewer_count_base: 29,
      show_countdown: true,
      countdown_seconds: 480,
    },
  },
  {
    slug: 'urgencia',
    label: '⏳ Urgência',
    description: 'Horário real do lead + countdown + vagas — tripla pressão para converter na hora',
    defaults: {
      bg_color: '#0f0505',
      text_color: '#ffffff',
      badge: '⚠️ Atenção — vagas acabando',
      headline: 'Você abriu esse link às {hora} — isso não foi por acaso',
      subheadline: 'Tenho um conteúdo esperando por você. Escolha um horário antes que as vagas acabem.',
      cta_text: 'Quero meu acesso exclusivo',
      cta_color: '#dc2626',
      show_slots: true,
      slot_labels: ['Agora — 1 vaga disponível', 'Em 15 min — 0 vagas', 'Em 30 min — 0 vagas'],
      slot_availability: [true, false, false],
      use_real_time: true,
      show_viewer_count: true,
      viewer_count_base: 61,
      show_countdown: true,
      countdown_seconds: 600,
    },
  },
  {
    slug: 'vip',
    label: '💎 VIP',
    description: 'Rosa/vinho premium — posiciona como criadora high-ticket e filtra só lead qualificado',
    defaults: {
      bg_color: '#1a0010',
      text_color: '#fdf2f8',
      badge: '💎 Área VIP — Acesso Restrito',
      headline: 'Você foi selecionado para o meu grupo privado',
      subheadline: 'Aqui eu mostro o que não aparece em nenhum outro lugar. Só para quem realmente merece ver.',
      cta_text: '💋 Entrar no grupo VIP',
      cta_color: '#be185d',
      show_slots: false,
      show_countdown: true,
      countdown_seconds: 900,
    },
  },
  {
    slug: 'direto',
    label: '⚡ Direto',
    description: 'Mínimo de texto + countdown — máxima conversão para tráfego quente que já sabe o que quer',
    defaults: {
      bg_color: '#120208',
      text_color: '#ffffff',
      badge: '+18',
      headline: 'Clica e vê o que está te esperando',
      subheadline: '',
      cta_text: 'Ver agora →',
      cta_color: '#7c3aed',
      show_slots: false,
      show_countdown: true,
      countdown_seconds: 180,
    },
  },
];

export function getTemplateDefaults(slug: string): Partial<PresellConfig> {
  return TEMPLATES.find(t => t.slug === slug)?.defaults ?? TEMPLATES[0].defaults;
}

export const DOWNSELL_TEMPLATES: { slug: string; label: string; description: string; defaults: Partial<PresellConfig> }[] = [
  {
    slug: 'espera',
    label: '⚠️ Espera!',
    description: 'Urgência imediata — para o lead antes de sair com um aviso forte e uma última chance',
    defaults: {
      bg_color: '#0f0505',
      text_color: '#ffffff',
      badge: '⚠️ ESPERA! Antes de sair…',
      headline: 'Você está prestes a perder algo especial',
      subheadline: 'Preparei isso só pra você. Uma vez que fechar essa aba, não vou poder garantir de novo.',
      cta_text: '🔥 Quero minha última chance',
      cta_color: '#dc2626',
      show_slots: false,
      show_countdown: true,
      countdown_seconds: 180,
      show_viewer_count: true,
      viewer_count_base: 22,
    },
  },
  {
    slug: 'ultima-chance',
    label: '🚨 Última Chance',
    description: 'Oferta exclusiva de saída — desconto ou bônus especial que só aparece aqui',
    defaults: {
      bg_color: '#0a0a0a',
      text_color: '#ffffff',
      badge: '🚨 Oferta de saída — só agora',
      headline: 'Tudo bem. Mas antes de ir…',
      subheadline: 'Tenho uma condição especial que normalmente não ofereço. Só pra você, só agora.',
      cta_text: 'Ver condição especial →',
      cta_color: '#f59e0b',
      show_slots: false,
      show_countdown: true,
      countdown_seconds: 300,
    },
  },
  {
    slug: 'fomo',
    label: '😱 FOMO',
    description: 'Medo de perder — mostra o que o lead vai deixar para trás ao sair',
    defaults: {
      bg_color: '#030712',
      text_color: '#ffffff',
      badge: '😱 Você está saindo sem ver isso',
      headline: 'Todo mundo que saiu assim voltou arrependido',
      subheadline: 'Não vou guardar isso pra sempre. O que eu tenho pra mostrar vai mudar tudo.',
      cta_text: 'Tudo bem, quero ver',
      cta_color: '#7c3aed',
      show_slots: false,
      show_countdown: true,
      countdown_seconds: 240,
      show_viewer_count: true,
      viewer_count_base: 34,
    },
  },
  {
    slug: 'reconsidera',
    label: '💬 Reconsidera',
    description: 'Tom suave e pessoal — apela pela conexão antes de deixar o lead ir embora',
    defaults: {
      bg_color: '#0d0d0d',
      text_color: '#ffffff',
      badge: '💬 Uma última coisa…',
      headline: 'Espera, só um segundo',
      subheadline: 'Não queria deixar você ir assim. Tem algo que preciso te mostrar antes.',
      cta_text: '💛 Okay, o que é?',
      cta_color: '#ca8a04',
      show_slots: false,
      show_countdown: false,
    },
  },
];

export const UPSELL_TEMPLATES: { slug: string; label: string; description: string; defaults: Partial<PresellConfig> }[] = [
  {
    slug: 'upsell-vip',
    label: '💎 VIP Upgrade',
    description: 'Oferta exclusiva pós-call — eleva o lead para um pacote maior',
    defaults: {
      bg_color: '#0a0a14',
      text_color: '#ffffff',
      badge: '💎 Oferta exclusiva — só pra você',
      headline: 'Você acabou de ver o que eu posso oferecer',
      subheadline: 'Agora deixa eu te mostrar o que está no próximo nível. Só disponível para quem chegou até aqui.',
      cta_text: '💋 Quero o pacote completo',
      cta_color: '#be185d',
      show_slots: false,
      show_countdown: true,
      countdown_seconds: 600,
    },
  },
  {
    slug: 'upsell-premium',
    label: '🔥 Premium',
    description: 'Oferta de alto valor após engajamento na call',
    defaults: {
      bg_color: '#0f0505',
      text_color: '#ffffff',
      badge: '🔥 Oferta pós-ligação',
      headline: 'Você gostou? Imagina ter acesso completo…',
      subheadline: 'Tenho algo especial preparado para quem passou pela ligação. Essa oferta só existe agora.',
      cta_text: 'Quero acesso completo →',
      cta_color: '#dc2626',
      show_slots: false,
      show_countdown: true,
      countdown_seconds: 480,
      show_viewer_count: true,
      viewer_count_base: 15,
    },
  },
  {
    slug: 'upsell-bonus',
    label: '🎁 Bônus',
    description: 'Bônus surpresa revelado logo após a call — senso de exclusividade',
    defaults: {
      bg_color: '#030712',
      text_color: '#ffffff',
      badge: '🎁 Bônus surpresa — só pra quem ficou',
      headline: 'Você ficou até o final — e tenho algo para te dar',
      subheadline: 'Preparei um bônus especial para quem realmente está interessado. Não levo muito tempo para mostrar.',
      cta_text: 'Ver meu bônus →',
      cta_color: '#7c3aed',
      show_slots: false,
      show_countdown: true,
      countdown_seconds: 300,
    },
  },
];

export async function listUpsells(page = 1): Promise<{ data: PresellPage[]; total: number }> {
  return listPresells(page, 'upsell');
}

export async function listPresells(page = 1, type = 'presell'): Promise<{ data: PresellPage[]; total: number }> {
  const res = await api.get('/presell', { params: { page, per_page: 20, type } });
  return res.data;
}

export async function listDownsells(page = 1): Promise<{ data: PresellPage[]; total: number }> {
  return listPresells(page, 'downsell');
}

export async function getPresell(id: string): Promise<PresellPage> {
  const res = await api.get(`/presell/${id}`);
  return res.data.data;
}

export async function createPresell(payload: UpsertPresellPayload): Promise<PresellPage> {
  const res = await api.post('/presell', payload);
  return res.data.data;
}

export async function updatePresell(id: string, payload: UpsertPresellPayload): Promise<PresellPage> {
  const res = await api.put(`/presell/${id}`, payload);
  return res.data.data;
}

export async function deletePresell(id: string): Promise<void> {
  await api.delete(`/presell/${id}`);
}

export async function getPublicPresell(slug: string): Promise<PresellPage> {
  const res = await api.get(`/public/presell/${slug}`);
  return res.data.data;
}

export async function getPresellsByCallId(callId: string): Promise<PresellPage[]> {
  const res = await api.get(`/calls/${callId}/presells`);
  return res.data.data ?? [];
}

export async function trackCTAClick(slug: string): Promise<void> {
  await api.post(`/public/presell/${slug}/cta-click`).catch(() => {});
}

export async function uploadPresellImage(
  presellId: string,
  file: File,
): Promise<{ key: string; url: string }> {
  const form = new FormData();
  form.append('image', file);
  const res = await api.post(`/presell/${presellId}/image`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}
