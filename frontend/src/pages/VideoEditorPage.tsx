import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  BatteryWarning,
  Bell,
  Camera,
  Check,
  ChevronLeft,
  CreditCard,
  Eye, EyeOff,
  Gift,
  Layers,
  Lock,
  MessageSquare,
  MousePointer,
  Pause,
  Phone,
  PhoneIncoming,
  PhoneOff,
  Play,
  Plus,
  Scissors,
  Shield,
  SkipBack,
  Timer,
  Trash2,
  TrendingUp,
  Users,
  Volume2,
  VolumeX,
  WifiOff,
  ZoomIn, ZoomOut,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { formatPrice } from '../lib/currency';
import { EXTRA_TEXT_FIELDS } from '../lib/eventExtraTexts';
import { getCall, getPublicCall, updateCall, type Call, type PublicCall } from '../services/callService';
import {
  createEvent,
  deleteEvent,
  listEvents,
  updateEvent,
  type CallEvent,
  type EventType,
  type UpsertEventPayload,
} from '../services/eventService';

/* ─── Constants ──────────────────────────────────────────────────────────── */

const EVENT_COLOR: Record<string, string> = {
  popup: '#3b82f6', fullscreen: '#8b5cf6', fake_billing: '#25d366',
  offer_call: '#f59e0b', countdown: '#ef4444', upsell: '#ec4899',
  signal_drop: '#64748b',
  reconnect_paywall: '#ef4444',
  screenshot_alert: '#dc2626',
  battery_low: '#f97316',
  incoming_call: '#25d366',
  fake_gift: '#ec4899',
  viewer_count: '#06b6d4',
  social_proof: '#a855f7',
  exclusive_access: '#f59e0b',
  tip_jar: '#ec4899',
  video_lock: '#6366f1',
  phone_block: '#ef4444',
  age_gate: '#f59e0b',
};
const EVENT_LABEL: Record<string, string> = {
  popup: 'Popup', fullscreen: 'Tela cheia', fake_billing: 'WhatsApp Pay',
  offer_call: 'Oferta de chamada', countdown: 'Countdown', upsell: 'Upsell',
  signal_drop: 'Falha na conexão',
  reconnect_paywall: 'Queda + Paywall',
  screenshot_alert: 'Alerta de print',
  battery_low: 'Bateria baixa',
  incoming_call: 'Chamada entrando',
  fake_gift: 'Presente enviado',
  viewer_count: 'Espectadores ao vivo',
  social_proof: 'Prova social',
  exclusive_access: 'Acesso exclusivo',
  tip_jar: 'Gorjeta / Presente',
  video_lock: 'Vídeo bloqueado',
  phone_block: 'Número bloqueado',
  age_gate: 'Verificação de idade',
};
const EVENT_ICON: Record<string, React.ReactNode> = {
  popup: <MessageSquare className="w-3 h-3" />,
  fullscreen: <Layers className="w-3 h-3" />,
  fake_billing: <CreditCard className="w-3 h-3" />,
  offer_call: <Phone className="w-3 h-3" />,
  countdown: <Timer className="w-3 h-3" />,
  upsell: <TrendingUp className="w-3 h-3" />,
  signal_drop: <AlertCircle className="w-3 h-3" />,
  reconnect_paywall: <WifiOff className="w-3 h-3" />,
  screenshot_alert: <Camera className="w-3 h-3" />,
  battery_low: <BatteryWarning className="w-3 h-3" />,
  incoming_call: <PhoneIncoming className="w-3 h-3" />,
  fake_gift: <Gift className="w-3 h-3" />,
  viewer_count: <Users className="w-3 h-3" />,
  social_proof: <Bell className="w-3 h-3" />,
  exclusive_access: <Shield className="w-3 h-3" />,
  tip_jar: <Gift className="w-3 h-3" />,
  video_lock: <Lock className="w-3 h-3" />,
  phone_block: <PhoneOff className="w-3 h-3" />,
  age_gate: <Shield className="w-3 h-3" />,
};
const EVENT_DESC: Record<string, string> = {
  popup: 'Balão de mensagem', fullscreen: 'Sobreposição full', fake_billing: 'Tela de pagamento PIX',
  offer_call: 'Nova chamada ao encerrar', countdown: 'Timer de urgência', upsell: 'Card de produto',
  signal_drop: 'Simula queda de sinal / ruído',
  reconnect_paywall: 'Queda + tentativas + cobrança PIX',
  screenshot_alert: '"Ela viu que você tentou tirar print"',
  battery_low: 'Bateria dela caindo — urgência real',
  incoming_call: 'Outra chamada entrando — ciúme / FOMO',
  fake_gift: 'Animação de presente recebido',
  viewer_count: 'Contagem de espectadores ao vivo',
  social_proof: '"João acabou de pagar R$ 49"',
  exclusive_access: 'Acesso encerra em X minutos',
  tip_jar: 'Escolhe valor e manda gorjeta via PIX',
  video_lock: 'Trava o vídeo com blur — paga para continuar',
  phone_block: '"Seu número foi bloqueado" — paga para liberar',
  age_gate: 'Exige comprovação de maioridade via PIX para continuar',
};
const LAYER_GROUPS = [
  { label: 'Engajamento', types: ['popup', 'fullscreen', 'signal_drop', 'screenshot_alert', 'battery_low', 'incoming_call', 'fake_gift'] as EventType[] },
  { label: 'Social', types: ['viewer_count', 'social_proof', 'exclusive_access'] as EventType[] },
  { label: 'Vendas', types: ['offer_call', 'countdown', 'upsell'] as EventType[] },
  { label: 'Pagamento', types: ['fake_billing', 'reconnect_paywall', 'tip_jar', 'video_lock', 'phone_block', 'age_gate'] as EventType[] },
];

type DragKind = 'playhead' | 'trimStart' | 'trimEnd' | 'event' | 'eventDuration';
interface Drag { kind: DragKind; startX: number; startVal: number; eventId?: string }

const fmt = (t: number) => {
  const m = Math.floor(t / 60).toString().padStart(2, '0');
  const s = Math.floor(t % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

/* ─── Row assignment (multi-row timeline, no overlap) ────────────────────── */

function assignRows(events: CallEvent[]): Record<string, number> {
  const sorted = [...events].sort((a, b) => a.trigger_at_seconds - b.trigger_at_seconds);
  const result: Record<string, number> = {};
  const rowEnds: number[] = [];
  for (const ev of sorted) {
    const start = ev.trigger_at_seconds;
    const end = start + Math.max(ev.duration_seconds > 0 ? ev.duration_seconds : 3, 3);
    let placed = false;
    for (let r = 0; r < rowEnds.length; r++) {
      if (rowEnds[r] <= start) { result[ev.id] = r; rowEnds[r] = end; placed = true; break; }
    }
    if (!placed) { result[ev.id] = rowEnds.length; rowEnds.push(end); }
  }
  return result;
}

/* ─── Event Preview (phone frame overlay) ───────────────────────────────── */

function EventPreview({ event, live }: { event: CallEvent; live?: boolean }) {
  const brl = formatPrice(event.billing_amount_cents ?? 0);
  const btnBg = event.button_color || EVENT_COLOR[event.type] || '#25d366';

  const liveTag = live ? (
    <div className="absolute top-1 right-1 flex items-center gap-0.5 bg-red-500 px-1.5 py-0.5 rounded-full z-50">
      <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
      <span className="text-[8px] text-white font-bold">AO VIVO</span>
    </div>
  ) : null;

  if (event.type === 'popup') return (
    <div className="absolute bottom-20 left-2 right-2 z-20">
      {liveTag}
      <div className="bg-[#1f2c34] rounded-xl p-3 border border-white/10 shadow-2xl">
        <p className="text-white text-xs font-bold mb-1">{event.title || 'Título do popup'}</p>
        <p className="text-white/70 text-[10px]">{event.description}</p>
        {event.button_text && (
          <button className="mt-2 w-full text-[10px] font-bold py-1.5 rounded-lg text-white"
            style={{ backgroundColor: btnBg }}>{event.button_text}</button>
        )}
      </div>
    </div>
  );

  if (event.type === 'fullscreen') return (
    <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center gap-2 z-20">
      {liveTag}
      <p className="text-white text-xs font-bold text-center px-4">{event.title || 'Título'}</p>
      <p className="text-white/60 text-[10px] text-center px-4">{event.description}</p>
      {event.button_text && (
        <button className="mt-1 px-4 py-1.5 rounded-lg text-[10px] font-bold text-white"
          style={{ backgroundColor: btnBg }}>{event.button_text}</button>
      )}
    </div>
  );

  if (event.type === 'fake_billing') return (
    <div className="absolute inset-0 bg-[#ece5dd] flex flex-col z-20">
      {liveTag}
      <div className="bg-[#075e54] px-3 py-2 flex items-center gap-2">
        <div className="w-5 h-5 rounded-full bg-[#25d366] flex items-center justify-center text-white">
          <CreditCard className="w-2.5 h-2.5" />
        </div>
        <p className="text-white text-[10px] font-semibold">WhatsApp Pay</p>
      </div>
      <div className="flex-1 flex items-center justify-center flex-col gap-1">
        <p className="text-[#075e54] font-bold text-xl">{brl}</p>
        <p className="text-gray-500 text-[10px]">{event.title || 'Pagamento'}</p>
        <p className="text-gray-400 text-[9px]">{event.description}</p>
      </div>
      <div className="px-3 pb-4">
        <div className="w-full text-center py-2 rounded-xl text-white text-[10px] font-bold"
          style={{ backgroundColor: btnBg }}>{event.button_text || 'Pagar agora'}</div>
      </div>
    </div>
  );

  if (event.type === 'offer_call') return (
    <div className="absolute inset-0 bg-[#0b141a]/95 flex flex-col items-center justify-center gap-3 px-4 z-20">
      {liveTag}
      <div className="w-14 h-14 rounded-full bg-[#f59e0b] flex items-center justify-center animate-pulse">
        <Phone className="w-7 h-7 text-white" />
      </div>
      <p className="text-white text-xs font-bold text-center">{event.title || 'Nova chamada'}</p>
      <p className="text-white/60 text-[10px] text-center">{event.description}</p>
      <button className="w-full py-2 rounded-xl text-[10px] font-bold text-white"
        style={{ backgroundColor: btnBg }}>{event.button_text || 'Entrar na chamada'}</button>
      {event.offer_call_slug && (
        <p className="text-white/30 text-[9px]">/c/{event.offer_call_slug}</p>
      )}
    </div>
  );

  if (event.type === 'countdown') {
    const secs = event.duration_seconds > 0 ? event.duration_seconds : 300;
    const h = Math.floor(secs / 3600).toString().padStart(2, '0');
    const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return (
      <div className="absolute bottom-20 left-2 right-2 bg-[#1a1a1a] rounded-xl p-3 border border-red-500/40 z-20">
        {liveTag}
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <p className="text-red-400 text-[10px] font-bold uppercase tracking-wider">Oferta limitada</p>
        </div>
        <p className="text-white text-xs font-bold mb-0.5">{event.title}</p>
        <p className="text-white/60 text-[10px] mb-2">{event.description}</p>
        <div className="flex justify-center gap-2 mb-2">
          {[[h, 'h'], [m, 'm'], [s, 's']].map(([v, l], i) => (
            <div key={i} className="text-center">
              <div className="bg-red-600 text-white text-sm font-bold rounded px-2 py-1 w-8 tabular-nums">{v}</div>
              <p className="text-[8px] text-white/40 mt-0.5">{l}</p>
            </div>
          ))}
        </div>
        {event.button_text && (
          <button className="w-full py-1.5 rounded-lg text-[10px] font-bold text-white"
            style={{ backgroundColor: btnBg }}>{event.button_text}</button>
        )}
      </div>
    );
  }

  if (event.type === 'upsell') return (
    <div className="absolute bottom-20 left-2 right-2 bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-xl p-3 border border-pink-500/30 z-20">
      {liveTag}
      <div className="flex items-center gap-1.5 mb-2">
        <TrendingUp className="w-3 h-3 text-pink-400" />
        <p className="text-pink-400 text-[10px] font-bold uppercase tracking-wider">Oferta especial</p>
      </div>
      <p className="text-white text-xs font-bold mb-0.5">{event.title}</p>
      <p className="text-white/60 text-[10px] mb-2">{event.description}</p>
      {event.button_text && (
        <button className="w-full py-1.5 rounded-lg text-[10px] font-bold text-white"
          style={{ backgroundColor: btnBg }}>{event.button_text}</button>
      )}
    </div>
  );

  if (event.type === 'reconnect_paywall') return (
    <div className="absolute inset-0 bg-black/92 flex flex-col items-center justify-center gap-3 z-20 px-4">
      {liveTag}
      <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
        <WifiOff className="w-7 h-7 text-red-400" />
      </div>
      <div className="text-center">
        <p className="text-white text-xs font-bold">Sem conexão</p>
        <p className="text-gray-500 text-[9px] mt-0.5">Verificando a rede…</p>
      </div>
      <div className="w-full bg-[#25d366] rounded-lg py-1.5 text-center">
        <p className="text-white text-[10px] font-bold">{event.button_text || 'Restaurar chamada'}</p>
      </div>
      {event.billing_amount_cents > 0 && (
        <p className="text-[#25d366] text-[9px] font-bold">
          {formatPrice(event.billing_amount_cents)}
        </p>
      )}
    </div>
  );

  if (event.type === 'signal_drop') return (
    <div className="absolute inset-0 z-20 pointer-events-none">
      {liveTag}
      {/* Noise/static overlay */}
      <div
        className="absolute inset-0"
        style={{
          opacity: 0.5,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundSize: '256px 256px',
          mixBlendMode: 'overlay',
        }}
      />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center,transparent 40%,rgba(0,0,0,0.65) 100%)' }} />
      <div className="absolute bottom-16 left-0 right-0 flex justify-center">
        <div className="bg-black/70 rounded-lg px-3 py-1.5 flex items-center gap-1.5">
          <AlertCircle className="w-3 h-3 text-white/80" />
          <span className="text-white text-[9px] font-medium">Sinal fraco…</span>
        </div>
      </div>
    </div>
  );

  if (event.type === 'screenshot_alert') return (
    <div className="absolute inset-0 bg-red-900/90 flex flex-col items-center justify-center gap-2 z-20">
      {liveTag}
      <Camera className="w-8 h-8 text-red-300" />
      <p className="text-white text-[10px] font-bold text-center px-3">⚠️ Ela viu que você tentou tirar print!</p>
    </div>
  );

  if (event.type === 'battery_low') return (
    <div className="absolute top-8 left-0 right-0 flex justify-center z-20">
      {liveTag}
      <div className="bg-orange-500 rounded-lg px-3 py-1.5 flex items-center gap-1.5">
        <BatteryWarning className="w-3 h-3 text-white" />
        <span className="text-white text-[9px] font-bold">Bateria {event.title || '3'}% — chamada pode cair</span>
      </div>
    </div>
  );

  if (event.type === 'incoming_call') return (
    <div className="absolute inset-0 bg-[#0b141a]/95 flex flex-col items-center justify-center gap-3 z-20">
      {liveTag}
      <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center">
        <PhoneIncoming className="w-6 h-6 text-[#25d366]" />
      </div>
      <p className="text-white text-[10px] font-bold">{event.title || 'Contato desconhecido'}</p>
      <p className="text-gray-400 text-[9px]">ligando…</p>
      <div className="flex gap-4 mt-1">
        <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center"><PhoneOff className="w-4 h-4 text-white" /></div>
        <div className="w-8 h-8 rounded-full bg-[#25d366] flex items-center justify-center"><Phone className="w-4 h-4 text-white" /></div>
      </div>
    </div>
  );

  if (event.type === 'fake_gift') return (
    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-2 z-20">
      {liveTag}
      <div className="text-3xl animate-bounce">🎁</div>
      <p className="text-white text-[10px] font-bold">{event.title || 'Você recebeu um presente!'}</p>
      <p className="text-pink-300 text-[9px]">{event.description}</p>
    </div>
  );

  if (event.type === 'viewer_count') return (
    <div className="absolute top-8 left-2 z-20">
      {liveTag}
      <div className="bg-cyan-500/90 rounded-full px-2 py-1 flex items-center gap-1">
        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
        <Users className="w-2.5 h-2.5 text-white" />
        <span className="text-white text-[9px] font-bold">{event.title || '847'}</span>
      </div>
    </div>
  );

  if (event.type === 'social_proof') return (
    <div className="absolute top-8 left-0 right-0 flex justify-center z-20">
      {liveTag}
      <div className="bg-purple-600/90 rounded-xl px-3 py-2 flex items-center gap-2 max-w-[90%]">
        <Bell className="w-3 h-3 text-white shrink-0" />
        <span className="text-white text-[9px] font-medium truncate">{event.title || 'João acabou de pagar R$ 49'}</span>
      </div>
    </div>
  );

  if (event.type === 'exclusive_access') return (
    <div className="absolute inset-0 bg-amber-900/85 flex flex-col items-center justify-center gap-2 z-20">
      {liveTag}
      <Shield className="w-6 h-6 text-amber-300" />
      <p className="text-white text-[10px] font-bold text-center px-3">{event.title || 'Acesso exclusivo'}</p>
      <div className="bg-amber-500 rounded-lg px-3 py-1">
        <span className="text-white text-[10px] font-bold tabular-nums">
          {Math.floor((event.duration_seconds || 300) / 60).toString().padStart(2,'0')}:{((event.duration_seconds || 300) % 60).toString().padStart(2,'0')}
        </span>
      </div>
    </div>
  );

  if (event.type === 'tip_jar') return (
    <div className="absolute inset-0 bg-[#0b141a] flex flex-col z-20">
      {liveTag}
      <div className="bg-pink-600 px-3 py-2 flex items-center gap-2">
        <Gift className="w-4 h-4 text-white" />
        <p className="text-white text-[10px] font-semibold">{event.title || 'Manda um presente 🎁'}</p>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-2 px-3">
        {[1000, 2500, 5000, 9700].map(v => (
          <div key={v} className="w-full bg-pink-500/20 border border-pink-500/40 rounded-lg py-1.5 text-center">
            <span className="text-pink-300 text-[10px] font-bold">
              {formatPrice(v)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  if (event.type === 'video_lock') return (
    <div className="absolute inset-0 z-20">
      {liveTag}
      <div className="absolute inset-0 backdrop-blur-md bg-black/60" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4">
        <Lock className="w-8 h-8 text-indigo-300" />
        <p className="text-white text-[10px] font-bold text-center">{event.title || 'Vídeo bloqueado'}</p>
        <p className="text-gray-400 text-[9px] text-center">{event.description || 'Pague para continuar assistindo'}</p>
        <div className="w-full bg-indigo-500 rounded-lg py-1.5 text-center mt-1">
          <span className="text-white text-[10px] font-bold">
            {formatPrice(event.billing_amount_cents || 0)} — Desbloquear
          </span>
        </div>
      </div>
    </div>
  );

  if (event.type === 'phone_block') return (
    <div className="absolute inset-0 bg-red-950/95 flex flex-col items-center justify-center gap-3 z-20 px-4">
      {liveTag}
      <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center">
        <PhoneOff className="w-7 h-7 text-red-400" />
      </div>
      <p className="text-white text-[10px] font-bold text-center">{event.title || 'Número bloqueado'}</p>
      <p className="text-gray-400 text-[9px] text-center">{event.description || 'Pague para liberar o contato'}</p>
      <div className="w-full bg-red-500 rounded-lg py-1.5 text-center">
        <span className="text-white text-[10px] font-bold">{event.button_text || 'Liberar número'}</span>
      </div>
    </div>
  );

  if (event.type === 'age_gate') return (
    <div className="absolute inset-0 bg-black/92 flex flex-col items-center justify-center gap-3 z-20 px-4">
      {liveTag}
      <div className="w-14 h-14 rounded-full bg-yellow-500/20 flex items-center justify-center">
        <Shield className="w-7 h-7 text-yellow-400" />
      </div>
      <div className="text-center">
        <p className="text-white text-[10px] font-bold">🔞 {event.title || 'Conteúdo +18'}</p>
        <p className="text-gray-400 text-[9px] mt-0.5 text-center leading-tight">{event.description || 'Verificação de maioridade'}</p>
      </div>
      <div className="w-full bg-yellow-500 rounded-lg py-1.5 text-center">
        <span className="text-[#1a1a1a] text-[10px] font-bold">{event.button_text || 'Confirmar maioridade'}</span>
      </div>
      {event.billing_amount_cents > 0 && (
        <p className="text-yellow-400 text-[9px] font-semibold">{formatPrice(event.billing_amount_cents)}</p>
      )}
    </div>
  );

  return null;
}

/* ─── Phone Frame ────────────────────────────────────────────────────────── */

function PhoneFrame({
  videoRef, publicData, currentTime, activeEvent, liveEvent, onMetadata, previewMode,
  videoZoom, videoX, videoY,
}: {
  videoRef: React.RefObject<HTMLVideoElement>;
  publicData: PublicCall;
  currentTime: number;
  activeEvent: CallEvent | null;
  liveEvent: CallEvent | null;
  onMetadata: (d: number) => void;
  previewMode: boolean;
  videoZoom: number;
  videoX: number;
  videoY: number;
}) {
  const showEvent = activeEvent || liveEvent;
  const isLive = !activeEvent && !!liveEvent;

  return (
    <div className="relative select-none" style={{ width: 260, height: 540 }}>
      <div className="absolute inset-0 rounded-[44px] bg-[#1c1c1e]"
        style={{ boxShadow: '0 0 0 2px #3a3a3c, 0 30px 80px rgba(0,0,0,0.9)' }}>
        <div className="absolute inset-[10px] rounded-[36px] overflow-hidden bg-black">
          {/* Notch */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-40 pointer-events-none" />
          {/* Video */}
          <video
            ref={videoRef}
            src={publicData.video_url}
            className="absolute inset-0 w-full h-full"
            style={{
              objectFit: 'cover',
              transform: `scale(${videoZoom}) translate(${videoX}%, ${videoY}%)`,
              transformOrigin: 'center center',
            }}
            playsInline preload="metadata"
            onLoadedMetadata={e => onMetadata((e.target as HTMLVideoElement).duration)}
            onContextMenu={e => e.preventDefault()}
          />
          {/* HUD */}
          {!previewMode && (
            <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/80 pointer-events-none z-10">
              <div className="flex flex-col items-center pt-10">
                <div className="w-14 h-14 rounded-full bg-[#2a3942] mb-2 flex items-center justify-center overflow-hidden border-2 border-white/20">
                  {publicData.contact_photo_url
                    ? <img src={publicData.contact_photo_url} alt="" className="w-full h-full object-cover" />
                    : <svg viewBox="0 0 24 24" fill="#8696a0" className="w-8 h-8"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" /></svg>
                  }
                </div>
                <p className="text-white text-sm font-semibold">{publicData.display_name}</p>
                <p className="text-white/60 text-xs mt-0.5 tabular-nums">{fmt(currentTime)}</p>
              </div>
              <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-4">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" /></svg>
                </div>
                <div className="w-12 h-12 rounded-full bg-[#f02849] flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" /></svg>
                </div>
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5"><path d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.362a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" /></svg>
                </div>
              </div>
            </div>
          )}
          {/* Overlay */}
          {showEvent && <EventPreview event={showEvent} live={isLive} />}
        </div>
        {/* Side buttons */}
        <div className="absolute right-[-3px] top-24 w-[3px] h-10 bg-[#3a3a3c] rounded-full" />
        <div className="absolute left-[-3px] top-20 w-[3px] h-7 bg-[#3a3a3c] rounded-full" />
        <div className="absolute left-[-3px] top-[120px] w-[3px] h-7 bg-[#3a3a3c] rounded-full" />
      </div>
    </div>
  );
}

/* ─── Ruler ──────────────────────────────────────────────────────────────── */

function Ruler({ duration, zoom, currentTime, onSeek }: {
  duration: number; zoom: number; currentTime: number;
  onSeek: (t: number) => void;
}) {
  const tickInterval = zoom >= 60 ? 1 : zoom >= 25 ? 2 : zoom >= 12 ? 5 : 10;
  const ticks: number[] = [];
  for (let t = 0; t <= duration + tickInterval; t += tickInterval) ticks.push(t);

  return (
    <div
      className="absolute top-0 left-0 right-0 h-6 border-b border-white/10 cursor-pointer hover:bg-white/5 transition-colors"
      onClick={e => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const scrollLeft = (e.currentTarget.parentElement?.parentElement as HTMLElement)?.scrollLeft ?? 0;
        onSeek(Math.max(0, (e.clientX - rect.left + scrollLeft) / zoom));
      }}
    >
      {ticks.map(t => (
        <div key={t} className="absolute flex flex-col items-center" style={{ left: t * zoom }}>
          <div className="w-px h-2 bg-white/30" />
          <span className="text-[9px] text-white/40 mt-0.5 whitespace-nowrap tabular-nums">{fmt(t)}</span>
        </div>
      ))}
      {/* Current time marker on ruler */}
      <div className="absolute top-0 h-full w-px bg-red-500/40 pointer-events-none"
        style={{ left: currentTime * zoom }} />
    </div>
  );
}

/* ─── Video Track ────────────────────────────────────────────────────────── */

function VideoTrack({ duration, trimStart, trimEnd, zoom, onDragStart }: {
  duration: number; trimStart: number; trimEnd: number; zoom: number;
  onDragStart: (e: React.MouseEvent, kind: DragKind, id?: string, val?: number) => void;
}) {
  const activeW = Math.max(0, (trimEnd - trimStart) * zoom);
  return (
    <div className="absolute" style={{ top: 28, left: 0, right: 0, height: 36 }}>
      <div className="absolute top-0 h-full bg-white/5 rounded" style={{ left: 0, width: duration * zoom }} />
      <div className="absolute top-0 h-full bg-[#25d366]/20 border-t border-b border-[#25d366]/50"
        style={{ left: trimStart * zoom, width: activeW }}>
        <div className="absolute inset-0 flex items-center px-3 gap-1.5">
          <Scissors className="w-3 h-3 text-[#25d366]/70 shrink-0" />
          <span className="text-[10px] text-[#25d366]/80 truncate">
            {fmt(trimStart)} → {fmt(trimEnd)} &nbsp;·&nbsp; {fmt(trimEnd - trimStart)} total
          </span>
        </div>
      </div>
      {/* Trim handles */}
      {[{ side: 'left', x: trimStart * zoom - 5, kind: 'trimStart' as DragKind, val: trimStart },
        { side: 'right', x: trimEnd * zoom - 5, kind: 'trimEnd' as DragKind, val: trimEnd }].map(h => (
        <div key={h.side}
          className={`absolute top-0 bottom-0 w-3 bg-[#25d366] ${h.side === 'left' ? 'rounded-l' : 'rounded-r'} cursor-ew-resize flex items-center justify-center z-10 hover:bg-green-400 transition-colors`}
          style={{ left: h.x }}
          onMouseDown={e => { e.stopPropagation(); onDragStart(e, h.kind, undefined, h.val); }}>
          <div className="w-0.5 h-4 bg-white/70 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/* ─── Events Track (multi-row) ───────────────────────────────────────────── */

function EventsTrack({ events, zoom, selectedId, activeId, rows, numRows, onSelect, onDragStart }: {
  events: CallEvent[]; zoom: number; selectedId: string | null; activeId: string | null;
  rows: Record<string, number>; numRows: number;
  onSelect: (id: string) => void;
  onDragStart: (e: React.MouseEvent, kind: DragKind, id?: string, val?: number) => void;
}) {
  const ROW_H = 28;
  return (
    <div className="absolute" style={{ top: 72, left: 0, right: 0, height: Math.max(numRows, 1) * ROW_H + 8 }}>
      <span className="absolute -top-4 left-1 text-[9px] text-white/30 uppercase tracking-wider">Camadas</span>
      {Array.from({ length: numRows }, (_, r) => (
        <div key={r} className="absolute left-0 right-0 border-b border-white/5"
          style={{ top: r * ROW_H, height: ROW_H }} />
      ))}
      {events.map(ev => {
        const color = EVENT_COLOR[ev.type] ?? '#666';
        const isSelected = ev.id === selectedId;
        const isActive = ev.id === activeId;
        const row = rows[ev.id] ?? 0;
        const minPx = 64;
        const chipWidth = ev.duration_seconds > 0
          ? Math.max(minPx, ev.duration_seconds * zoom) : minPx;

        return (
          <div key={ev.id}
            className="absolute rounded-md cursor-pointer flex items-center px-2 gap-1 border transition-all group"
            style={{
              top: row * ROW_H + 3,
              height: ROW_H - 6,
              left: ev.trigger_at_seconds * zoom,
              width: chipWidth,
              backgroundColor: isActive ? color + '40' : color + '20',
              borderColor: isSelected ? color : isActive ? color + '90' : color + '50',
              boxShadow: isSelected ? `0 0 0 1.5px ${color}` : isActive ? `0 0 8px ${color}50` : 'none',
            }}
            onClick={e => { e.stopPropagation(); onSelect(ev.id); }}
            onMouseDown={e => { e.stopPropagation(); onDragStart(e, 'event', ev.id, ev.trigger_at_seconds); }}
          >
            <span className="shrink-0" style={{ color }}>{EVENT_ICON[ev.type]}</span>
            <span className="text-[10px] text-white/90 truncate flex-1">{EVENT_LABEL[ev.type]}</span>
            <span className="text-[9px] text-white/40 shrink-0 tabular-nums">{fmt(ev.trigger_at_seconds)}</span>
            {ev.duration_seconds > 0 && (
              <span className="text-[9px] ml-1 shrink-0" style={{ color: color + 'aa' }}>
                {ev.duration_seconds}s
              </span>
            )}
            {/* Duration resize handle */}
            <div
              className="absolute top-0 right-0 bottom-0 w-3 cursor-ew-resize flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-white/10 rounded-r-md z-10 transition-opacity"
              onMouseDown={e => { e.stopPropagation(); onDragStart(e, 'eventDuration', ev.id, ev.duration_seconds); }}
            >
              <div className="w-px h-3 bg-white/50" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Props Panel helpers ────────────────────────────────────────────────── */

const inputCls = 'w-full bg-[#0d0d0d] border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-green-500/60 transition-colors';
const labelCls = 'text-[10px] text-gray-500 mb-1 block font-medium uppercase tracking-wider';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={e => onChange(e.target.value)}
          className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border border-white/10 p-0.5" />
        <input value={value} onChange={e => onChange(e.target.value)}
          className={inputCls + ' flex-1 font-mono'} placeholder="#ffffff" />
      </div>
    </div>
  );
}

/* ─── Event Props Panel ──────────────────────────────────────────────────── */

function EventPropsPanel({ event, onChange, onDelete }: {
  event: CallEvent | null;
  onChange: (field: string, val: string | number | Record<string, string>) => void;
  onDelete: () => void;
}) {
  if (!event) return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-3">
        <MousePointer className="w-5 h-5 text-gray-600" />
      </div>
      <p className="text-sm text-gray-400 font-medium">Nenhuma camada selecionada</p>
      <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
        Clique em uma camada na lista ou na timeline para editar suas propriedades
      </p>
    </div>
  );

  const color = EVENT_COLOR[event.type] ?? '#666';
  const isBilling = event.type === 'fake_billing';
  const isReconnectPaywall = event.type === 'reconnect_paywall';
  const isCountdown = event.type === 'countdown';
  const isOfferCall = event.type === 'offer_call';
  const isSignalDrop = event.type === 'signal_drop';
  const isTipJar = event.type === 'tip_jar';
  const isVideoLock = event.type === 'video_lock';
  const isPhoneBlock = event.type === 'phone_block';
  const isAgeGate = event.type === 'age_gate';
  const isAnyBilling = isBilling || isTipJar || isVideoLock || isPhoneBlock || isAgeGate;
  // tipos que só usam timing (sem título/descrição/botão)
  const isTimingOnly = isSignalDrop || event.type === 'screenshot_alert';
  // tipos que têm título mas não têm botão próprio
  const hasNoButton = isTimingOnly || isReconnectPaywall || isAnyBilling ||
    event.type === 'battery_low' || event.type === 'viewer_count' ||
    event.type === 'fake_gift';

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md flex items-center justify-center"
            style={{ backgroundColor: color + '30', color }}>
            {EVENT_ICON[event.type]}
          </div>
          <span className="text-xs font-semibold text-white">{EVENT_LABEL[event.type]}</span>
        </div>
        <button onClick={onDelete}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Timing */}
        <div className="grid grid-cols-2 gap-2">
          <Field label="Disparo (s)">
            <input type="number" min={0} value={event.trigger_at_seconds}
              onChange={e => onChange('trigger_at_seconds', parseInt(e.target.value) || 0)}
              className={inputCls} />
          </Field>
          <Field label={isCountdown ? 'Duração/Timer (s)' : 'Duração (s)'}>
            <input type="number" min={0} value={event.duration_seconds ?? 0}
              onChange={e => onChange('duration_seconds', parseInt(e.target.value) || 0)}
              className={inputCls} placeholder="0=manual" />
          </Field>
        </div>
        {isCountdown && (
          <div className="flex items-start gap-2 bg-red-500/5 border border-red-500/15 rounded-lg p-2.5">
            <AlertCircle className="w-3 h-3 text-red-400 mt-0.5 shrink-0" />
            <p className="text-[10px] text-red-400">A duração define o tempo inicial do countdown</p>
          </div>
        )}
        {isTimingOnly && (
          <div className="flex items-start gap-2 bg-slate-500/5 border border-slate-500/15 rounded-lg p-2.5">
            <AlertCircle className="w-3 h-3 text-slate-400 mt-0.5 shrink-0" />
            <p className="text-[10px] text-slate-400">
              {isSignalDrop ? 'A duração define quantos segundos o efeito de ruído persiste' : 'A duração define quantos segundos o alerta fica visível'}
            </p>
          </div>
        )}

        {/* battery_low — só o % */}
        {event.type === 'battery_low' && (
          <div className="border-t border-white/5 pt-3">
            <Field label="Bateria (%)">
              <input value={event.title} onChange={e => onChange('title', e.target.value)}
                className={inputCls} placeholder="Ex: 3" />
            </Field>
          </div>
        )}

        {/* viewer_count — só a contagem */}
        {event.type === 'viewer_count' && (
          <div className="border-t border-white/5 pt-3">
            <Field label="Quantidade de espectadores">
              <input value={event.title} onChange={e => onChange('title', e.target.value)}
                className={inputCls} placeholder="Ex: 1.247" />
            </Field>
          </div>
        )}

        {/* Title + Description — não mostrado para timingOnly, reconnect_paywall, billing, battery_low, viewer_count */}
        {!isTimingOnly && !isReconnectPaywall && !isAnyBilling &&
          event.type !== 'battery_low' && event.type !== 'viewer_count' && (
          <div className="space-y-2 border-t border-white/5 pt-3">
            <Field label="Título">
              <input value={event.title}
                onChange={e => onChange('title', e.target.value)}
                className={inputCls} placeholder="Título do overlay" />
            </Field>
            <Field label="Descrição">
              <textarea value={event.description}
                onChange={e => onChange('description', e.target.value)}
                rows={2} className={inputCls + ' resize-none'} placeholder="Texto secundário" />
            </Field>
          </div>
        )}

        {/* Reconnect paywall fields */}
        {isReconnectPaywall && (
          <div className="space-y-2 border-t border-white/5 pt-3">
            <Field label="Valor (centavos)">
              <input type="number" value={event.billing_amount_cents ?? 0}
                onChange={e => onChange('billing_amount_cents', parseInt(e.target.value) || 0)}
                className={inputCls} />
              <p className="text-[10px] text-gray-600 mt-1">
                = {formatPrice(event.billing_amount_cents ?? 0)}
              </p>
            </Field>
            <Field label="Texto do botão">
              <input value={event.button_text ?? ''}
                onChange={e => onChange('button_text', e.target.value)}
                className={inputCls} placeholder="Restaurar chamada" />
            </Field>
            <Field label="Mensagem de falha">
              <textarea value={event.description}
                onChange={e => onChange('description', e.target.value)}
                rows={3} className={inputCls + ' resize-none'}
                placeholder="Sua conexão foi interrompida…" />
            </Field>
            <ColorField label="Cor do botão" value={event.button_color || '#25d366'} onChange={v => onChange('button_color', v)} />
          </div>
        )}

        {/* Tip jar / video_lock / phone_block billing fields */}
        {isAnyBilling && !isBilling && (
          <div className="space-y-2 border-t border-white/5 pt-3">
            <Field label="Título">
              <input value={event.title} onChange={e => onChange('title', e.target.value)} className={inputCls} placeholder="Título" />
            </Field>
            <Field label="Descrição">
              <textarea value={event.description} onChange={e => onChange('description', e.target.value)}
                rows={2} className={inputCls + ' resize-none'} placeholder="Texto secundário" />
            </Field>
            <Field label="Valor (centavos)">
              <input type="number" value={event.billing_amount_cents ?? 0}
                onChange={e => onChange('billing_amount_cents', parseInt(e.target.value) || 0)}
                className={inputCls} />
              <p className="text-[10px] text-gray-600 mt-1">
                = {formatPrice(event.billing_amount_cents ?? 0)}
              </p>
            </Field>
            <Field label="Texto do botão">
              <input value={event.button_text ?? ''} onChange={e => onChange('button_text', e.target.value)}
                className={inputCls} />
            </Field>
            <ColorField label="Cor do botão" value={event.button_color || EVENT_COLOR[event.type] || '#25d366'} onChange={v => onChange('button_color', v)} />
          </div>
        )}

        {/* Billing-specific (fake_billing) */}
        {isBilling && (
          <div className="space-y-2 border-t border-white/5 pt-3">
            <Field label="Valor (centavos)">
              <input type="number" value={event.billing_amount_cents ?? 0}
                onChange={e => onChange('billing_amount_cents', parseInt(e.target.value) || 0)}
                className={inputCls} />
              <p className="text-[10px] text-gray-600 mt-1">
                = {formatPrice(event.billing_amount_cents ?? 0)}
              </p>
            </Field>
            <Field label="Nome do pagador">
              <input value={event.billing_payer_name ?? ''}
                onChange={e => onChange('billing_payer_name', e.target.value)}
                className={inputCls} placeholder="Auto-preenchido" />
            </Field>
            <Field label="CPF">
              <input value={event.billing_payer_document ?? ''}
                onChange={e => onChange('billing_payer_document', e.target.value)}
                className={inputCls} placeholder="Solicita ao visitante" />
            </Field>
            <Field label="Telefone">
              <input value={event.billing_payer_phone ?? ''}
                onChange={e => onChange('billing_payer_phone', e.target.value)}
                className={inputCls} />
            </Field>
          </div>
        )}

        {/* Offer call slug */}
        {isOfferCall && (
          <div className="border-t border-white/5 pt-3">
            <Field label="Slug da outra chamada">
              <input value={event.offer_call_slug ?? ''}
                onChange={e => onChange('offer_call_slug', e.target.value)}
                className={inputCls} placeholder="minha-outra-chamada" />
            </Field>
            <p className="text-[10px] text-gray-600 mt-1">
              Link: /c/{event.offer_call_slug || '...'}
            </p>
          </div>
        )}

        {/* Button + color (somente tipos que usam botão próprio) */}
        {!hasNoButton && (
          <div className="border-t border-white/5 pt-3 space-y-2">
            <Field label="Texto do botão">
              <input value={event.button_text ?? ''}
                onChange={e => onChange('button_text', e.target.value)}
                className={inputCls} placeholder="Ex: Saiba mais" />
            </Field>
            <ColorField
              label="Cor do botão"
              value={event.button_color || color}
              onChange={v => onChange('button_color', v)}
            />
          </div>
        )}

        {/* ── Textos avançados — todos os textos do overlay são editáveis ── */}
        {(EXTRA_TEXT_FIELDS[event.type]?.length ?? 0) > 0 && (
          <details className="border-t border-white/5 pt-3 group">
            <summary className="cursor-pointer text-[10px] font-semibold text-gray-500 hover:text-white uppercase tracking-wider transition-colors select-none list-none flex items-center gap-1">
              <span className="inline-block transition-transform group-open:rotate-90">▸</span>
              ✏️ Textos avançados
            </summary>
            <div className="space-y-2 mt-2.5">
              {EXTRA_TEXT_FIELDS[event.type]!.map(f => (
                <Field key={f.key} label={f.label}>
                  <input
                    value={event.extra_texts?.[f.key] ?? ''}
                    onChange={e => onChange('extra_texts', { ...(event.extra_texts ?? {}), [f.key]: e.target.value })}
                    placeholder={f.def || '(padrão do sistema)'}
                    className={inputCls}
                  />
                </Field>
              ))}
              <p className="text-[9px] text-gray-600">Vazio = texto padrão do sistema.</p>
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

/* ─── Layers Panel ───────────────────────────────────────────────────────── */

function LayersPanel({ events, selectedId, activeId, onSelect, onAdd, onDelete }: {
  events: CallEvent[]; selectedId: string | null; activeId: string | null;
  onSelect: (id: string) => void; onAdd: (type: string) => void; onDelete: (id: string) => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2.5 border-b border-white/10 shrink-0">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Camadas</p>
      </div>

      {/* Existing layers */}
      <div className="flex-1 overflow-y-auto py-1.5 px-2 space-y-0.5 min-h-0">
        {events.length === 0 && (
          <p className="text-[10px] text-gray-600 text-center py-4">Adicione uma camada abaixo</p>
        )}
        {events.map(ev => {
          const color = EVENT_COLOR[ev.type] ?? '#666';
          const isSelected = ev.id === selectedId;
          const isActive = ev.id === activeId;
          return (
            <div key={ev.id}
              className="flex items-center gap-2 rounded-lg px-2 py-2 cursor-pointer group transition-all"
              style={{
                backgroundColor: isSelected ? color + '20' : isActive ? color + '10' : 'transparent',
                borderLeft: isActive ? `2px solid ${color}` : '2px solid transparent',
              }}
              onClick={() => onSelect(ev.id)}
            >
              <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                style={{ backgroundColor: color + '25', color }}>
                {EVENT_ICON[ev.type]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-white truncate">{EVENT_LABEL[ev.type]}</p>
                <p className="text-[9px] text-gray-600 tabular-nums">
                  {fmt(ev.trigger_at_seconds)}
                  {ev.duration_seconds > 0 ? ` · ${ev.duration_seconds}s` : ''}
                  {ev.title ? ` — ${ev.title.slice(0, 14)}` : ''}
                </p>
              </div>
              {isActive && <div className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0" style={{ backgroundColor: color }} />}
              <button onClick={e => { e.stopPropagation(); onDelete(ev.id); }}
                className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all shrink-0">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Add layer buttons */}
      <div className="border-t border-white/10 p-2 space-y-2 shrink-0 max-h-[52%] overflow-y-auto">
        {LAYER_GROUPS.map(group => (
          <div key={group.label}>
            <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-1 px-1">{group.label}</p>
            <div className="space-y-0.5">
              {group.types.map(type => (
                <button key={type} onClick={() => onAdd(type)}
                  className="w-full flex items-center gap-2 hover:bg-white/5 rounded-lg px-2 py-1.5 text-left transition-colors group">
                  <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                    style={{ backgroundColor: (EVENT_COLOR[type] ?? '#666') + '25', color: EVENT_COLOR[type] ?? '#666' }}>
                    {EVENT_ICON[type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-white truncate">{EVENT_LABEL[type]}</p>
                    <p className="text-[9px] text-gray-600 truncate">{EVENT_DESC[type]}</p>
                  </div>
                  <Plus className="w-3 h-3 text-gray-600 group-hover:text-gray-400 shrink-0 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Default payloads ───────────────────────────────────────────────────── */

function defaultPayload(type: string, currentTime: number): UpsertEventPayload {
  const base = { trigger_at_seconds: Math.round(currentTime), duration_seconds: 0,
    type: type as UpsertEventPayload['type'], title: EVENT_LABEL[type], description: '' };
  switch (type) {
    case 'popup': return { ...base, button_text: 'OK', button_color: '#3b82f6' };
    case 'fullscreen': return { ...base, button_text: 'Continuar', button_color: '#8b5cf6' };
    case 'fake_billing': return { ...base, billing_amount_cents: 9900 };
    case 'offer_call': return { ...base, button_text: 'Entrar na chamada', button_color: '#f59e0b', duration_seconds: 30, offer_call_slug: '' };
    case 'countdown': return { ...base, button_text: 'Garantir agora', button_color: '#ef4444', duration_seconds: 300 };
    case 'upsell': return { ...base, button_text: 'Quero isso', button_color: '#ec4899', duration_seconds: 0 };
    case 'signal_drop': return { ...base, title: 'Sinal fraco', description: '', duration_seconds: 5 };
    case 'reconnect_paywall': return { ...base, billing_amount_cents: 3990, button_text: 'Restaurar chamada', button_color: '#25d366', description: 'Sua conexão foi interrompida. Para restaurar a chamada, é necessário continuar com o pacote de conexão.' };
    case 'screenshot_alert': return { ...base, title: 'Alerta de print', description: '', duration_seconds: 4 };
    case 'battery_low': return { ...base, title: '3', description: '', duration_seconds: 6 };
    case 'incoming_call': return { ...base, title: 'Contato desconhecido', description: '', duration_seconds: 8 };
    case 'fake_gift': return { ...base, title: 'Você enviou um presente! 🎁', description: '', duration_seconds: 4 };
    case 'viewer_count': return { ...base, title: '1.247', description: '', duration_seconds: 5 };
    case 'social_proof': return { ...base, title: 'João acabou de pagar R$ 49', description: '', duration_seconds: 5 };
    case 'exclusive_access': return { ...base, title: 'Acesso exclusivo encerrando', description: '', duration_seconds: 300 };
    case 'tip_jar': return { ...base, title: 'Manda um presente pra ela 🎁', description: 'Escolha um valor e surpreenda', button_text: 'Enviar presente', button_color: '#ec4899', billing_amount_cents: 1000 };
    case 'video_lock': return { ...base, title: 'Vídeo bloqueado', description: 'Continue para desbloquear o momento', button_text: 'Desbloquear', button_color: '#6366f1', billing_amount_cents: 2990 };
    case 'phone_block': return { ...base, title: 'Número bloqueado', description: 'Seu número foi bloqueado temporariamente. Pague para liberar o contato.', button_text: 'Liberar número', button_color: '#ef4444', billing_amount_cents: 4990 };
    case 'age_gate': return { ...base, title: 'Conteúdo +18', description: 'Para confirmar que você é maior de idade, é necessário realizar uma verificação rápida.', button_text: 'Confirmar maioridade', button_color: '#f59e0b', billing_amount_cents: 990 };
    default: return base;
  }
}

/* ─── Main Editor Page ───────────────────────────────────────────────────── */

export default function VideoEditorPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const { data: call } = useQuery<Call>({ queryKey: ['call', id], queryFn: () => getCall(id!), enabled: !!id });
  const { data: rawEvents = [] } = useQuery<CallEvent[]>({ queryKey: ['events', id], queryFn: () => listEvents(id!), enabled: !!id });
  const { data: publicData } = useQuery<PublicCall>({
    queryKey: ['public-call', call?.slug], queryFn: () => getPublicCall(call!.slug), enabled: !!call?.slug,
  });

  const [localEvents, setLocalEvents] = useState<CallEvent[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [zoom, setZoom] = useState(40);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [volume, setVolume] = useState(0.7);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [videoZoom, setVideoZoom] = useState(1);
  const [videoX, setVideoX] = useState(0);
  const [videoY, setVideoY] = useState(0);
  const [previewMode, setPreviewMode] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [saveTrimStatus, setSaveTrimStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const rafRef = useRef<number>(0);
  const initRef = useRef(false);
  const localEventsRef = useRef<CallEvent[]>([]);
  const pendingSaveRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Keep ref in sync
  useEffect(() => { localEventsRef.current = localEvents; }, [localEvents]);

  // Initialize from server
  useEffect(() => {
    if (call && !initRef.current) {
      setTrimStart(call.start_time_seconds ?? 0);
      if (call.end_time_seconds > 0) setTrimEnd(call.end_time_seconds);
      if (call.playback_rate > 0) setSpeed(call.playback_rate);
      if (call.video_zoom > 0) setVideoZoom(call.video_zoom);
      setVideoX(call.video_x ?? 0);
      setVideoY(call.video_y ?? 0);
      initRef.current = true;
    }
  }, [call]);

  useEffect(() => {
    if (rawEvents.length > 0 && localEvents.length === 0) setLocalEvents([...rawEvents]);
  }, [rawEvents, localEvents.length]);

  useEffect(() => {
    if (duration > 0 && trimEnd === 0) {
      setTrimEnd(call?.end_time_seconds && call.end_time_seconds > 0 ? call.end_time_seconds : duration);
    }
  }, [duration, call, trimEnd]);

  // Video properties sync
  useEffect(() => { if (videoRef.current) videoRef.current.volume = muted ? 0 : volume; }, [volume, muted]);
  useEffect(() => { if (videoRef.current) videoRef.current.playbackRate = speed; }, [speed]);

  // Trim enforcement during playback
  useEffect(() => {
    const video = videoRef.current;
    if (!video || duration === 0) return;
    const handler = () => {
      if (trimEnd > 0 && video.currentTime >= trimEnd) {
        video.pause(); video.currentTime = trimStart;
        setIsPlaying(false); setCurrentTime(trimStart);
        cancelAnimationFrame(rafRef.current);
      }
    };
    video.addEventListener('timeupdate', handler);
    return () => video.removeEventListener('timeupdate', handler);
  }, [trimStart, trimEnd, duration]);

  // Auto-scroll timeline to follow playhead
  useEffect(() => {
    if (!isPlaying || !timelineRef.current) return;
    const el = timelineRef.current;
    const x = currentTime * zoom;
    if (x > el.scrollLeft + el.clientWidth * 0.75) {
      el.scrollLeft = x - el.clientWidth * 0.2;
    }
  }, [currentTime, zoom, isPlaying]);

  const startRAF = useCallback(() => {
    const tick = () => {
      if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);
  const stopRAF = useCallback(() => cancelAnimationFrame(rafRef.current), []);

  const seekTo = useCallback((t: number) => {
    const v = videoRef.current;
    if (!v) return;
    const clamped = Math.max(0, Math.min(trimEnd || duration, t));
    v.currentTime = clamped;
    setCurrentTime(clamped);
  }, [trimEnd, duration]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isPlaying) {
      v.pause(); stopRAF(); setIsPlaying(false);
    } else {
      if (v.currentTime >= trimEnd) v.currentTime = trimStart;
      v.play().then(() => { startRAF(); setIsPlaying(true); }).catch(() => {});
    }
  }, [isPlaying, trimStart, trimEnd, startRAF, stopRAF]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
      if (e.code === 'ArrowLeft') { e.preventDefault(); seekTo(currentTime - (e.shiftKey ? 5 : 1)); }
      if (e.code === 'ArrowRight') { e.preventDefault(); seekTo(currentTime + (e.shiftKey ? 5 : 1)); }
      if (e.code === 'Home') { e.preventDefault(); seekTo(trimStart); }
      if (e.code === 'End') { e.preventDefault(); seekTo(trimEnd); }
      if (e.code === 'Escape') setSelectedId(null);
      if ((e.code === 'Delete' || e.code === 'Backspace') && selectedId) {
        e.preventDefault();
        removeEvent(selectedId);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [togglePlay, seekTo, currentTime, trimStart, trimEnd, selectedId]);

  // Zoom via wheel
  const handleWheelZoom = useCallback((e: React.WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    setZoom(z => Math.max(8, Math.min(200, z + (e.deltaY < 0 ? 8 : -8))));
  }, []);

  const getTime = useCallback((clientX: number) => {
    const el = timelineRef.current;
    if (!el) return 0;
    const { left } = el.getBoundingClientRect();
    return Math.max(0, (clientX - left + el.scrollLeft) / zoom);
  }, [zoom]);

  const onDragStart = useCallback((
    e: React.MouseEvent, kind: DragKind, eventId?: string, startVal?: number,
  ) => {
    e.preventDefault(); e.stopPropagation();
    dragRef.current = { kind, startX: e.clientX, startVal: startVal ?? currentTime, eventId };

    const onMove = (me: MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const dt = (me.clientX - d.startX) / zoom;
      const raw = d.startVal + dt;
      const nv = snapToGrid && (d.kind === 'event' || d.kind === 'playhead') ? Math.round(raw) : raw;

      if (d.kind === 'playhead') seekTo(Math.max(0, nv));
      else if (d.kind === 'trimStart') setTrimStart(Math.max(0, Math.min(nv, trimEnd - 0.5)));
      else if (d.kind === 'trimEnd') setTrimEnd(Math.min(duration, Math.max(nv, trimStart + 0.5)));
      else if (d.kind === 'event' && d.eventId) {
        const snapped = Math.max(0, snapToGrid ? Math.round(nv) : nv);
        setLocalEvents(prev => prev.map(ev => ev.id === d.eventId ? { ...ev, trigger_at_seconds: snapped } : ev));
      } else if (d.kind === 'eventDuration' && d.eventId) {
        const newDur = Math.max(0, snapToGrid ? Math.round(raw) : Math.round(raw * 10) / 10);
        setLocalEvents(prev => prev.map(ev => ev.id === d.eventId ? { ...ev, duration_seconds: newDur } : ev));
      }
    };

    const onUp = () => {
      const d = dragRef.current;
      if ((d?.kind === 'event' || d?.kind === 'eventDuration') && d.eventId) {
        const ev = localEventsRef.current.find(e => e.id === d.eventId);
        if (ev) updateEvent(d.eventId, ev as UpsertEventPayload).catch(() => {});
      }
      dragRef.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [zoom, currentTime, seekTo, trimEnd, trimStart, duration, snapToGrid]);

  const handleTimelineClick = useCallback((e: React.MouseEvent) => {
    if (dragRef.current) return;
    seekTo(getTime(e.clientX));
  }, [getTime, seekTo]);

  const addEvent = async (type: string) => {
    const payload = defaultPayload(type, currentTime);
    try {
      const created = await createEvent(id!, payload);
      setLocalEvents(prev => [...prev, created]);
      setSelectedId(created.id);
      qc.invalidateQueries({ queryKey: ['events', id] });
    } catch { /* ignore */ }
  };

  const removeEvent = async (eventId: string) => {
    try {
      await deleteEvent(eventId);
      setLocalEvents(prev => prev.filter(e => e.id !== eventId));
      if (selectedId === eventId) setSelectedId(null);
      qc.invalidateQueries({ queryKey: ['events', id] });
    } catch { /* ignore */ }
  };

  const updateLocalEvent = useCallback((field: string, val: string | number | Record<string, string>) => {
    setLocalEvents(prev => {
      const updated = prev.map(ev => ev.id === selectedId ? { ...ev, [field]: val } : ev);
      const updatedEv = updated.find(e => e.id === selectedId);
      if (updatedEv) {
        const key = selectedId!;
        clearTimeout(pendingSaveRef.current[key]);
        pendingSaveRef.current[key] = setTimeout(() => {
          updateEvent(key, updatedEv as UpsertEventPayload).catch(() => {});
        }, 500);
      }
      return updated;
    });
  }, [selectedId]);

  const saveMutation = useMutation({
    mutationFn: () => updateCall(id!, {
      start_time_seconds: Math.round(trimStart),
      end_time_seconds: Math.round(trimEnd),
      playback_rate: speed,
      video_zoom: videoZoom,
      video_x: videoX,
      video_y: videoY,
    }),
    onMutate: () => setSaveTrimStatus('saving'),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['call', id] }); setSaveTrimStatus('saved'); setTimeout(() => setSaveTrimStatus('idle'), 2000); },
    onError: () => setSaveTrimStatus('idle'),
  });

  // Computed values
  const eventRows = useMemo(() => assignRows(localEvents), [localEvents]);
  const rowValues = Object.values(eventRows);
  const numEventRows = rowValues.length > 0 ? Math.max(...rowValues) + 1 : 1;
  const TIMELINE_H = 24 + 40 + 12 + numEventRows * 28 + 8;
  const totalWidth = Math.max((duration + 4) * zoom, 600);

  const selectedEvent = localEvents.find(e => e.id === selectedId) ?? null;

  // Live event: which event is active at currentTime (regardless of selection)
  const liveEventAtTime = useMemo(() => {
    for (const ev of localEvents) {
      const end = ev.duration_seconds > 0 ? ev.trigger_at_seconds + ev.duration_seconds : ev.trigger_at_seconds + 8;
      if (currentTime >= ev.trigger_at_seconds && currentTime < end) return ev;
    }
    return null;
  }, [localEvents, currentTime]);

  const liveEventId = liveEventAtTime?.id ?? null;

  if (!call || !publicData) {
    return (
      <div className="fixed inset-0 bg-[#111] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#1a1a1a] flex flex-col text-white overflow-hidden" style={{ fontFamily: 'system-ui, sans-serif' }}>

      {/* ── Header ── */}
      <header className="flex items-center justify-between px-4 py-2 bg-[#0d0d0d] border-b border-white/10 shrink-0 gap-3">
        <Link to={`/calls/${id}/edit`}
          className="flex items-center gap-1 text-gray-400 hover:text-white text-sm transition-colors shrink-0">
          <ChevronLeft className="w-4 h-4" />Voltar
        </Link>

        <h1 className="text-sm font-semibold truncate text-white/80 flex-1 text-center">{call.title}</h1>

        <div className="flex items-center gap-2 shrink-0">
          {/* Preview toggle */}
          <button onClick={() => setPreviewMode(v => !v)}
            title={previewMode ? 'Sair do modo preview' : 'Modo preview'}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${previewMode ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>
            {previewMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {previewMode ? 'Editar' : 'Preview'}
          </button>

          {/* Snap toggle */}
          <button onClick={() => setSnapToGrid(v => !v)}
            title="Snap ao grid"
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${snapToGrid ? 'bg-blue-500/15 text-blue-400' : 'text-gray-600 hover:text-white'}`}>
            Snap {snapToGrid ? 'On' : 'Off'}
          </button>

          {/* Save trim */}
          <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}
            className="flex items-center gap-1.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors">
            {saveTrimStatus === 'saved' ? <><Check className="w-3.5 h-3.5" />Salvo</> :
             saveTrimStatus === 'saving' ? 'Salvando…' :
             <><Check className="w-3.5 h-3.5" />Salvar corte</>}
          </button>
        </div>
      </header>

      {/* ── 3-column main area ── */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* Left: Layers */}
        {!previewMode && (
          <div className="w-52 bg-[#141414] border-r border-white/10 flex flex-col overflow-hidden shrink-0">
            <LayersPanel
              events={localEvents}
              selectedId={selectedId}
              activeId={liveEventId}
              onSelect={setSelectedId}
              onAdd={addEvent}
              onDelete={removeEvent}
            />
          </div>
        )}

        {/* Center: Phone preview */}
        <div className="flex-1 flex flex-col items-center justify-center bg-[#0d0d0d] overflow-hidden gap-4 relative">
          <PhoneFrame
            videoRef={videoRef}
            publicData={publicData}
            currentTime={currentTime}
            activeEvent={selectedEvent}
            liveEvent={!selectedEvent ? liveEventAtTime : null}
            onMetadata={d => { setDuration(d); if (trimEnd === 0) setTrimEnd(d); }}
            previewMode={previewMode}
            videoZoom={videoZoom}
            videoX={videoX}
            videoY={videoY}
          />
          {/* Keyboard hint */}
          {!previewMode && (
            <p className="absolute bottom-3 text-[10px] text-white/20">
              Space · ← → Seek · Del Remove · Esc Deselect
            </p>
          )}
        </div>

        {/* Right: Event properties */}
        {!previewMode && (
          <div className="w-64 bg-[#141414] border-l border-white/10 flex flex-col overflow-hidden shrink-0">
            <EventPropsPanel
              event={selectedEvent}
              onChange={updateLocalEvent}
              onDelete={() => selectedId && removeEvent(selectedId)}
            />
          </div>
        )}
      </div>

      {/* ── Transport bar ── */}
      {!previewMode && (
        <div className="flex items-center gap-2 px-4 py-2 bg-[#0d0d0d] border-t border-b border-white/10 shrink-0">
          <button onClick={() => seekTo(trimStart)} className="text-gray-500 hover:text-white transition-colors" title="Início (Home)">
            <SkipBack className="w-4 h-4" />
          </button>
          <button onClick={togglePlay}
            className="w-8 h-8 rounded-full bg-green-600 hover:bg-green-500 flex items-center justify-center transition-colors shrink-0">
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
          </button>
          <span className="text-xs font-mono text-gray-300 tabular-nums min-w-[96px]">
            {fmt(currentTime)} / {fmt(trimEnd || duration)}
          </span>

          {/* Trim display */}
          <div className="flex items-center gap-1.5 bg-[#1a1a1a] border border-white/10 rounded-lg px-2 py-1 text-xs text-gray-500">
            <Scissors className="w-3 h-3 text-[#25d366]" />
            <input type="number" min={0} step={1} value={Math.round(trimStart)}
              onChange={e => setTrimStart(Math.max(0, Math.min(Number(e.target.value), trimEnd - 1)))}
              className="w-10 bg-transparent text-[#25d366] font-mono text-center focus:outline-none" />
            <span className="text-gray-700">→</span>
            <input type="number" min={0} step={1} value={Math.round(trimEnd)}
              onChange={e => setTrimEnd(Math.min(duration, Math.max(Number(e.target.value), trimStart + 1)))}
              className="w-10 bg-transparent text-[#25d366] font-mono text-center focus:outline-none" />
          </div>

          {/* Speed */}
          <select value={speed} onChange={e => setSpeed(Number(e.target.value))}
            className="bg-[#1a1a1a] border border-white/10 rounded-lg px-2 py-1 text-xs text-gray-400 focus:outline-none cursor-pointer">
            {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2].map(s => (
              <option key={s} value={s}>{s}x</option>
            ))}
          </select>

          {/* Video zoom / position */}
          <div className="flex items-center gap-1.5 bg-[#1a1a1a] border border-white/10 rounded-lg px-2 py-1 text-xs text-gray-500">
            <span className="text-[10px] text-gray-600 shrink-0">Zoom</span>
            <input type="range" min={1} max={3} step={0.05} value={videoZoom}
              onChange={e => setVideoZoom(Number(e.target.value))}
              className="w-16 accent-green-500" title={`${Math.round(videoZoom * 100)}%`} />
            <span className="text-[10px] text-gray-600 tabular-nums w-8">{Math.round(videoZoom * 100)}%</span>
          </div>
          <div className="flex items-center gap-1.5 bg-[#1a1a1a] border border-white/10 rounded-lg px-2 py-1 text-xs text-gray-500">
            <span className="text-[10px] text-gray-600 shrink-0">X</span>
            <input type="range" min={-50} max={50} step={1} value={videoX}
              onChange={e => setVideoX(Number(e.target.value))}
              className="w-14 accent-blue-500" />
            <span className="text-[10px] text-gray-600 shrink-0">Y</span>
            <input type="range" min={-50} max={50} step={1} value={videoY}
              onChange={e => setVideoY(Number(e.target.value))}
              className="w-14 accent-blue-500" />
            <button onClick={() => { setVideoX(0); setVideoY(0); setVideoZoom(1); }}
              className="text-[10px] text-gray-600 hover:text-white px-1" title="Resetar">↺</button>
          </div>

          {/* Volume */}
          <button onClick={() => setMuted(v => !v)} className="text-gray-500 hover:text-white transition-colors shrink-0">
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <input type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume}
            onChange={e => { setVolume(Number(e.target.value)); setMuted(false); }}
            className="w-16 accent-green-500" />

          <div className="flex-1" />

          {/* Zoom */}
          <div className="flex items-center gap-1">
            <button onClick={() => setZoom(z => Math.max(8, z - 8))} className="text-gray-500 hover:text-white p-1">
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <input type="range" min={8} max={200} step={4} value={zoom}
              onChange={e => setZoom(Number(e.target.value))}
              className="w-24 accent-green-500" />
            <button onClick={() => setZoom(z => Math.min(200, z + 8))} className="text-gray-500 hover:text-white p-1">
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] text-gray-600 w-12 text-right tabular-nums">{zoom}px/s</span>
          </div>
        </div>
      )}

      {/* ── Timeline ── */}
      {!previewMode && (
        <div
          ref={timelineRef}
          className="shrink-0 bg-[#0a0a0a] overflow-x-auto overflow-y-hidden select-none"
          style={{ height: TIMELINE_H }}
          onClick={handleTimelineClick}
          onWheel={handleWheelZoom}
        >
          <div className="relative" style={{ width: totalWidth, height: '100%' }}>
            <Ruler duration={duration} zoom={zoom} currentTime={currentTime} onSeek={seekTo} />
            {duration > 0 && (
              <VideoTrack duration={duration} trimStart={trimStart} trimEnd={trimEnd}
                zoom={zoom} onDragStart={onDragStart} />
            )}
            <EventsTrack
              events={localEvents} zoom={zoom} selectedId={selectedId} activeId={liveEventId}
              rows={eventRows} numRows={numEventRows}
              onSelect={id => { setSelectedId(prev => prev === id ? null : id); }}
              onDragStart={onDragStart}
            />
            {/* Playhead */}
            <div className="absolute top-0 bottom-0 z-20 pointer-events-none"
              style={{ left: currentTime * zoom }}>
              <div className="absolute top-0 w-px h-full bg-red-500 opacity-90" />
              <div className="absolute -top-0 -left-2 w-4 h-4 pointer-events-auto cursor-ew-resize z-30"
                onMouseDown={e => { e.stopPropagation(); onDragStart(e, 'playhead', undefined, currentTime); }}>
                <div className="w-3 h-3 bg-red-500 rotate-45 ml-0.5 shadow-lg" />
              </div>
              {/* Time tooltip */}
              <div className="absolute top-1 left-2 bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded font-mono whitespace-nowrap pointer-events-none">
                {fmt(currentTime)}
              </div>
            </div>
            {/* Trim overlay (darkened areas outside trim) */}
            {trimStart > 0 && (
              <div className="absolute top-0 bottom-0 bg-black/40 pointer-events-none z-10"
                style={{ left: 0, width: trimStart * zoom }} />
            )}
            {trimEnd < duration && (
              <div className="absolute top-0 bottom-0 bg-black/40 pointer-events-none z-10"
                style={{ left: trimEnd * zoom, right: 0 }} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
