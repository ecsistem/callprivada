import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listEvents, createEvent, updateEvent, deleteEvent,
  type CallEvent, type EventType, type UpsertEventPayload,
} from '../services/eventService';
import { getCall, listCalls } from '../services/callService';
import { EXTRA_TEXT_FIELDS } from '../lib/eventExtraTexts';
import { listUpsells } from '../services/presellService';
import {
  Plus, Edit3, Trash2, Phone, Mic, Video, PhoneOff,
  ChevronLeft, ExternalLink, Clock,
} from 'lucide-react';

// ── Metadata por tipo ──────────────────────────────────────────────────────

const TYPE_META: Record<EventType, { label: string; color: string; bg: string; border: string; emoji: string }> = {
  popup:             { label: 'Popup',              color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/25',   emoji: '💬' },
  fullscreen:        { label: 'Tela cheia',         color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/25', emoji: '🖥️' },
  fake_billing:      { label: 'Cobrança',           color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/25',    emoji: '💳' },
  offer_call:        { label: 'Oferta de chamada',  color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/25', emoji: '📞' },
  countdown:         { label: 'Contagem regressiva',color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/25', emoji: '⏳' },
  upsell:            { label: 'Upsell',             color: 'text-pink-400',   bg: 'bg-pink-500/10',   border: 'border-pink-500/25',   emoji: '🚀' },
  reconnect_paywall: { label: 'Internet caiu',      color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/25', emoji: '🔴' },
  signal_drop:       { label: 'Sinal fraco',        color: 'text-gray-400',   bg: 'bg-gray-500/10',   border: 'border-gray-500/25',   emoji: '📶' },
  fake_typing:       { label: 'Digitando…',         color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/25',  emoji: '⌨️' },
  screenshot_alert:  { label: 'Alerta de print',    color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/25',    emoji: '📸' },
  battery_low:       { label: 'Bateria fraca',      color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/25', emoji: '🔋' },
  incoming_call:     { label: 'Chamada entrando',   color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/25',  emoji: '📱' },
  fake_gift:         { label: 'Presente enviado',   color: 'text-pink-400',   bg: 'bg-pink-500/10',   border: 'border-pink-500/25',   emoji: '🎁' },
  viewer_count:      { label: 'Espectadores',       color: 'text-cyan-400',   bg: 'bg-cyan-500/10',   border: 'border-cyan-500/25',   emoji: '👥' },
  social_proof:      { label: 'Prova social',       color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/25', emoji: '🔔' },
  exclusive_access:  { label: 'Acesso exclusivo',   color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/25',  emoji: '🛡️' },
  tip_jar:           { label: 'Cofrinho / Gorjeta', color: 'text-pink-400',   bg: 'bg-pink-500/10',   border: 'border-pink-500/25',   emoji: '💝' },
  video_lock:        { label: 'Vídeo bloqueado',    color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/25', emoji: '🔒' },
  phone_block:       { label: 'Número bloqueado',   color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/25',    emoji: '🚫' },
  age_gate:          { label: 'Verificação +18',    color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/25', emoji: '🔞' },
};

// ── Helpers ────────────────────────────────────────────────────────────────

function toSeconds(mmss: string): number {
  const parts = mmss.split(':');
  if (parts.length === 2) {
    const m = parseInt(parts[0], 10) || 0;
    const s = parseInt(parts[1], 10) || 0;
    return m * 60 + s;
  }
  return parseInt(mmss, 10) || 0;
}

function toMMSS(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// ── Phone preview por tipo ─────────────────────────────────────────────────

function PhonePreview({ event, displayName, callSlug }: {
  event: UpsertEventPayload | CallEvent | null;
  displayName: string;
  callSlug?: string;
}) {
  const type = event?.type ?? null;
  const title = event ? ('title' in event ? event.title : '') : '';
  const desc = event ? ('description' in event ? event.description : '') : '';
  const btnText = event?.button_text ?? 'OK';
  const btnColor = event?.button_color ?? '#25d366';

  return (
    <div className="hidden lg:flex flex-col items-center gap-3 shrink-0 sticky top-8">
      <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-widest">Preview</p>

      {/* Phone shell */}
      <div className="relative w-[210px] h-[420px] rounded-[32px] border-[5px] border-[#2a2a2a] bg-[#0a0a0a] shadow-2xl overflow-hidden flex flex-col">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-4 bg-[#2a2a2a] rounded-b-xl z-20" />
        {/* Status */}
        <div className="flex items-center justify-between px-4 pt-5 pb-1 text-[8px] text-gray-500 z-10">
          <span>9:41</span>
          <span className="flex gap-0.5 items-center">
            <span>●●●●</span>
            <span className="ml-1">🔋</span>
          </span>
        </div>
        {/* WA header */}
        <div className="flex items-center gap-2 px-2.5 py-1.5 bg-[#075e54]">
          <div className="w-6 h-6 rounded-full bg-[#25d366]/30 flex items-center justify-center text-[9px] text-white font-bold shrink-0">
            {displayName[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-semibold text-white truncate">{displayName || 'Contato'}</p>
            <p className="text-[7px] text-green-300">chamada de vídeo</p>
          </div>
        </div>

        {/* Video area */}
        <div className="flex-1 bg-gradient-to-b from-[#0b1e17] to-[#0a0a0a] relative overflow-hidden flex items-center justify-center">
          {/* Base: avatar do contato */}
          <div className="w-14 h-14 rounded-full bg-[#1a2e25] border border-white/10 flex items-center justify-center text-xl text-white/20">
            {displayName[0]?.toUpperCase() ?? '?'}
          </div>

          {/* Overlay por tipo */}
          {type && title && (
            <div className="absolute inset-0 flex items-end pb-2 px-1.5">
              {/* Popup / Fullscreen / Upsell / Offer */}
              {(type === 'popup' || type === 'fullscreen' || type === 'upsell' || type === 'offer_call') && (
                <div className="w-full rounded-xl bg-black/85 border border-white/10 p-2 space-y-1">
                  <p className="text-[9px] font-bold text-white leading-tight">{title}</p>
                  {desc && <p className="text-[7px] text-gray-400 leading-tight line-clamp-2">{desc}</p>}
                  <div className="w-full text-center text-[8px] font-semibold py-1 rounded-lg text-white mt-0.5" style={{ backgroundColor: btnColor }}>
                    {btnText}
                  </div>
                </div>
              )}
              {/* Fake billing */}
              {type === 'fake_billing' && (
                <div className="w-full rounded-xl bg-[#1a0000]/90 border border-red-500/30 p-2 space-y-1">
                  <div className="flex items-center gap-1">
                    <span className="text-[9px]">💳</span>
                    <p className="text-[9px] font-bold text-red-300 leading-tight">{title || 'Pagamento necessário'}</p>
                  </div>
                  {(event as UpsertEventPayload)?.billing_amount_cents ? (
                    <p className="text-[10px] font-black text-white">
                      {((event as UpsertEventPayload).billing_amount_cents! / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  ) : null}
                  <div className="w-full text-center text-[8px] font-semibold py-1 rounded-lg text-white" style={{ backgroundColor: '#dc2626' }}>
                    Pagar via PIX
                  </div>
                </div>
              )}
              {/* Countdown */}
              {type === 'countdown' && (
                <div className="w-full rounded-xl bg-black/85 border border-orange-500/30 p-2 space-y-1">
                  <p className="text-[9px] font-bold text-orange-300">{title || 'Oferta expirando!'}</p>
                  <div className="flex gap-1 justify-center py-0.5">
                    {['10','00'].map((n, i) => (
                      <div key={i} className="flex flex-col items-center">
                        <div className="bg-orange-600 text-white text-[11px] font-black w-7 h-7 flex items-center justify-center rounded">{n}</div>
                        <span className="text-[6px] text-gray-500 mt-0.5">{i === 0 ? 'min' : 'seg'}</span>
                      </div>
                    ))}
                  </div>
                  <div className="w-full text-center text-[8px] font-semibold py-1 rounded-lg text-white mt-0.5" style={{ backgroundColor: btnColor }}>
                    {btnText}
                  </div>
                </div>
              )}
              {/* Reconnect paywall */}
              {type === 'reconnect_paywall' && (
                <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center gap-1 px-3">
                  <span className="text-2xl">📵</span>
                  <p className="text-[9px] font-bold text-white text-center">{title || 'Sem conexão'}</p>
                  {desc && <p className="text-[7px] text-gray-400 text-center">{desc}</p>}
                  <div className="w-full text-center text-[8px] font-semibold py-1.5 rounded-xl text-white mt-1" style={{ backgroundColor: btnColor }}>
                    {btnText}
                  </div>
                </div>
              )}
              {/* Signal drop */}
              {type === 'signal_drop' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-black/70 rounded-xl px-3 py-2 text-center">
                    <p className="text-[9px] text-yellow-400 font-bold">📶 {title || 'Sinal fraco'}</p>
                  </div>
                </div>
              )}
              {/* Fake typing */}
              {type === 'fake_typing' && (
                <div className="absolute top-2 left-2 right-2">
                  <div className="bg-[#1f2c34] border border-white/10 rounded-xl px-2 py-1.5 flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded-full bg-[#25d366] flex items-center justify-center shrink-0 text-[6px] text-white">W</div>
                    <div>
                      <p className="text-[7px] text-[#25d366] font-semibold">WhatsApp</p>
                      <p className="text-[8px] text-white">{title || 'digitando…'}</p>
                    </div>
                  </div>
                </div>
              )}
              {/* Battery low */}
              {type === 'battery_low' && (
                <div className="absolute top-2 left-2 right-2">
                  <div className="bg-[#1f2c34] border border-orange-500/40 rounded-xl px-2 py-1.5 flex items-center gap-1.5">
                    <span className="text-[10px]">🔋</span>
                    <p className="text-[8px] text-orange-400 font-bold">Bateria fraca — {title || '3'}%</p>
                  </div>
                </div>
              )}
              {/* Screenshot alert */}
              {type === 'screenshot_alert' && (
                <div className="absolute inset-0 bg-red-900/90 flex flex-col items-center justify-center gap-1">
                  <span className="text-[14px]">📸</span>
                  <p className="text-[8px] font-black text-white text-center px-1">{title || '⚠️ Atenção!'}</p>
                  {desc && <p className="text-[7px] text-red-200 text-center px-1 line-clamp-2">{desc}</p>}
                </div>
              )}
              {/* Incoming call */}
              {type === 'incoming_call' && (
                <div className="absolute inset-0 bg-[#111b21]/95 flex flex-col items-center justify-center gap-1">
                  <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-[10px] text-white">👤</div>
                  <p className="text-[8px] font-bold text-white">{title || 'Contato desconhecido'}</p>
                  <p className="text-[7px] text-[#25d366]">Ligação de WhatsApp</p>
                </div>
              )}
              {/* Social proof */}
              {type === 'social_proof' && (
                <div className="absolute top-16 left-1 right-1">
                  <div className="bg-purple-700/95 rounded-xl px-2 py-1.5 flex items-center gap-1.5">
                    <span className="text-[10px]">🔔</span>
                    <p className="text-[8px] text-white font-semibold line-clamp-1">{title || 'João pagou R$ 49'}</p>
                  </div>
                </div>
              )}
              {/* Viewer count */}
              {type === 'viewer_count' && (
                <div className="absolute top-16 left-0 right-0 flex justify-center">
                  <div className="bg-cyan-600/90 rounded-full px-2 py-1 flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    <span className="text-[8px] text-white font-bold">{title || '847'} ao vivo</span>
                  </div>
                </div>
              )}
              {/* Fake gift */}
              {type === 'fake_gift' && (
                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-1">
                  <span className="text-[24px]">🎁</span>
                  <p className="text-[8px] font-bold text-white text-center px-2">{title || 'Presente enviado!'}</p>
                </div>
              )}
              {/* Video lock / phone block / age gate / tip_jar */}
              {(type === 'video_lock' || type === 'phone_block' || type === 'age_gate' || type === 'tip_jar') && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-2"
                  style={{ backdropFilter: 'blur(8px)', backgroundColor: 'rgba(0,0,0,0.75)' }}>
                  <span className="text-[18px]">
                    {type === 'video_lock' ? '🔒' : type === 'phone_block' ? '🚫' : type === 'age_gate' ? '🔞' : '💝'}
                  </span>
                  <p className="text-[8px] font-bold text-white text-center">{title || TYPE_META[type]?.label}</p>
                  {desc && <p className="text-[7px] text-gray-300 text-center line-clamp-2">{desc}</p>}
                  <div className="w-full mt-1 text-center text-[7px] font-semibold py-0.5 rounded-lg text-white"
                    style={{ backgroundColor: btnColor }}>
                    {btnText}
                  </div>
                </div>
              )}
              {/* Exclusive access */}
              {type === 'exclusive_access' && (
                <div className="absolute inset-0 bg-amber-900/90 flex flex-col items-center justify-center gap-1 px-2">
                  <span className="text-[14px]">🛡️</span>
                  <p className="text-[8px] font-bold text-white text-center">{title || 'Acesso encerrando'}</p>
                  <div className="bg-amber-500 rounded-lg px-3 py-1 mt-0.5">
                    <p className="text-white text-[10px] font-black">00:00</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {(!type || !title) && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-[9px] text-gray-700 text-center px-4">Selecione ou crie um evento para visualizar</p>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-around px-3 py-2.5 bg-[#111]">
          <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center"><Mic size={10} className="text-gray-300" /></div>
          <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center"><Video size={10} className="text-gray-300" /></div>
          <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center"><PhoneOff size={11} className="text-white" /></div>
          <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center"><Phone size={10} className="text-gray-300" /></div>
        </div>
      </div>

      {callSlug && (
        <a href={`/c/${callSlug}`} target="_blank" rel="noreferrer"
          className="flex items-center gap-1 text-[10px] text-green-400 hover:text-green-300 transition-colors">
          <ExternalLink size={10} />Abrir chamada ao vivo
        </a>
      )}
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────

const EMPTY: UpsertEventPayload = {
  trigger_at_seconds: 0,
  duration_seconds: 0,
  type: 'popup',
  title: '',
  description: '',
  button_text: 'OK',
  button_color: '#25d366',
  offer_call_slug: '',
  upsell_slug: '',
  billing_amount_cents: 0,
  billing_collect_payer_info: false,
  billing_payer_name: '',
  billing_payer_document: '',
  billing_payer_email: '',
  billing_payer_phone: '',
  extra_texts: {},
};

export default function TimelineEditorPage() {
  const { id: callId } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const { data: call } = useQuery({
    queryKey: ['call', callId],
    queryFn: () => getCall(callId!),
    enabled: !!callId,
  });

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events', callId],
    queryFn: () => listEvents(callId!),
    enabled: !!callId,
  });

  const { data: callsData } = useQuery({
    queryKey: ['calls', 1],
    queryFn: () => listCalls(1),
  });
  const allCalls = callsData?.data ?? [];

  const { data: upsellsData } = useQuery({
    queryKey: ['upsells', 1],
    queryFn: () => listUpsells(1),
  });
  const upsells = upsellsData?.data ?? [];

  const [form, setForm] = useState<UpsertEventPayload>(EMPTY);
  const [triggerInput, setTriggerInput] = useState('00:00');
  const [editing, setEditing] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const displayName = call?.display_name ?? 'Contato';

  function openCreate() {
    setForm(EMPTY);
    setTriggerInput('00:00');
    setEditing(null);
    setFormError('');
    setShowForm(true);
    setSelectedId(null);
  }

  function openEdit(e: CallEvent) {
    setForm({
      trigger_at_seconds: e.trigger_at_seconds,
      duration_seconds: e.duration_seconds ?? 0,
      type: e.type,
      title: e.title,
      description: e.description,
      button_text: e.button_text ?? 'OK',
      button_color: e.button_color ?? '#25d366',
      offer_call_slug: e.offer_call_slug ?? '',
      upsell_slug: e.upsell_slug ?? '',
      billing_amount_cents: e.billing_amount_cents ?? 0,
      billing_collect_payer_info: e.billing_collect_payer_info ?? false,
      billing_payer_name: e.billing_payer_name ?? '',
      billing_payer_document: e.billing_payer_document ?? '',
      billing_payer_email: e.billing_payer_email ?? '',
      billing_payer_phone: e.billing_payer_phone ?? '',
      extra_texts: e.extra_texts ?? {},
    });
    setTriggerInput(toMMSS(e.trigger_at_seconds));
    setEditing(e.id);
    setFormError('');
    setShowForm(true);
    setSelectedId(e.id);
  }

  const createMutation = useMutation({
    mutationFn: (p: UpsertEventPayload) => createEvent(callId!, p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['events', callId] }); setShowForm(false); },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      setFormError(msg ?? 'Erro ao criar evento.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, p }: { id: string; p: UpsertEventPayload }) => updateEvent(id, p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['events', callId] }); setShowForm(false); },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      setFormError(msg ?? 'Erro ao atualizar evento.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteEvent,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['events', callId] }); setConfirmDelete(null); },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    if (!form.title.trim()) { setFormError('Título obrigatório.'); return; }
    const payload = { ...form, trigger_at_seconds: toSeconds(triggerInput) };
    if (editing) updateMutation.mutate({ id: editing, p: payload });
    else createMutation.mutate(payload);
  }

  const sorted = [...events].sort((a, b) => a.trigger_at_seconds - b.trigger_at_seconds);
  const isPending = createMutation.isPending || updateMutation.isPending;

  // Evento para o preview: form aberto → form, senão selecionado, senão primeiro
  const previewEvent: UpsertEventPayload | CallEvent | null =
    showForm ? form : selectedId ? (events.find(e => e.id === selectedId) ?? null) : sorted[0] ?? null;

  // Para a barra de timeline: pegar duração do vídeo se disponível (call não tem isso, usa 300s como base)
  const timelineMax = Math.max(300, ...events.map(e => e.trigger_at_seconds + (e.duration_seconds || 10)));

  const inputCls = 'w-full bg-[#0f0f0f] border border-white/8 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FE015C]/50 transition-colors placeholder:text-gray-600';

  return (
    <div className="min-h-screen bg-[#120208] text-white">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to={`/calls/${callId}/edit`}
              className="flex items-center gap-1.5 text-gray-500 hover:text-white text-sm transition-colors">
              <ChevronLeft size={16} />Voltar
            </Link>
            <div className="w-px h-5 bg-white/10" />
            <div>
              <h1 className="text-lg font-bold text-white">Timeline de Eventos</h1>
              {call && <p className="text-xs text-gray-500 mt-0.5">{call.title}</p>}
            </div>
          </div>
          <button onClick={openCreate}
            className="flex items-center gap-2 bg-[#FE015C] hover:bg-[#FD267D] text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all shadow-lg shadow-[#FE015C]/20">
            <Plus size={15} />Novo evento
          </button>
        </div>

        {/* Barra de timeline visual */}
        {sorted.length > 0 && (
          <div className="bg-[#111] border border-white/5 rounded-2xl p-4">
            <div className="flex items-center justify-between text-[10px] text-gray-600 mb-2 font-mono">
              <span>00:00</span>
              <span>{toMMSS(timelineMax)}</span>
            </div>
            <div className="relative h-6 bg-[#1a1a1a] rounded-full overflow-hidden">
              {sorted.map(ev => {
                const meta = TYPE_META[ev.type];
                const left = (ev.trigger_at_seconds / timelineMax) * 100;
                const width = Math.max(1.5, ((ev.duration_seconds || 8) / timelineMax) * 100);
                return (
                  <button
                    key={ev.id}
                    title={`${meta.label}: ${ev.title} @ ${toMMSS(ev.trigger_at_seconds)}`}
                    onClick={() => { setSelectedId(ev.id); setShowForm(false); }}
                    className={`absolute top-1 h-4 rounded-full border transition-all hover:opacity-100 ${meta.bg} ${meta.border} ${selectedId === ev.id ? 'opacity-100 ring-1 ring-white/30' : 'opacity-70'}`}
                    style={{ left: `${left}%`, width: `${Math.max(width, 2)}%` }}
                  />
                );
              })}
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {sorted.map(ev => {
                const meta = TYPE_META[ev.type];
                return (
                  <button key={ev.id}
                    onClick={() => { setSelectedId(ev.id); setShowForm(false); }}
                    className={`flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-lg border transition-all ${meta.bg} ${meta.border} ${meta.color} ${selectedId === ev.id ? 'ring-1 ring-white/20' : 'opacity-60 hover:opacity-100'}`}>
                    <Clock size={9} />{toMMSS(ev.trigger_at_seconds)} — {ev.title.slice(0, 20)}{ev.title.length > 20 ? '…' : ''}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Layout: lista + form (esq) · preview (dir) */}
        <div className="flex gap-6 items-start">
          <div className="flex-1 min-w-0 space-y-4">

            {/* Formulário */}
            {showForm && (
              <div className="bg-[#111] border border-white/8 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-white">
                    {editing ? 'Editar evento' : 'Novo evento'}
                  </h2>
                  <button onClick={() => setShowForm(false)} className="text-gray-600 hover:text-gray-400 text-xs transition-colors">
                    Cancelar
                  </button>
                </div>
                {formError && (
                  <p className="text-red-400 text-xs bg-red-950/40 border border-red-800/50 rounded-xl px-3 py-2">
                    {formError}
                  </p>
                )}
                <form onSubmit={handleSubmit} className="space-y-3">

                  {/* Tipo + Tempo */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1.5">Tipo</label>
                      <select value={form.type}
                        onChange={e => setForm(f => ({ ...f, type: e.target.value as EventType }))}
                        className={inputCls}>
                        <optgroup label="📢 Mensagens">
                          <option value="popup">💬 Popup</option>
                          <option value="fullscreen">🖥️ Tela cheia</option>
                          <option value="fake_typing">⌨️ WhatsApp digitando</option>
                          <option value="social_proof">🔔 Prova social</option>
                          <option value="viewer_count">👥 Espectadores ao vivo</option>
                          <option value="fake_gift">🎁 Presente enviado</option>
                          <option value="incoming_call">📱 Chamada entrando</option>
                        </optgroup>
                        <optgroup label="⚡ Urgência / Escassez">
                          <option value="countdown">⏳ Contagem regressiva</option>
                          <option value="exclusive_access">🛡️ Acesso exclusivo encerrando</option>
                          <option value="signal_drop">📶 Sinal fraco</option>
                          <option value="battery_low">🔋 Bateria fraca</option>
                          <option value="screenshot_alert">📸 Alerta de print</option>
                        </optgroup>
                        <optgroup label="💰 Monetização">
                          <option value="fake_billing">💳 Cobrança PIX</option>
                          <option value="tip_jar">💝 Cofrinho / Gorjeta</option>
                          <option value="video_lock">🔒 Vídeo bloqueado</option>
                          <option value="phone_block">🚫 Número bloqueado</option>
                          <option value="age_gate">🔞 Verificação +18</option>
                          <option value="reconnect_paywall">🔴 Internet caiu (paywall)</option>
                        </optgroup>
                        <optgroup label="🔗 Redirecionamento">
                          <option value="offer_call">📞 Oferta de chamada</option>
                          <option value="upsell">🚀 Upsell</option>
                        </optgroup>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1.5">Disparar em (MM:SS)</label>
                      <input
                        value={triggerInput}
                        onChange={e => setTriggerInput(e.target.value)}
                        onBlur={e => {
                          const s = toSeconds(e.target.value);
                          setTriggerInput(toMMSS(s));
                          setForm(f => ({ ...f, trigger_at_seconds: s }));
                        }}
                        placeholder="01:30"
                        className={inputCls + ' font-mono'}
                      />
                    </div>
                  </div>

                  {/* Título + Duração */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-500 mb-1.5">Título</label>
                      <input required value={form.title}
                        onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                        placeholder="ex: Oferta especial"
                        className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1.5">Duração (seg)</label>
                      <input type="number" min={0}
                        value={form.duration_seconds ?? 0}
                        onChange={e => setForm(f => ({ ...f, duration_seconds: Number(e.target.value) }))}
                        placeholder="0 = sem limite"
                        className={inputCls} />
                    </div>
                  </div>

                  {/* ── fake_typing ── */}
                  {form.type === 'fake_typing' && (
                    <div className="bg-[#FE015C]/5 border border-[#FE015C]/15 rounded-xl px-3 py-2.5 text-xs space-y-1">
                      <p className="font-semibold text-[#FE015C]">⌨️ Como funciona</p>
                      <p className="text-gray-500 leading-relaxed">
                        Bolha de notificação no topo com o texto do <strong className="text-gray-400">Título</strong>.
                        Use <strong className="text-gray-400">Duração</strong> para controlar quanto tempo fica visível.
                      </p>
                    </div>
                  )}

                  {/* ── screenshot_alert ── */}
                  {form.type === 'screenshot_alert' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1.5">Título do alerta</label>
                        <input value={form.title}
                          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                          placeholder="ex: ⚠️ Atenção!"
                          className={inputCls} />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1.5">Mensagem principal</label>
                        <textarea rows={2} value={form.description}
                          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                          placeholder="ex: Ela viu que você tentou tirar print!"
                          className={inputCls + ' resize-none'} />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1.5">Linha secundária (opcional)</label>
                        <input value={form.button_text ?? ''}
                          onChange={e => setForm(f => ({ ...f, button_text: e.target.value }))}
                          placeholder="ex: Isso pode encerrar a chamada imediatamente."
                          className={inputCls} />
                      </div>
                      <div className="bg-red-500/5 border border-red-500/15 rounded-xl px-3 py-2.5 text-xs text-red-400 space-y-1">
                        <p className="font-semibold">📸 Como funciona</p>
                        <p className="text-gray-500">Aparece um alerta de fundo vermelho simulando detecção de screenshot. Some sozinho após a Duração configurada.</p>
                      </div>
                    </div>
                  )}

                  {/* ── battery_low ── */}
                  {form.type === 'battery_low' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1.5">Porcentagem da bateria (número)</label>
                        <input value={form.title}
                          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                          placeholder="ex: 3"
                          className={inputCls} />
                        <p className="text-[10px] text-gray-600 mt-1">Coloque um número de 1 a 20. Aparece como "Bateria fraca — X%"</p>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1.5">Mensagem de aviso</label>
                        <input value={form.description}
                          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                          placeholder="ex: A chamada pode cair a qualquer momento"
                          className={inputCls} />
                      </div>
                    </div>
                  )}

                  {/* ── incoming_call ── */}
                  {form.type === 'incoming_call' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1.5">Nome do chamador</label>
                        <input value={form.title}
                          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                          placeholder="ex: Mamãe 💛"
                          className={inputCls} />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1.5">Texto secundário (opcional)</label>
                        <input value={form.description}
                          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                          placeholder="ex: Ligação de emergência"
                          className={inputCls} />
                      </div>
                      <div className="bg-green-500/5 border border-green-500/15 rounded-xl px-3 py-2.5 text-xs text-gray-500">
                        Simula uma chamada de WhatsApp entrando. O visitante pode "atender" ou "recusar" — ambos fecham o overlay.
                      </div>
                    </div>
                  )}

                  {/* ── fake_gift ── */}
                  {form.type === 'fake_gift' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1.5">Mensagem do presente</label>
                        <input value={form.title}
                          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                          placeholder="ex: Você ganhou um presente! 🎁"
                          className={inputCls} />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1.5">Subtexto (opcional)</label>
                        <input value={form.description}
                          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                          placeholder="ex: Clique para resgatar"
                          className={inputCls} />
                      </div>
                    </div>
                  )}

                  {/* ── viewer_count ── */}
                  {form.type === 'viewer_count' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1.5">Número base de espectadores</label>
                        <input value={form.title}
                          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                          placeholder="ex: 847"
                          className={inputCls} />
                        <p className="text-[10px] text-gray-600 mt-1">Exibe um contador crescente partindo deste número. Desaparece após a Duração.</p>
                      </div>
                    </div>
                  )}

                  {/* ── social_proof ── */}
                  {form.type === 'social_proof' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1.5">Mensagem de prova social</label>
                        <input value={form.title}
                          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                          placeholder="ex: João acabou de pagar R$ 49"
                          className={inputCls} />
                      </div>
                    </div>
                  )}

                  {/* ── exclusive_access ── */}
                  {form.type === 'exclusive_access' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1.5">Título do acesso exclusivo</label>
                        <input value={form.title}
                          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                          placeholder="ex: Acesso exclusivo encerrando"
                          className={inputCls} />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1.5">Descrição</label>
                        <textarea rows={2} value={form.description}
                          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                          placeholder="ex: Sua vaga está reservada por tempo limitado"
                          className={inputCls + ' resize-none'} />
                      </div>
                      <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl px-3 py-2.5 text-xs text-gray-500">
                        Mostra tela cheia com um countdown regressivo. Use a <strong className="text-gray-400">Duração</strong> como tempo do countdown (segundos).
                      </div>
                    </div>
                  )}

                  {/* ── signal_drop: título + descrição opcional + info ── */}
                  {form.type === 'signal_drop' && (
                    <>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1.5">Mensagem exibida (opcional)</label>
                        <textarea rows={2} value={form.description}
                          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                          placeholder="ex: Reconectando… aguarde"
                          className={inputCls + ' resize-none'} />
                      </div>
                      <div className="bg-gray-500/5 border border-gray-500/15 rounded-xl px-3 py-2.5 text-xs text-gray-500 space-y-1">
                        <p className="font-semibold text-gray-400">📶 Como funciona</p>
                        <p className="leading-relaxed">
                          Simula queda de sinal — a tela escurece e treme por alguns instantes.
                          Use a <strong className="text-gray-400">Duração</strong> para controlar quanto tempo dura o efeito.
                          O vídeo continua normalmente depois.
                        </p>
                      </div>
                    </>
                  )}

                  {/* ── reconnect_paywall: descrição + botão + billing ── */}
                  {form.type === 'reconnect_paywall' && (
                    <>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1.5">Descrição</label>
                        <textarea rows={2} value={form.description}
                          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                          placeholder="ex: Pague para restaurar a conexão e continuar assistindo"
                          className={inputCls + ' resize-none'} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1.5">Texto do botão</label>
                          <input value={form.button_text ?? ''}
                            onChange={e => setForm(f => ({ ...f, button_text: e.target.value }))}
                            placeholder="Reconectar agora"
                            className={inputCls} />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1.5">Cor do botão</label>
                          <div className="flex items-center gap-2">
                            <input type="color" value={form.button_color ?? '#25d366'}
                              onChange={e => setForm(f => ({ ...f, button_color: e.target.value }))}
                              className="w-9 h-9 rounded-lg cursor-pointer bg-transparent border-0 p-0" />
                            <input value={form.button_color ?? '#25d366'}
                              onChange={e => setForm(f => ({ ...f, button_color: e.target.value }))}
                              maxLength={7} className={inputCls + ' flex-1 font-mono'} />
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Descrição + Botão — tipos genéricos */}
                  {!['signal_drop', 'fake_typing', 'reconnect_paywall',
                      'screenshot_alert', 'battery_low', 'incoming_call', 'fake_gift',
                      'viewer_count', 'social_proof', 'exclusive_access',
                      'tip_jar', 'video_lock', 'phone_block', 'age_gate'].includes(form.type) && (
                    <>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1.5">Descrição</label>
                        <textarea rows={2} value={form.description}
                          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                          placeholder="Texto exibido no evento"
                          className={inputCls + ' resize-none'} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1.5">Texto do botão</label>
                          <input value={form.button_text ?? ''}
                            onChange={e => setForm(f => ({ ...f, button_text: e.target.value }))}
                            placeholder="OK"
                            className={inputCls} />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1.5">Cor do botão</label>
                          <div className="flex items-center gap-2">
                            <input type="color" value={form.button_color ?? '#25d366'}
                              onChange={e => setForm(f => ({ ...f, button_color: e.target.value }))}
                              className="w-9 h-9 rounded-lg cursor-pointer bg-transparent border-0 p-0" />
                            <input value={form.button_color ?? '#25d366'}
                              onChange={e => setForm(f => ({ ...f, button_color: e.target.value }))}
                              maxLength={7}
                              className={inputCls + ' flex-1 font-mono'} />
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Campos específicos: fake_billing */}
                  {form.type === 'fake_billing' && (
                    <div className="space-y-3 border-t border-white/5 pt-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1.5">Valor da cobrança (R$)</label>
                        <input type="number" min={0} step={0.01}
                          value={(form.billing_amount_cents ?? 0) / 100}
                          onChange={e => setForm(f => ({ ...f, billing_amount_cents: Math.round(Number(e.target.value) * 100) }))}
                          placeholder="0,00"
                          className={inputCls} />
                        <p className="text-[10px] text-gray-600 mt-1">Cobrança via PIX ZuckPay ao clicar em pagar.</p>
                      </div>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <div onClick={() => setForm(f => ({ ...f, billing_collect_payer_info: !f.billing_collect_payer_info }))}
                          className={`relative w-9 h-5 rounded-full transition-colors ${form.billing_collect_payer_info ? 'bg-[#FE015C]' : 'bg-gray-700'}`}>
                          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.billing_collect_payer_info ? 'translate-x-4' : 'translate-x-0.5'}`} />
                        </div>
                        <span className="text-xs text-gray-400">Coletar nome, CPF e e-mail</span>
                      </label>
                      {form.billing_collect_payer_info && (
                        <div className="space-y-2">
                          <input value={form.billing_payer_name ?? ''} onChange={e => setForm(f => ({ ...f, billing_payer_name: e.target.value }))} placeholder="Nome do pagador" className={inputCls} />
                          <div className="grid grid-cols-2 gap-2">
                            <input value={form.billing_payer_document ?? ''} onChange={e => setForm(f => ({ ...f, billing_payer_document: e.target.value }))} placeholder="CPF" maxLength={11} className={inputCls + ' font-mono'} />
                            <input value={form.billing_payer_phone ?? ''} onChange={e => setForm(f => ({ ...f, billing_payer_phone: e.target.value }))} placeholder="Telefone" className={inputCls + ' font-mono'} />
                          </div>
                          <input type="email" value={form.billing_payer_email ?? ''} onChange={e => setForm(f => ({ ...f, billing_payer_email: e.target.value }))} placeholder="E-mail" className={inputCls} />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Campos específicos: upsell */}
                  {form.type === 'upsell' && (
                    <div className="border-t border-white/5 pt-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs text-gray-500">Página de upsell</label>
                        <Link to="/upsell/new" target="_blank" className="text-[10px] text-[#FE015C] hover:text-[#FD267D] font-medium transition-colors">+ Criar upsell →</Link>
                      </div>
                      {upsells.length === 0 ? (
                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-3 py-2.5 text-xs text-yellow-400">
                          Nenhum upsell criado.{' '}
                          <Link to="/upsell/new" target="_blank" className="underline font-medium">Crie um agora</Link>{' '}
                          e volte para selecionar.
                        </div>
                      ) : (
                        <select value={form.upsell_slug ?? ''} onChange={e => setForm(f => ({ ...f, upsell_slug: e.target.value }))} className={inputCls}>
                          <option value="">— Nenhuma (fecha o modal) —</option>
                          {upsells.map(u => (
                            <option key={u.id} value={u.slug}>{u.config?.headline ?? u.slug} (/u/{u.slug})</option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}

                  {/* ── tip_jar / video_lock / phone_block / age_gate: billing + textos ── */}
                  {(['tip_jar', 'video_lock', 'phone_block', 'age_gate'] as const).includes(form.type as never) && (
                    <div className="space-y-3 border-t border-white/5 pt-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1.5">Título</label>
                        <input value={form.title}
                          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                          placeholder={
                            form.type === 'tip_jar' ? 'ex: Manda um presente pra ela!' :
                            form.type === 'video_lock' ? 'ex: Vídeo bloqueado' :
                            form.type === 'phone_block' ? 'ex: Número bloqueado' :
                            'ex: Conteúdo +18'
                          }
                          className={inputCls} />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1.5">Descrição</label>
                        <textarea rows={2} value={form.description}
                          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                          placeholder={
                            form.type === 'tip_jar' ? 'ex: Escolha um valor e surpreenda ela' :
                            form.type === 'video_lock' ? 'ex: Continue para desbloquear o momento' :
                            form.type === 'phone_block' ? 'ex: Seu número foi bloqueado temporariamente. Pague para liberar.' :
                            'ex: Para confirmar que você é maior de idade, é necessário uma verificação rápida.'
                          }
                          className={inputCls + ' resize-none'} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1.5">Texto do botão</label>
                          <input value={form.button_text ?? ''}
                            onChange={e => setForm(f => ({ ...f, button_text: e.target.value }))}
                            placeholder={
                              form.type === 'tip_jar' ? 'Enviar presente' :
                              form.type === 'video_lock' ? 'Desbloquear' :
                              form.type === 'phone_block' ? 'Liberar número' :
                              'Confirmar maioridade'
                            }
                            className={inputCls} />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1.5">Cor do botão</label>
                          <div className="flex items-center gap-2">
                            <input type="color" value={form.button_color ?? '#25d366'}
                              onChange={e => setForm(f => ({ ...f, button_color: e.target.value }))}
                              className="w-9 h-9 rounded-lg cursor-pointer bg-transparent border-0 p-0" />
                            <input value={form.button_color ?? '#25d366'}
                              onChange={e => setForm(f => ({ ...f, button_color: e.target.value }))}
                              maxLength={7} className={inputCls + ' flex-1 font-mono'} />
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1.5">
                          {form.type === 'tip_jar' ? 'Valor base do presente (R$)' : 'Valor da cobrança (R$)'}
                        </label>
                        <input type="number" min={0} step={0.01}
                          value={(form.billing_amount_cents ?? 0) / 100}
                          onChange={e => setForm(f => ({ ...f, billing_amount_cents: Math.round(Number(e.target.value) * 100) }))}
                          placeholder="0,00"
                          className={inputCls} />
                        {form.type === 'tip_jar' && (
                          <p className="text-[10px] text-gray-600 mt-1">O cofrinho mostra opções de 1×, 2×, 5× e 10× este valor.</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Campos específicos: offer_call */}
                  {form.type === 'offer_call' && (
                    <div className="border-t border-white/5 pt-3">
                      <label className="block text-xs text-gray-500 mb-1.5">Chamada de destino</label>
                      <select value={form.offer_call_slug ?? ''} onChange={e => setForm(f => ({ ...f, offer_call_slug: e.target.value }))} className={inputCls}>
                        <option value="">— Nenhuma —</option>
                        {allCalls.filter(c => c.id !== callId).map(c => (
                          <option key={c.id} value={c.slug}>{c.title} (/c/{c.slug})</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* ── Textos avançados — todos os textos do overlay são editáveis ── */}
                  {(EXTRA_TEXT_FIELDS[form.type]?.length ?? 0) > 0 && (
                    <details className="border-t border-white/5 pt-3 group">
                      <summary className="cursor-pointer text-xs font-semibold text-gray-400 hover:text-white transition-colors select-none list-none flex items-center gap-1.5">
                        <span className="inline-block transition-transform group-open:rotate-90">▸</span>
                        ✏️ Textos avançados <span className="text-gray-600 font-normal">(personalize qualquer texto do overlay)</span>
                      </summary>
                      <div className="space-y-2.5 mt-3">
                        {EXTRA_TEXT_FIELDS[form.type]!.map(field => (
                          <div key={field.key}>
                            <label className="block text-[11px] text-gray-500 mb-1">{field.label}</label>
                            <input
                              value={form.extra_texts?.[field.key] ?? ''}
                              onChange={e => setForm(f => ({
                                ...f,
                                extra_texts: { ...(f.extra_texts ?? {}), [field.key]: e.target.value },
                              }))}
                              placeholder={field.def || '(padrão do sistema)'}
                              className={inputCls}
                            />
                          </div>
                        ))}
                        <p className="text-[10px] text-gray-600">Deixe em branco para usar o texto padrão.</p>
                      </div>
                    </details>
                  )}

                  <button type="submit" disabled={isPending}
                    className="w-full bg-[#FE015C] hover:bg-[#FD267D] disabled:opacity-50 text-white font-semibold rounded-xl py-2.5 text-sm transition-all">
                    {isPending ? 'Salvando…' : editing ? 'Atualizar evento' : 'Criar evento'}
                  </button>
                </form>
              </div>
            )}

            {/* Lista de eventos */}
            {isLoading ? (
              <div className="space-y-3">
                {[0,1,2].map(i => <div key={i} className="bg-[#111] border border-white/5 rounded-2xl h-20 animate-pulse" />)}
              </div>
            ) : sorted.length === 0 ? (
              <div className="text-center py-16 text-gray-600">
                <p className="text-3xl mb-3">⏱</p>
                <p className="text-sm">Nenhum evento criado ainda.</p>
                <p className="text-xs mt-1 text-gray-700">Clique em "Novo evento" para adicionar o primeiro.</p>
              </div>
            ) : (
              <div className="relative">
                {/* Linha vertical */}
                <div className="absolute left-[56px] top-0 bottom-0 w-px bg-white/5" />
                <ul className="space-y-3">
                  {sorted.map(ev => {
                    const meta = TYPE_META[ev.type];
                    const isSelected = selectedId === ev.id;
                    return (
                      <li key={ev.id}
                        className={`flex items-start gap-4 cursor-pointer`}
                        onClick={() => { setSelectedId(ev.id); setShowForm(false); }}>
                        {/* Timestamp */}
                        <div className="w-14 shrink-0 text-right pt-3">
                          <span className="text-[10px] font-mono text-gray-600">{toMMSS(ev.trigger_at_seconds)}</span>
                        </div>
                        {/* Dot */}
                        <div className={`w-3 h-3 mt-3.5 rounded-full shrink-0 z-10 border-2 transition-colors ${isSelected ? meta.color.replace('text-', 'border-') + ' ' + meta.bg : 'border-gray-700 bg-[#120208]'}`} />
                        {/* Card */}
                        <div className={`flex-1 rounded-2xl px-4 py-3 border transition-all ${isSelected ? `${meta.bg} ${meta.border}` : 'bg-[#111] border-white/5 hover:border-white/10'}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${meta.color} ${meta.bg} ${meta.border}`}>
                                  {meta.emoji} {meta.label}
                                </span>
                                {ev.duration_seconds > 0 && (
                                  <span className="text-[10px] text-gray-600 flex items-center gap-0.5">
                                    <Clock size={9} />{ev.duration_seconds}s
                                  </span>
                                )}
                              </div>
                              <p className="text-sm font-medium text-white">{ev.title}</p>
                              {ev.description && (
                                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{ev.description}</p>
                              )}
                              {ev.type === 'fake_billing' && ev.billing_amount_cents > 0 && (
                                <p className="text-xs text-green-400 font-bold mt-1">
                                  {(ev.billing_amount_cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </p>
                              )}
                              {ev.upsell_slug && (
                                <p className="text-[10px] text-pink-400 mt-0.5">→ /u/{ev.upsell_slug}</p>
                              )}
                              {ev.button_text && (
                                <span className="inline-block mt-1.5 text-[10px] px-2.5 py-0.5 rounded-full font-medium text-white"
                                  style={{ backgroundColor: ev.button_color ?? '#25d366' }}>
                                  {ev.button_text}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0 pl-2">
                              <button onClick={e => { e.stopPropagation(); openEdit(ev); }}
                                className="p-1.5 rounded-lg text-gray-600 hover:text-blue-400 hover:bg-blue-500/10 transition-all">
                                <Edit3 size={13} />
                              </button>
                              {confirmDelete === ev.id ? (
                                <div className="flex flex-col items-end gap-1" onClick={e => e.stopPropagation()}>
                                  <button onClick={() => deleteMutation.mutate(ev.id)} disabled={deleteMutation.isPending}
                                    className="text-[10px] text-red-400 hover:text-red-300 font-medium disabled:opacity-50">
                                    {deleteMutation.isPending ? '…' : 'Confirmar'}
                                  </button>
                                  <button onClick={() => setConfirmDelete(null)} className="text-[10px] text-gray-600 hover:text-gray-400">
                                    Cancelar
                                  </button>
                                </div>
                              ) : (
                                <button onClick={e => { e.stopPropagation(); setConfirmDelete(ev.id); }}
                                  className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all">
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          {/* Phone preview */}
          <PhonePreview event={previewEvent} displayName={displayName} callSlug={call?.slug} />
        </div>

      </div>
    </div>
  );
}
