import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPublicPresell, trackCTAClick, type PresellConfig, type PresellComment } from '../services/presellService';
import { useTrackingScripts } from '../hooks/useTrackingScripts';
import type { TrackingConfig } from '../services/trackingService';

function isDarkColor(hex: string): boolean {
  const cleaned = hex.replace('#', '');
  if (cleaned.length < 6) return false;
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 128;
}

function pad2(n: number) { return String(n).padStart(2, '0'); }

function generateRealTimeSlots(): string[] {
  const now = new Date();
  const m = now.getMinutes();
  const fmt = (date: Date) => `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
  const add = (mins: number) => {
    const d = new Date(now.getTime() + mins * 60000);
    return fmt(d);
  };
  // use current minute parity to vary "agora" label slightly
  const nowLabel = m % 2 === 0 ? `Agora — ${fmt(now)} · 1 vaga` : `Agora — ${fmt(now)} · última vaga`;
  return [nowLabel, `Em 15 min — ${add(15)} · 2 vagas`, `Em 30 min — ${add(30)} · 3 vagas`];
}

function randomViewers(base: number): number {
  const delta = Math.floor(base * 0.15);
  return base + Math.floor(Math.random() * (delta * 2 + 1)) - delta;
}

function CountdownTimer({ seconds, textColor, ctaColor }: { seconds: number; textColor: string; ctaColor: string }) {
  const [remaining, setRemaining] = useState(seconds);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    ref.current = setInterval(() => {
      setRemaining(prev => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, []);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  return (
    <div className="flex flex-col items-center mb-6">
      <p style={{ color: textColor, opacity: 0.6 }} className="text-xs font-semibold uppercase tracking-widest mb-2">
        Esta oferta expira em
      </p>
      <div className="flex items-center gap-2">
        {[pad2(mins), pad2(secs)].map((unit, i) => (
          <div key={i} className="flex items-center gap-2">
            {i > 0 && <span style={{ color: ctaColor }} className="text-2xl font-extrabold leading-none mb-1">:</span>}
            <div
              style={{ backgroundColor: ctaColor + '22', border: `1px solid ${ctaColor}44` }}
              className="w-14 h-14 rounded-xl flex items-center justify-center"
            >
              <span style={{ color: ctaColor }} className="text-2xl font-extrabold tabular-nums">{unit}</span>
            </div>
          </div>
        ))}
      </div>
      <p style={{ color: textColor, opacity: 0.4 }} className="text-xs mt-1.5">
        {remaining === 0 ? 'Vagas esgotadas — aguarde…' : `${mins}min ${secs}s`}
      </p>
    </div>
  );
}

/* ─── Video player ──────────────────────────────────────────────────────── */

function isYouTube(url: string) {
  return url.includes('youtube.com') || url.includes('youtu.be');
}

function getYouTubeEmbed(url: string): string {
  // handles watch?v=ID and youtu.be/ID and /embed/ID
  const match = url.match(/(?:v=|youtu\.be\/|\/embed\/)([a-zA-Z0-9_-]{11})/);
  return match ? `https://www.youtube.com/embed/${match[1]}?autoplay=0&rel=0` : url;
}

function PresellVideo({ url, poster }: { url: string; poster?: string }) {
  if (!url) return null;

  if (isYouTube(url)) {
    return (
      <div className="w-full mb-8 rounded-2xl overflow-hidden shadow-2xl" style={{ aspectRatio: '16/9' }}>
        <iframe
          src={getYouTubeEmbed(url)}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="vídeo"
        />
      </div>
    );
  }

  return (
    <div className="w-full mb-8 rounded-2xl overflow-hidden shadow-2xl">
      <video
        src={url}
        poster={poster}
        controls
        playsInline
        className="w-full"
        controlsList="nodownload"
        onContextMenu={e => e.preventDefault()}
        style={{ maxHeight: 320, background: '#000' }}
      />
    </div>
  );
}

/* ─── Comments ──────────────────────────────────────────────────────────── */

const AVATAR_COLORS = ['#e11d48','#7c3aed','#2563eb','#059669','#d97706','#db2777','#0891b2','#65a30d'];

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function CommentItem({ comment, textColor, isDark }: { comment: PresellComment; textColor: string; isDark: boolean }) {
  const [liked, setLiked] = useState(false);
  const displayLikes = (comment.likes ?? 0) + (liked ? 1 : 0);
  const initial = comment.name.trim().charAt(0).toUpperCase();
  const bg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  return (
    <div style={{ backgroundColor: bg, border: `1px solid ${border}`, borderRadius: 16, padding: '12px 14px' }} className="flex gap-3">
      {/* Avatar */}
      <div
        style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: avatarColor(comment.name), flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: '#fff' }}
      >
        {comment.avatar_emoji || initial}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span style={{ color: textColor, fontWeight: 700, fontSize: 13 }}>{comment.name}</span>
          {comment.time && (
            <span style={{ color: textColor, opacity: 0.35, fontSize: 11 }}>{comment.time}</span>
          )}
        </div>
        <p style={{ color: textColor, opacity: 0.8, fontSize: 13, lineHeight: 1.45 }}>{comment.text}</p>
        {/* Like button */}
        <button
          onClick={() => setLiked(v => !v)}
          className="flex items-center gap-1 mt-1.5 transition-all active:scale-90"
          style={{ opacity: liked ? 1 : 0.4 }}
        >
          <svg viewBox="0 0 24 24" fill={liked ? '#e11d48' : 'none'} stroke={liked ? '#e11d48' : textColor} strokeWidth="1.8" className="w-4 h-4">
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
          </svg>
          {displayLikes > 0 && (
            <span style={{ color: liked ? '#e11d48' : textColor, fontSize: 11, fontWeight: 600, opacity: liked ? 1 : 0.5 }}>
              {displayLikes}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

interface PresellPublicPageProps {
  isDownsell?: boolean;
  isUpsell?: boolean;
}

export default function PresellPublicPage({ isDownsell = false, isUpsell = false }: PresellPublicPageProps) {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [config, setConfig] = useState<PresellConfig | null>(null);
  const [tracking, setTracking] = useState<TrackingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [ipCity, setIpCity] = useState<string | null>(null);
  const [showExitModal, setShowExitModal] = useState(false);
  const exitFiredRef = useRef(false);
  useTrackingScripts(tracking);

  // Detecta cidade do visitante pelo IP (fallback silencioso)
  useEffect(() => {
    fetch('https://ipapi.co/json/')
      .then(r => r.json())
      .then((d: { city?: string; region?: string }) => {
        if (d.city) setIpCity(d.city);
        else if (d.region) setIpCity(d.region);
      })
      .catch(() => {});
  }, []);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(0);
  const [viewerCount, setViewerCount] = useState<number | null>(null);
  const [realTimeSlots, setRealTimeSlots] = useState<string[]>([]);

  useEffect(() => {
    if (!slug) return;
    getPublicPresell(slug)
      .then(p => {
        setConfig(p.config);
        if (p.tracking) setTracking(p.tracking);
        // Generate dynamic state based on config
        if (p.config.use_real_time) {
          setRealTimeSlots(generateRealTimeSlots());
        }
        if (p.config.show_viewer_count) {
          const base = p.config.viewer_count_base ?? 35;
          setViewerCount(randomViewers(base));
          const interval = setInterval(() => {
            setViewerCount(prev => {
              if (prev === null) return null;
              const drift = Math.floor(Math.random() * 3) - 1;
              return Math.max(base - 15, Math.min(base + 20, prev + drift));
            });
          }, 8000);
          // cleanup registrado no efeito de cleanup do useEffect, não dentro do .then
          setTimeout(() => clearInterval(interval), 600_000); // max 10min
        }
        setLoading(false);
      })
      .catch(() => { setError(true); setLoading(false); });
  }, [slug]);

  // Set loading false after config is set
  useEffect(() => {
    if (config) setLoading(false);
  }, [config]);

  // Exit-intent: redireciona para downsell quando o mouse sai pelo topo (desktop)
  // ou quando o usuário toca para voltar (mobile via visibilitychange + pagehide)
  useEffect(() => {
    if (!config?.downsell_slug || isDownsell || isUpsell) return;

    function fireExitIntent() {
      if (exitFiredRef.current) return;
      exitFiredRef.current = true;
      setShowExitModal(true);
    }

    function onMouseLeave(e: MouseEvent) {
      if (e.clientY <= 5) fireExitIntent();
    }

    // No mobile, visibilitychange dispara em qualquer troca de aba/minimizar.
    // Só conta como saída se a página ficar oculta por mais de 800ms sem voltar.
    let visibilityTimer: ReturnType<typeof setTimeout> | null = null;
    function onVisibility() {
      if (document.visibilityState === 'hidden') {
        visibilityTimer = setTimeout(() => fireExitIntent(), 800);
      } else {
        if (visibilityTimer) { clearTimeout(visibilityTimer); visibilityTimer = null; }
      }
    }

    document.addEventListener('mouseleave', onMouseLeave);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', fireExitIntent);

    return () => {
      document.removeEventListener('mouseleave', onMouseLeave);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', fireExitIntent);
      if (visibilityTimer) clearTimeout(visibilityTimer);
    };
  }, [config?.downsell_slug, isDownsell, isUpsell]);

  function goToDownsell() {
    if (!config?.downsell_slug) return;
    navigate(`/d/${config.downsell_slug}`);
  }

  function handleCTA() {
    if (!config?.redirect_url) return;
    if (slug) trackCTAClick(slug);
    const url = config.redirect_url;
    if (url.startsWith('/')) navigate(url);
    else window.location.href = url;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#120208] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="min-h-screen bg-[#120208] flex flex-col items-center justify-center gap-4 text-center px-6">
        <p className="text-white text-xl font-bold">Página não encontrada</p>
        <p className="text-gray-500 text-sm">Este link não existe ou foi removido.</p>
      </div>
    );
  }

  const isDark = isDarkColor(config.bg_color || '#ffffff');
  const textColor = config.text_color || '#111111';
  const ctaColor = config.cta_color || '#25d366';

  // Decide which slots to show
  let slots: string[] = [];
  if (config.show_slots) {
    slots = config.use_real_time && realTimeSlots.length > 0
      ? realTimeSlots
      : (config.slot_labels ?? []);
  }

  const bgStyle: React.CSSProperties = config.bg_image_url
    ? {
        backgroundImage: `url(${config.bg_image_url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: config.bg_color,
      }
    : { backgroundColor: config.bg_color || '#ffffff' };

  return (
    <div
      style={{ ...bgStyle, minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}
      className="relative"
    >
      {config.bg_image_url && (
        <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }} />
      )}

      {/* Exit-intent modal */}
      {showExitModal && config.downsell_slug && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center px-5"
          style={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
            style={{ background: '#0f0505', border: '1px solid rgba(220,38,38,0.3)' }}>
            <div className="py-3 px-4 text-center text-sm font-bold"
              style={{ background: 'linear-gradient(90deg,#dc2626,#b91c1c)', color: '#fff' }}>
              ⚠️ ESPERA! Antes de sair…
            </div>
            <div className="p-6 text-center space-y-4">
              <p className="text-white font-bold text-lg leading-snug">
                Você está prestes a perder sua oportunidade
              </p>
              <p className="text-gray-400 text-sm">
                Temos uma oferta especial para você. Não vá embora ainda.
              </p>
              <button
                onClick={goToDownsell}
                className="w-full py-3.5 rounded-xl font-bold text-white text-sm transition-all active:scale-95"
                style={{ background: 'linear-gradient(135deg,#dc2626,#b91c1c)', boxShadow: '0 4px 20px rgba(220,38,38,0.4)' }}
              >
                Ver oferta especial →
              </button>
              <button
                onClick={() => setShowExitModal(false)}
                className="block w-full text-xs text-gray-600 hover:text-gray-400 transition-colors pt-1"
              >
                Não, quero sair mesmo assim
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Downsell exit-intent banner */}
      {isDownsell && (
        <div className="relative z-20 w-full py-2.5 px-4 text-center text-sm font-bold"
          style={{ background: 'linear-gradient(90deg, #dc2626, #b91c1c)', color: '#fff', letterSpacing: '0.02em' }}>
          ⚠️ ESPERA! Antes de sair — veja isso primeiro
        </div>
      )}

      {/* Upsell banner */}
      {isUpsell && (
        <div className="relative z-20 w-full py-2.5 px-4 text-center text-sm font-bold"
          style={{ background: 'linear-gradient(90deg, #7c3aed, #6d28d9)', color: '#fff', letterSpacing: '0.02em' }}>
          💎 Oferta exclusiva — disponível apenas agora
        </div>
      )}

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm flex flex-col items-center">

          {/* Viewer count social proof */}
          {config.show_viewer_count && viewerCount !== null && (
            <div
              style={{
                backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'}`,
                color: textColor,
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold mb-5"
            >
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              {viewerCount} pessoas tentando entrar agora
            </div>
          )}

          {/* Badge */}
          {config.badge && (
            <div
              style={{
                color: textColor,
                backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)'}`,
              }}
              className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide mb-6"
            >
              {config.badge}
            </div>
          )}

          {/* Location badge — só exibe se o usuário habilitou (label ou cidade configurados) */}
          {(config.location_label || config.location_city) && (
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 mb-5 self-center"
              style={{
                background: 'linear-gradient(135deg, rgba(30,30,40,0.95) 0%, rgba(20,20,30,0.95) 100%)',
                border: '1px solid rgba(99,102,241,0.35)',
                boxShadow: '0 0 18px rgba(99,102,241,0.18)',
                backdropFilter: 'blur(12px)',
              }}
            >
              {/* Pin icon */}
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 shrink-0">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="url(#pinGrad)" />
                <circle cx="12" cy="9" r="2.5" fill="white" opacity="0.9"/>
                <defs>
                  <linearGradient id="pinGrad" x1="5" y1="2" x2="19" y2="22" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#818cf8"/>
                    <stop offset="100%" stopColor="#6366f1"/>
                  </linearGradient>
                </defs>
              </svg>

              <div className="flex items-center gap-1.5 leading-none">
                {config.location_label && (
                  <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#a5b4fc' }}>
                    {config.location_label}
                  </span>
                )}
                {config.location_label && (ipCity || config.location_city) && (
                  <span className="text-[11px]" style={{ color: 'rgba(165,180,252,0.4)' }}>·</span>
                )}
                {(ipCity || config.location_city) && (
                  <span className="text-[13px] font-bold text-white">
                    {ipCity || config.location_city}
                  </span>
                )}
              </div>

              {/* Dot animado */}
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse shrink-0" />
            </div>
          )}

          {/* Avatar */}
          {config.avatar_url ? (
            <img
              src={config.avatar_url}
              alt={config.name || 'avatar'}
              className="w-24 h-24 rounded-full object-cover mb-4"
              style={{ border: `3px solid ${isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.1)'}` }}
            />
          ) : (
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center text-4xl mb-4"
              style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }}
            >
              👤
            </div>
          )}

          {/* Name */}
          {config.name && (
            <p style={{ color: textColor }} className="text-base font-semibold mb-5 opacity-80">
              {config.name}
            </p>
          )}

          {/* Headline — replace {hora} with current time */}
          <h1
            style={{ color: textColor }}
            className="text-2xl sm:text-3xl font-extrabold text-center leading-tight mb-4"
          >
            {config.headline.replace('{hora}', `${pad2(new Date().getHours())}:${pad2(new Date().getMinutes())}`)}
          </h1>

          {/* Subheadline */}
          {config.subheadline && (
            <p
              style={{ color: textColor }}
              className="text-sm text-center leading-relaxed mb-8 opacity-70 max-w-xs"
            >
              {config.subheadline}
            </p>
          )}

          {/* Video */}
          {config.video_url && (
            <PresellVideo url={config.video_url} poster={config.video_poster_url} />
          )}

          {/* Countdown */}
          {config.show_countdown && (
            <CountdownTimer
              seconds={config.countdown_seconds ?? 300}
              textColor={textColor}
              ctaColor={ctaColor}
            />
          )}

          {/* Slots */}
          {config.show_slots && slots.length > 0 && (
            <div className="w-full mb-8">
              <p
                style={{ color: textColor }}
                className="text-xs font-semibold uppercase tracking-widest text-center mb-3 opacity-50"
              >
                {config.use_real_time ? 'Horários disponíveis agora' : 'Selecione um horário'}
              </p>
              <div className="flex flex-col gap-2.5">
                {slots.map((slot, i) => {
                  const available = config.slot_availability
                    ? (config.slot_availability[i] ?? true)
                    : true;
                  const isSelected = selectedSlot === i;
                  return (
                    <button
                      key={i}
                      onClick={() => available && setSelectedSlot(i)}
                      disabled={!available}
                      style={{
                        backgroundColor: !available
                          ? isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'
                          : isSelected
                            ? ctaColor
                            : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                        color: !available
                          ? isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'
                          : isSelected ? '#ffffff' : textColor,
                        border: `2px solid ${
                          !available
                            ? 'transparent'
                            : isSelected ? ctaColor : 'transparent'
                        }`,
                        cursor: available ? 'pointer' : 'not-allowed',
                      }}
                      className="w-full py-3 px-4 rounded-xl text-sm font-semibold transition-all text-center relative"
                    >
                      <span className={!available ? 'opacity-40 line-through decoration-1' : ''}>
                        {slot}
                      </span>
                      {!available && (
                        <span
                          style={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-normal"
                        >
                          Esgotado
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Downsell price comparison block */}
          {isDownsell && config.discounted_price_label && (
            <div className="w-full mb-6">
              {config.discount_badge && (
                <div
                  className="flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold mb-3 w-fit mx-auto"
                  style={{ background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.35)', color: '#ef4444' }}
                >
                  🔥 {config.discount_badge}
                </div>
              )}
              <div
                className="rounded-2xl p-5 text-center"
                style={{ background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.2)' }}
              >
                {config.original_price_label && (
                  <p style={{ color: textColor, opacity: 0.4 }} className="text-base line-through mb-1">
                    {config.original_price_label}
                  </p>
                )}
                <p style={{ color: ctaColor }} className="text-4xl font-extrabold leading-none">
                  {config.discounted_price_label}
                </p>
                {config.original_price_label && (
                  <p style={{ color: textColor, opacity: 0.5 }} className="text-xs mt-1.5">
                    em vez de {config.original_price_label}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* CTA button */}
          <button
            onClick={handleCTA}
            style={{
              backgroundColor: ctaColor,
              boxShadow: `0 6px 32px ${ctaColor}55`,
            }}
            className="w-full py-4 px-6 rounded-2xl text-white font-extrabold text-base transition-all active:scale-95 hover:opacity-90"
          >
            {config.cta_text || 'Entrar na Call'}
          </button>

          <p style={{ color: textColor }} className="text-xs mt-5 text-center opacity-30">
            Ao clicar, você será redirecionado para a chamada ao vivo.
          </p>

          {/* Comments */}
          {config.show_comments && config.comments && config.comments.length > 0 && (
            <div className="w-full mt-10">
              <div className="flex items-center gap-2 mb-4">
                <svg viewBox="0 0 24 24" fill="none" stroke={textColor} strokeWidth="1.8" className="w-4 h-4 opacity-50">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                </svg>
                <span style={{ color: textColor }} className="text-xs font-semibold uppercase tracking-widest opacity-50">
                  Comentários
                </span>
              </div>
              <div className="flex flex-col gap-3">
                {config.comments.map((c, i) => (
                  <CommentItem key={i} comment={c} textColor={textColor} isDark={isDark} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
