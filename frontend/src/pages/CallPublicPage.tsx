import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Mic, MicOff,
  Video, VideoOff,
  PhoneOff,
  Volume2, VolumeOff,
  SmilePlus,
  Phone,
} from 'lucide-react';
import { getPublicCall, type PublicCall, type PublicEvent } from '../services/callService';
import { EventOverlay } from '../components/EventOverlay';
import CreditsOverlay from '../components/CreditsOverlay';
import { trackVisit, updateWatched } from '../services/visitService';
import { useTrackingScripts } from '../hooks/useTrackingScripts';

/* ─── Status bar fake (hora, sinal, bateria) ───────────────────────────── */

/* ─── Bolha de notificação falsa ────────────────────────────────────────── */

type FakeNotif = { id: number; text: string };

function FakeNotifBubble({ notif, onHide }: { notif: FakeNotif; onHide: (id: number) => void }) {
  useEffect(() => {
    const t = setTimeout(() => onHide(notif.id), 3500);
    return () => clearTimeout(t);
  }, [notif.id, onHide]);

  return (
    <div className="bg-[#1f2c34] border border-white/10 rounded-2xl px-4 py-3 shadow-2xl flex items-center gap-3 animate-slide-in-top max-w-xs">
      <div className="w-8 h-8 rounded-full bg-[#25d366] flex items-center justify-center shrink-0">
        <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm.029 18.88a9.947 9.947 0 01-5.031-1.36l-.361-.214-3.742.981.999-3.648-.235-.374A9.86 9.86 0 012.1 12.045C2.1 6.545 6.545 2.1 12.045 2.1c2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.898 6.988c-.003 5.45-4.437 9.894-9.902 9.894z"/>
        </svg>
      </div>
      <div>
        <p className="text-[#25d366] text-xs font-semibold">WhatsApp</p>
        <p className="text-white text-sm leading-tight">{notif.text}</p>
      </div>
    </div>
  );
}

/* ─── Emoji picker simples ──────────────────────────────────────────────── */

const EMOJIS = ['❤️', '😂', '😮', '😢', '👍', '🙏', '🔥', '🎉', '👏', '💯'];

function EmojiPicker({ onPick, onClose }: { onPick: (e: string) => void; onClose: () => void }) {
  useEffect(() => {
    const handler = () => onClose();
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [onClose]);

  return (
    <div
      className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-[#1f2c34] rounded-2xl p-3 grid grid-cols-5 gap-2 shadow-2xl border border-white/10"
      onClick={(e) => e.stopPropagation()}
    >
      {EMOJIS.map((em) => (
        <button
          key={em}
          className="text-2xl w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors"
          onClick={() => { onPick(em); onClose(); }}
        >
          {em}
        </button>
      ))}
    </div>
  );
}

/* ─── Reação flutuante ──────────────────────────────────────────────────── */

type FloatingEmoji = { id: number; emoji: string; x: number };

function FloatingReaction({ emoji, x }: { emoji: string; x: number }) {
  return (
    <div
      className="absolute bottom-32 text-4xl pointer-events-none animate-bounce"
      style={{ left: `${x}%`, animationDuration: '0.6s' }}
    >
      {emoji}
    </div>
  );
}

/* ─── Paywall de continuação ────────────────────────────────────────────── */

function EntryPaywall({ displayName, photoUrl, priceCents, onPay }: {
  displayName: string;
  photoUrl?: string;
  priceCents: number;
  onPay: () => void;
}) {
  const brl = (priceCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{
        backgroundImage: 'url(/whatsapp-bg.webp)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: '#111b21',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Overlay escuro */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Header estilo WhatsApp */}
      <div className="relative z-10 bg-[#075e54]/90 px-4 pt-10 pb-4 flex items-center gap-3 backdrop-blur-sm">
        <div className="w-8 h-8 rounded-full bg-[#25d366] flex items-center justify-center shrink-0">
          <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm.029 18.88a9.947 9.947 0 01-5.031-1.36l-.361-.214-3.742.981.999-3.648-.235-.374A9.86 9.86 0 012.1 12.045C2.1 6.545 6.545 2.1 12.045 2.1c2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.898 6.988c-.003 5.45-4.437 9.894-9.902 9.894z"/>
          </svg>
        </div>
        <div>
          <p className="text-white font-semibold text-sm">{displayName}</p>
          <p className="text-[#b2dfdb] text-xs">Videochamada em andamento…</p>
        </div>
      </div>

      {/* Conteúdo central */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 gap-6">

        {/* Avatar com anel pulsante */}
        <div className="relative flex items-center justify-center">
          <div className="absolute w-28 h-28 rounded-full border border-[#25d366]/30 animate-ping" style={{ animationDuration: '2.5s' }} />
          <div className="absolute w-24 h-24 rounded-full border border-[#25d366]/20 animate-ping" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }} />
          <div className="w-20 h-20 rounded-full overflow-hidden bg-[#2a3942] border-2 border-[#25d366]/40 shadow-2xl z-10">
            {photoUrl ? (
              <img src={photoUrl} alt={displayName} className="w-full h-full object-cover" draggable={false} />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="#8696a0" className="w-10 h-10">
                  <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* Texto principal */}
        <div className="text-center space-y-2">
          <p className="text-white text-xl font-bold leading-tight">
            Quer continuar esse momento?
          </p>
          <p className="text-gray-300 text-sm leading-relaxed">
            Pague <span className="text-[#25d366] font-bold">{brl}</span> e mantenha a videochamada com <span className="font-semibold text-white">{displayName}</span> ativa.
          </p>
        </div>

        {/* Card de pagamento */}
        <div className="w-full max-w-sm bg-[#1f2c34]/90 rounded-2xl overflow-hidden border border-white/10 shadow-2xl backdrop-blur-sm">
          <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
            <span className="text-gray-400 text-sm">Acesso à chamada</span>
            <span className="text-white font-semibold text-sm">{brl}</span>
          </div>
          <div className="px-5 py-4 flex items-center justify-between">
            <span className="text-gray-300 text-sm font-medium">Total</span>
            <span className="text-[#25d366] font-bold text-lg">{brl}</span>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={onPay}
          className="w-full max-w-sm py-4 rounded-2xl font-bold text-white text-base shadow-lg transition-all active:scale-95"
          style={{
            background: 'linear-gradient(135deg,#25d366,#128c3e)',
            boxShadow: '0 4px 20px rgba(37,211,102,0.4)',
          }}
        >
          Pagar {brl} via PIX agora
        </button>

        <div className="flex items-center gap-1.5">
          <svg viewBox="0 0 24 24" fill="#25d366" className="w-3.5 h-3.5 shrink-0">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
          </svg>
          <span className="text-gray-600 text-xs">Criptografia de ponta a ponta</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Ringtone real com fallback Web Audio API ──────────────────────────── */
// outgoing = lead ligando para a modelo  → /ring-outgoing.mp3
// incoming = modelo ligando para o lead  → /ring-incoming.mp3

function playSynthetic(mode: 'outgoing' | 'incoming'): (() => void) {
  // outgoing: toque de discar (bip longo espaçado)
  // incoming: melodia de chamada chegando (4 notas)
  const ctx = new AudioContext();

  const outgoingPattern = [
    { freq: 425, start: 0.0, dur: 1.0 },
    { freq: 425, start: 2.0, dur: 1.0 },
    { freq: 425, start: 4.0, dur: 1.0 },
  ];
  const incomingPattern = [
    { freq: 880, start: 0.00, dur: 0.10 },
    { freq: 698, start: 0.12, dur: 0.10 },
    { freq: 880, start: 0.24, dur: 0.10 },
    { freq: 622, start: 0.36, dur: 0.28 },
  ];
  const pattern = mode === 'outgoing' ? outgoingPattern : incomingPattern;
  const cycleDuration = mode === 'outgoing' ? 6000 : 3000;

  let timerRef: ReturnType<typeof setTimeout> | null = null;

  function playBurst() {
    if (ctx.state === 'closed') return;
    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.22;
    masterGain.connect(ctx.destination);
    for (const note of pattern) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = note.freq;
      g.gain.setValueAtTime(0, ctx.currentTime + note.start);
      g.gain.linearRampToValueAtTime(1, ctx.currentTime + note.start + 0.015);
      g.gain.setValueAtTime(1, ctx.currentTime + note.start + note.dur - 0.02);
      g.gain.linearRampToValueAtTime(0, ctx.currentTime + note.start + note.dur);
      osc.connect(g);
      g.connect(masterGain);
      osc.start(ctx.currentTime + note.start);
      osc.stop(ctx.currentTime + note.start + note.dur + 0.01);
    }
    timerRef = setTimeout(playBurst, cycleDuration);
  }
  playBurst();

  return () => {
    if (timerRef) clearTimeout(timerRef);
    ctx.close();
  };
}

function useRingtone(active: boolean, mode: 'outgoing' | 'incoming') {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const synthStopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!active) {
      audioRef.current?.pause();
      audioRef.current = null;
      synthStopRef.current?.();
      synthStopRef.current = null;
      return;
    }

    const src = mode === 'outgoing' ? '/ring-outgoing.mp3' : '/ring-incoming.mp3';
    const audio = new Audio(src);
    audio.loop = true;
    audio.volume = 0.8;
    audioRef.current = audio;

    audio.play().catch(() => {
      // browser bloqueou — usa sintetizador como fallback
      audioRef.current = null;
      synthStopRef.current = playSynthetic(mode);
    });

    return () => {
      audio.pause();
      audio.currentTime = 0;
      audioRef.current = null;
      synthStopRef.current?.();
      synthStopRef.current = null;
    };
  }, [active, mode]);
}

/* ─── Tela de chamada saindo — lead está ligando (outgoing) ─────────────── */

function OutgoingScreen({ call, onCancel }: { call: PublicCall; onCancel: () => void }) {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const id = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 500);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-between py-16 select-none"
      style={{
        backgroundImage: 'url(/whatsapp-bg.webp)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: '#111b21',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div className="absolute inset-0 bg-black/50" />

      {/* Topo */}
      <div className="relative z-10 flex flex-col items-center gap-1 pt-4">
        <p className="text-white/50 text-sm tracking-wide">Chamada de vídeo WhatsApp</p>
        <div className="flex items-center gap-1.5 mt-1">
          <svg viewBox="0 0 20 20" fill="#25d366" className="w-3.5 h-3.5">
            <path d="M2 5a2 2 0 012-2h8a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm14 1.236l3.447-1.724A1 1 0 0121 5.382v9.236a1 1 0 01-1.447.894L16 13.764V6.236z"/>
          </svg>
          <span className="text-[#25d366] text-xs font-medium">WhatsApp</span>
        </div>
      </div>

      {/* Centro */}
      <div className="relative z-10 flex flex-col items-center gap-5">
        <div className="relative flex items-center justify-center">
          {/* Anéis pulsantes */}
          <div className="absolute w-44 h-44 rounded-full border border-white/10 animate-ping" style={{ animationDuration: '2s' }} />
          <div className="absolute w-36 h-36 rounded-full border border-white/15 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.4s' }} />
          <div className="w-28 h-28 rounded-full overflow-hidden bg-[#2a3942] border-2 border-white/20 shadow-2xl z-10">
            {call.contact_photo_url ? (
              <img src={call.contact_photo_url} alt={call.display_name} className="w-full h-full object-cover" draggable={false} />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="#8696a0" className="w-14 h-14">
                  <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                </svg>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <p className="text-white text-2xl font-semibold tracking-wide">{call.display_name}</p>
          <p className="text-white/50 text-sm">Chamando{dots}</p>
        </div>
      </div>

      {/* Cancelar */}
      <div className="relative z-10 flex flex-col items-center gap-2">
        <button
          onClick={onCancel}
          className="w-16 h-16 rounded-full bg-[#f02849] flex items-center justify-center shadow-lg active:scale-95 transition-transform"
        >
          <PhoneOff className="w-7 h-7 text-white" />
        </button>
        <span className="text-white/50 text-xs">Cancelar</span>
      </div>
    </div>
  );
}

/* ─── Tela de chamada chegando (estilo WhatsApp) ────────────────────────── */

function RingingScreen({ call, onAnswer }: { call: PublicCall; onAnswer: () => void }) {
  const [pulse, setPulse] = useState(0);

  // Anima os anéis pulsantes
  useEffect(() => {
    const id = setInterval(() => setPulse(p => p + 1), 800);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-between py-16 select-none"
      style={{
        backgroundImage: 'url(/whatsapp-bg.webp)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: '#111b21',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Topo */}
      <div className="flex flex-col items-center gap-1 pt-4">
        <p className="text-white/50 text-sm tracking-wide">Chamada de vídeo chegando</p>
        <div className="flex items-center gap-1.5 mt-1">
          <svg viewBox="0 0 20 20" fill="#25d366" className="w-3.5 h-3.5">
            <path d="M2 5a2 2 0 012-2h8a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm14 1.236l3.447-1.724A1 1 0 0121 5.382v9.236a1 1 0 01-1.447.894L16 13.764V6.236z"/>
          </svg>
          <span className="text-[#25d366] text-xs font-medium">WhatsApp</span>
        </div>
      </div>

      {/* Centro — avatar + nome */}
      <div className="flex flex-col items-center gap-5">
        {/* Anéis pulsantes */}
        <div className="relative flex items-center justify-center">
          {/* Anel externo */}
          <div
            className="absolute rounded-full border border-white/10 transition-all duration-700"
            style={{
              width: pulse % 2 === 0 ? 180 : 168,
              height: pulse % 2 === 0 ? 180 : 168,
              opacity: pulse % 2 === 0 ? 0.25 : 0.15,
            }}
          />
          {/* Anel médio */}
          <div
            className="absolute rounded-full border border-white/15 transition-all duration-700"
            style={{
              width: pulse % 2 === 0 ? 148 : 140,
              height: pulse % 2 === 0 ? 148 : 140,
              opacity: pulse % 2 === 0 ? 0.35 : 0.2,
            }}
          />
          {/* Foto do contato */}
          <div className="w-28 h-28 rounded-full overflow-hidden bg-[#2a3942] border-2 border-white/20 shadow-2xl z-10">
            {call.contact_photo_url ? (
              <img
                src={call.contact_photo_url}
                alt={call.display_name}
                className="w-full h-full object-cover"
                draggable={false}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="#8696a0" className="w-14 h-14">
                  <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* Nome e status */}
        <div className="flex flex-col items-center gap-1">
          <p className="text-white text-2xl font-semibold tracking-wide">{call.display_name}</p>
          <p className="text-white/50 text-sm">Chamada de vídeo WhatsApp…</p>
        </div>
      </div>

      {/* Botões: recusar / atender */}
      <div className="flex items-center justify-center gap-20">
        {/* Recusar */}
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={() => window.history.back()}
            className="w-16 h-16 rounded-full bg-[#f02849] flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          >
            <PhoneOff className="w-7 h-7 text-white" />
          </button>
          <span className="text-white/50 text-xs">Recusar</span>
        </div>

        {/* Atender */}
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={onAnswer}
            className="w-16 h-16 rounded-full bg-[#00a884] flex items-center justify-center shadow-lg active:scale-95 transition-transform"
            style={{ boxShadow: '0 0 20px #00a88455' }}
          >
            <Phone className="w-7 h-7 text-white" />
          </button>
          <span className="text-white/50 text-xs">Atender</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Timer ─────────────────────────────────────────────────────────────── */

function useCallTimer(running: boolean) {
  const [elapsed, setElapsed] = useState(0);
  const start = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;
    start.current = Date.now() - elapsed * 1000;
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start.current!) / 1000));
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

/* ─── Página principal ──────────────────────────────────────────────────── */

type State = 'loading' | 'ringing' | 'call' | 'error' | 'expired';

const RING_DURATION_MS = 3000;

export default function CallPublicPage() {
  const { slug } = useParams<{ slug: string }>();

  const [state, setState] = useState<State>('loading');
  const [call, setCall] = useState<PublicCall | null>(null);
  const [playing, setPlaying] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [camOff, setCamOff] = useState(true);
  const [speakerMuted, setSpeakerMuted] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([]);
  const emojiCounterRef = useRef(0);
  const [activeEvent, setActiveEvent] = useState<PublicEvent | null>(null);
  const [callEnded, setCallEnded] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(false);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [fakeNotifs, setFakeNotifs] = useState<FakeNotif[]>([]);
  const notifCounterRef = useRef(0);
  const [paymentDone, setPaymentDone] = useState(() =>
    slug ? localStorage.getItem(`callprivada_paid_${slug}`) === '1' : false
  );
  // Persiste que o reconnect_paywall foi disparado nesta chamada
  const [paywallBlocked, setPaywallBlocked] = useState(() =>
    slug ? localStorage.getItem(`callprivada_paywall_${slug}`) === '1' : false
  );
  // Persiste o ID do fake_billing / video_lock / phone_block / tip_jar ativo para restaurar no refresh
  const [pendingBillingId, setPendingBillingId] = useState(() =>
    slug ? localStorage.getItem(`callprivada_billing_${slug}`) ?? null : null
  );
  const [creditsSeconds, setCreditsSeconds] = useState(0);
  const [creditsGranted, setCreditsGranted] = useState(false);
  useTrackingScripts(call?.tracking);

  // Draggable self-cam
  const CAM_W = 96, CAM_H = 144;
  const [camPos, setCamPos] = useState({ x: -1, y: -1 }); // -1 = use default top-right
  const camDragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  function onCamPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    camDragRef.current = { startX: e.clientX, startY: e.clientY, origX: rect.left, origY: rect.top };
  }
  function onCamPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!camDragRef.current) return;
    const dx = e.clientX - camDragRef.current.startX;
    const dy = e.clientY - camDragRef.current.startY;
    const newX = Math.max(0, Math.min(window.innerWidth - CAM_W, camDragRef.current.origX + dx));
    const newY = Math.max(0, Math.min(window.innerHeight - CAM_H, camDragRef.current.origY + dy));
    setCamPos({ x: newX, y: newY });
  }
  function onCamPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.releasePointerCapture(e.pointerId);
    camDragRef.current = null;
  }
  const autoAnswerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const selfVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const firedEvents = useRef<Set<string>>(new Set());
  const callRef = useRef<PublicCall | null>(null);
  const timer = useCallTimer(playing);
  const visitIdRef = useRef<string | null>(null);
  const watchedRef = useRef(0);
  const watchedAccRef = useRef(0);   // total acumulado antes da volta atual do loop
  const lastTimeRef = useRef(0);     // último currentTime visto pelo checkEvents

  // outgoing = lead ligando para a modelo; incoming = modelo ligando para o lead
  useRingtone(state === 'ringing', call?.call_mode === 'outgoing' ? 'outgoing' : 'incoming');

  /* Mantém callRef sincronizado para evitar closure stale nos intervals */
  useEffect(() => { callRef.current = call; }, [call]);

  /* Carrega dados da chamada e registra visita */
  useEffect(() => {
    if (!slug) return;
    getPublicCall(slug)
      .then((data) => {
        setCall(data);
        setState('ringing');
        trackVisit(slug, { referrer: document.referrer || undefined })
          .then((id) => { visitIdRef.current = id; })
          .catch(() => {});
      })
      .catch((err: { response?: { status?: number } }) => {
        if (err?.response?.status === 410 || err?.response?.status === 404) {
          setState('expired');
        } else {
          setState('error');
        }
      });
  }, [slug]);

  /* Auto-atende após RING_DURATION_MS — apenas no modo outgoing (lead ligando) */
  useEffect(() => {
    if (state !== 'ringing' || !call) return;
    if (call.call_mode === 'outgoing') {
      autoAnswerRef.current = setTimeout(() => {
        handleAnswer();
      }, RING_DURATION_MS);
    }
    return () => {
      if (autoAnswerRef.current) clearTimeout(autoAnswerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, call]);

  function handleAnswer() {
    if (autoAnswerRef.current) clearTimeout(autoAnswerRef.current);
    setState('call');
  }

  /* Se paywall já foi disparado antes, bloqueia imediatamente ao entrar em call */
  useEffect(() => {
    if (state !== 'call' || !call || !paywallBlocked) return;
    const evt = call.events?.find(e => e.type === 'reconnect_paywall');
    if (evt) {
      setActiveEvent(evt);
    }
    videoRef.current?.pause();
    setPlaying(false);
    // marca como disparado para não re-disparar via checkEvents
    if (evt) firedEvents.current.add(evt.id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, call]);

  /* Se havia um fake_billing ativo antes do refresh, restaura imediatamente */
  useEffect(() => {
    if (state !== 'call' || !call || !pendingBillingId) return;
    const BILLING_RESTORE_TYPES = ['fake_billing', 'video_lock', 'phone_block', 'tip_jar'];
    const evt = call.events?.find(e => e.id === pendingBillingId && BILLING_RESTORE_TYPES.includes(e.type));
    if (evt) {
      setActiveEvent(evt);
      firedEvents.current.add(evt.id);
    } else {
      // evento não existe mais — limpa
      if (slug) localStorage.removeItem(`callprivada_billing_${slug}`);
      setPendingBillingId(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, call]);

  /* Inicia o vídeo quando entra na tela de chamada */
  useEffect(() => {
    if (state !== 'call' || !call || !videoRef.current) return;
    const video = videoRef.current;

    // Trim: nunca usa loop nativo — controlamos manualmente para respeitar start/end
    video.loop = false;
    video.currentTime = call.start_time_seconds ?? 0;
    lastTimeRef.current = call.start_time_seconds ?? 0;
    watchedAccRef.current = 0;

    // Velocidade configurada no editor
    const rate = call.playback_rate > 0 ? call.playback_rate : 1;
    video.playbackRate = rate;

    video.play().then(() => setPlaying(true)).catch(() => {});

    const endTime = call.end_time_seconds > 0 ? call.end_time_seconds : Infinity;
    const startTime = call.start_time_seconds ?? 0;

    function loopBack() {
      // acumula o tempo assistido nesta volta antes de reiniciar
      const loopDuration = (endTime === Infinity ? (video.duration || 0) : endTime) - startTime;
      if (loopDuration > 0) watchedAccRef.current += loopDuration;
      // limpa eventos para que disparem novamente na próxima volta
      firedEvents.current.clear();
      video.currentTime = startTime;
      lastTimeRef.current = startTime;
      video.play().catch(() => {});
    }

    function onTimeUpdate() {
      if (video.currentTime >= endTime) {
        if (call!.loop_video) {
          loopBack();
        } else {
          video.pause();
          setPlaying(false);
          if (call!.end_call_redirect_url) {
            const url = call!.end_call_redirect_url;
            window.location.href = url.startsWith('http') ? url : window.location.origin + url;
            return;
          }
          setCallEnded(true);
        }
      }
    }

    function onEnded() {
      if (call!.loop_video) {
        loopBack();
      } else {
        setPlaying(false);
        if (call!.end_call_redirect_url) {
          const url = call!.end_call_redirect_url;
          window.location.href = url.startsWith('http') ? url : window.location.origin + url;
          return;
        }
        setCallEnded(true);
      }
    }

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('ended', onEnded);
    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('ended', onEnded);
    };
  }, [state, call]);

  /* Atualiza watched_seconds periodicamente e ao sair */
  useEffect(() => {
    const interval = setInterval(() => {
      if (visitIdRef.current && watchedRef.current > 0) {
        updateWatched(visitIdRef.current, watchedRef.current).catch(() => {});
      }
    }, 15_000);

    function onUnload() {
      if (visitIdRef.current && watchedRef.current > 0) {
        navigator.sendBeacon(
          `/api/v1/public/visits/${visitIdRef.current}`,
          JSON.stringify({ watched_seconds: watchedRef.current }),
        );
      }
    }

    window.addEventListener('beforeunload', onUnload);
    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', onUnload);
    };
  }, []);

  /* Disparo de eventos sincronizado pelo currentTime do vídeo */
  useEffect(() => {
    if (state !== 'call') return;
    if (!callRef.current?.events?.length) return;

    function checkEvents() {
      const video = videoRef.current;
      const currentCall = callRef.current;
      if (!video || !currentCall?.events?.length) return;

      const current = Math.floor(video.currentTime);

      // acumula tempo assistido de forma contínua (sem resetar no loop)
      const delta = current - lastTimeRef.current;
      if (delta > 0 && delta < 10) watchedAccRef.current += delta;
      lastTimeRef.current = current;
      watchedRef.current = watchedAccRef.current;

      for (const evt of currentCall.events) {
        if (!firedEvents.current.has(evt.id) && current >= evt.trigger_at_seconds) {
          firedEvents.current.add(evt.id);
          if (evt.type === 'fake_typing') {
            const id = ++notifCounterRef.current;
            const text = evt.title || `${currentCall.display_name} está digitando…`;
            setFakeNotifs(prev => [...prev, { id, text }]);
          } else {
            setActiveEvent(evt);
            if (evt.type === 'reconnect_paywall') {
              video.pause();
              setPlaying(false);
              // persiste para mostrar imediatamente em caso de refresh
              if (slug) localStorage.setItem(`callprivada_paywall_${slug}`, '1');
              setPaywallBlocked(true);
            }
            if (evt.type === 'fake_billing' || evt.type === 'video_lock' || evt.type === 'phone_block' || evt.type === 'tip_jar') {
              // persiste para restaurar em caso de refresh
              if (slug) localStorage.setItem(`callprivada_billing_${slug}`, evt.id);
              setPendingBillingId(evt.id);
            }
            if (evt.type === 'video_lock' || evt.type === 'phone_block') {
              video.pause();
              setPlaying(false);
            }
          }
          break;
        }
      }
    }

    const interval = setInterval(checkEvents, 250);
    return () => clearInterval(interval);
  }, [state]);

  const BILLING_TYPES = ['fake_billing', 'video_lock', 'phone_block', 'tip_jar'];

  function dismissEvent() {
    if (activeEvent && BILLING_TYPES.includes(activeEvent.type)) {
      if (slug) localStorage.removeItem(`callprivada_billing_${slug}`);
      setPendingBillingId(null);
    }
    setActiveEvent(null);
  }

  function resumeVideo() {
    if (slug) {
      localStorage.removeItem(`callprivada_paywall_${slug}`);
      localStorage.removeItem(`callprivada_billing_${slug}`);
    }
    setPaywallBlocked(false);
    setPendingBillingId(null);
    setActiveEvent(null);
    if (videoRef.current && !videoRef.current.ended) {
      videoRef.current.play().then(() => setPlaying(true)).catch(() => {});
    }
  }


  /* Câmera própria */
  useEffect(() => {
    if (camOff) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (selfVideoRef.current) selfVideoRef.current.srcObject = null;
      return;
    }
    navigator.mediaDevices?.getUserMedia({ video: true, audio: false })
      .then((stream) => {
        streamRef.current = stream;
        if (selfVideoRef.current) selfVideoRef.current.srcObject = stream;
      })
      .catch(() => {});
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [camOff]);

  /* Bloqueia clique-direito e seleção */
  useEffect(() => {
    const prevent = (e: Event) => e.preventDefault();
    document.addEventListener('contextmenu', prevent);
    document.addEventListener('selectstart', prevent);
    return () => {
      document.removeEventListener('contextmenu', prevent);
      document.removeEventListener('selectstart', prevent);
    };
  }, []);

  /* Sincroniza mute do alto-falante */
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = speakerMuted;
  }, [speakerMuted]);

  const handleEmojiPick = useCallback((emoji: string) => {
    const id = ++emojiCounterRef.current;
    const x = 20 + Math.random() * 60;
    setFloatingEmojis((prev) => [...prev, { id, emoji, x }]);
    setTimeout(() => setFloatingEmojis((prev) => prev.filter((e) => e.id !== id)), 1500);
  }, []);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => setControlsVisible(false), 3000);
  }, []);

  const handleScreenTap = useCallback(() => {
    if (!playing && videoRef.current) {
      videoRef.current.play().then(() => setPlaying(true)).catch(() => {});
    }
    showControls();
  }, [playing, showControls]);

  /* ── Estado: loading ── */
  if (state === 'loading') {
    return (
      <div className="fixed inset-0 bg-[#0b141a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#25d366] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  /* ── Estado: expirado ── */
  if (state === 'expired') {
    return (
      <div className="fixed inset-0 bg-[#0b141a] flex flex-col items-center justify-center gap-4 text-white px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center text-3xl">📵</div>
        <p className="text-lg font-medium">Chamada encerrada</p>
        <p className="text-sm text-gray-400">Este link não está mais disponível.</p>
      </div>
    );
  }

  /* ── Estado: erro ── */
  if (state === 'error' || !call) {
    return (
      <div className="fixed inset-0 bg-[#0b141a] flex flex-col items-center justify-center gap-4 text-white px-6 text-center">
        <p className="text-lg font-medium">Não foi possível carregar a chamada.</p>
      </div>
    );
  }

  /* ── Credits mode ── */
  if (call.billing_mode === 'credits' && !creditsGranted) {
    return (
      <CreditsOverlay
        slug={call.slug}
        onCreditsGranted={() => setCreditsGranted(true)}
        onCreditsExhausted={() => setCreditsGranted(false)}
        creditsSeconds={creditsSeconds}
        setCreditsSeconds={setCreditsSeconds}
        isCallActive={false}
      />
    );
  }

  /* ── Paywall ── */
  if (call.entry_price_cents > 0 && !paymentDone) {
    return (
      <EntryPaywall
        displayName={call.display_name}
        photoUrl={call.contact_photo_url}
        priceCents={call.entry_price_cents}
        onPay={() => {
          if (slug) localStorage.setItem(`callprivada_paid_${slug}`, '1');
          setPaymentDone(true);
        }}
      />
    );
  }

  /* ── Tela de ringing — modo depende de call.call_mode ── */
  if (state === 'ringing') {
    if (call.call_mode === 'outgoing') {
      // Lead está ligando para a modelo — mostra "chamando..." e auto-conecta
      return <OutgoingScreen call={call} onCancel={() => window.history.back()} />;
    }
    // Modelo está ligando para o lead — lead precisa atender
    return <RingingScreen call={call} onAnswer={handleAnswer} />;
  }

  /* ── Tela de encerramento ── */
  if (callEnded) {
    return (
      <div
        className="fixed inset-0 flex flex-col items-center justify-center text-white"
        style={{
          backgroundImage: 'url(/whatsapp-bg.webp)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundColor: '#111b21',
        }}
      >
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 flex flex-col items-center">
        <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-white/10 bg-[#2a3942] flex items-center justify-center mb-4 shadow-xl">
          {call.contact_photo_url ? (
            <img src={call.contact_photo_url} alt={call.display_name} className="w-full h-full object-cover" draggable={false} />
          ) : (
            <svg viewBox="0 0 24 24" fill="#8696a0" className="w-12 h-12">
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
            </svg>
          )}
        </div>
        <p className="text-xl font-semibold mb-1">{call.display_name}</p>
        <p className="text-[#8696a0] text-sm mb-1">{timer}</p>
        <p className="text-[#8696a0] text-sm mb-12">Chamada encerrada</p>
        <button
          onClick={() => window.location.reload()}
          className="w-16 h-16 rounded-full bg-[#f02849] flex items-center justify-center text-white shadow-lg"
        >
          <PhoneOff className="w-7 h-7" />
        </button>
        </div>
        <div className="absolute bottom-8 flex items-center gap-2 text-[#8696a0]">
          <svg viewBox="0 0 24 24" fill="#8696a0" className="w-4 h-4">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm.029 18.88a9.947 9.947 0 01-5.031-1.36l-.361-.214-3.742.981.999-3.648-.235-.374A9.86 9.86 0 012.1 12.045C2.1 6.545 6.545 2.1 12.045 2.1c2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.898 6.988c-.003 5.45-4.437 9.894-9.902 9.894z"/>
          </svg>
          <span className="text-xs">WhatsApp</span>
        </div>
      </div>
    );
  }

  /* ── Tela principal da chamada ── */
  return (
    <div
      className="fixed inset-0 bg-black overflow-hidden select-none"
      onClick={handleScreenTap}
      style={{ WebkitUserSelect: 'none', userSelect: 'none' }}
    >
      {/* Vídeo fullscreen */}
      <video
        ref={videoRef}
        src={call.video_url}
        className="absolute inset-0 w-full h-full"
        autoPlay
        playsInline
        muted={false}
        disablePictureInPicture
        controlsList="nodownload nofullscreen noremoteplayback"
        onContextMenu={(e) => e.preventDefault()}
        style={{
          pointerEvents: 'none',
          objectFit: 'cover',
          transform: `scale(${call.video_zoom > 0 ? call.video_zoom : 1}) translate(${call.video_x ?? 0}%, ${call.video_y ?? 0}%)`,
          transformOrigin: 'center center',
          filter: activeEvent?.type === 'video_lock' ? 'blur(24px)' : undefined,
          transition: 'filter 0.3s ease',
        }}
      />

      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/70 pointer-events-none" />

      {/* Topo: info do chamador — oculto até toque */}
      <div
        className="absolute top-0 left-0 right-0 flex flex-col items-center pt-10 pb-6 pointer-events-none transition-opacity duration-300"
        style={{ opacity: controlsVisible ? 1 : 0 }}
      >
        <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-white/20 bg-[#2a3942] flex items-center justify-center mb-3 shadow-xl">
          {call.contact_photo_url ? (
            <img src={call.contact_photo_url} alt={call.display_name} className="w-full h-full object-cover" draggable={false} onContextMenu={(e) => e.preventDefault()} />
          ) : (
            <svg viewBox="0 0 24 24" fill="#8696a0" className="w-10 h-10">
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
            </svg>
          )}
        </div>
        <p className="text-white text-xl font-semibold tracking-wide drop-shadow">{call.display_name}</p>
        <p className="text-white/70 text-sm mt-1 drop-shadow">{playing ? timer : 'Conectando…'}</p>
        <div className="flex items-center gap-1.5 mt-1.5">
          <svg viewBox="0 0 24 24" fill="#25d366" className="w-3.5 h-3.5">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
          </svg>
          <span className="text-[#8696a0] text-xs">Criptografia de ponta a ponta</span>
        </div>
      </div>

      {/* Notificações falsas — canto superior esquerdo */}
      <div className="absolute top-20 left-4 right-4 flex flex-col gap-2 z-30 pointer-events-none">
        {fakeNotifs.map(n => (
          <FakeNotifBubble
            key={n.id}
            notif={n}
            onHide={(id) => setFakeNotifs(prev => prev.filter(x => x.id !== id))}
          />
        ))}
      </div>

      {/* Miniatura câmera própria — arrastável */}
      <div
        onPointerDown={onCamPointerDown}
        onPointerMove={onCamPointerMove}
        onPointerUp={onCamPointerUp}
        style={camPos.x >= 0
          ? { position: 'absolute', left: camPos.x, top: camPos.y, width: CAM_W, height: CAM_H, touchAction: 'none', cursor: 'grab', zIndex: 30 }
          : { position: 'absolute', top: 16, right: 16, width: CAM_W, height: CAM_H, touchAction: 'none', cursor: 'grab', zIndex: 30 }
        }
        className="rounded-xl overflow-hidden bg-[#1a2530] border border-white/10 shadow-xl"
      >
        <video ref={selfVideoRef} autoPlay playsInline muted className={`absolute inset-0 w-full h-full object-cover scale-x-[-1] ${camOff ? 'hidden' : ''}`} />
        {camOff && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#1a2530]">
            <svg viewBox="0 0 24 24" fill="#4a5568" className="w-10 h-10">
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
            </svg>
          </div>
        )}
        <div className="absolute bottom-1 left-0 right-0 text-center">
          <span className="text-white/50 text-[10px]">Você</span>
        </div>
      </div>

      {/* Reações */}
      {floatingEmojis.map((fe) => <FloatingReaction key={fe.id} emoji={fe.emoji} x={fe.x} />)}

      {/* Emoji picker */}
      {showEmoji && (
        <div className="absolute bottom-20 left-0 right-0 flex justify-center z-20">
          <EmojiPicker onPick={handleEmojiPick} onClose={() => setShowEmoji(false)} />
        </div>
      )}

      {/* Controles principais */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-5 pb-12 pt-6">
        <button
          onClick={(e) => { e.stopPropagation(); setMicMuted((v) => !v); }}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${micMuted ? 'bg-white text-black' : 'bg-white/20 text-white'}`}
        >
          {micMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); setPlaying(false); if (videoRef.current) videoRef.current.pause(); if (call?.end_call_redirect_url) { const u = call.end_call_redirect_url; window.location.href = u.startsWith('http') ? u : window.location.origin + u; } else { setCallEnded(true); } }}
          className="w-16 h-16 rounded-full bg-[#f02849] flex items-center justify-center text-white shadow-lg"
        >
          <PhoneOff className="w-7 h-7" />
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); setCamOff((v) => !v); }}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${camOff ? 'bg-white text-black' : 'bg-white/20 text-white'}`}
        >
          {camOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
        </button>
      </div>

      {/* Alto-falante + emoji */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-between px-8">
        <button
          onClick={(e) => { e.stopPropagation(); setSpeakerMuted((v) => !v); }}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${speakerMuted ? 'bg-white text-black' : 'bg-white/10 text-white'}`}
        >
          {speakerMuted ? <VolumeOff className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setShowEmoji((v) => !v); }}
          className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
        >
          <SmilePlus className="w-5 h-5" />
        </button>
      </div>

      {/* Overlay de evento */}
      {activeEvent && (
        <EventOverlay
          event={activeEvent}
          onDismiss={dismissEvent}
          onResume={['reconnect_paywall', 'fake_billing', 'video_lock', 'phone_block', 'tip_jar'].includes(activeEvent.type) ? resumeVideo : undefined}
        />
      )}

      {/* Credits overlay (badge + warning + ended) */}
      {call.billing_mode === 'credits' && creditsGranted && (
        <CreditsOverlay
          slug={call.slug}
          onCreditsGranted={() => { /* saldo adicionado */ }}
          onCreditsExhausted={() => setCreditsGranted(false)}
          creditsSeconds={creditsSeconds}
          setCreditsSeconds={setCreditsSeconds}
          isCallActive={playing}
        />
      )}
    </div>
  );
}
