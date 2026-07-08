import { PresellConfig } from '../../services/presellService';

function isYouTubeUrl(url: string) {
  return url.includes('youtube.com') || url.includes('youtu.be');
}

function youTubeEmbedUrl(url: string): string {
  const match = url.match(/(?:v=|youtu\.be\/|\/embed\/)([a-zA-Z0-9_-]{11})/);
  return match ? `https://www.youtube.com/embed/${match[1]}?autoplay=0&rel=0` : url;
}

interface PresellPreviewProps {
  templateSlug: string;
  config: PresellConfig;
  scale?: number;
}

function pad2(n: number) { return String(n).padStart(2, '0'); }

function previewSlots(config: PresellConfig): string[] {
  if (!config.show_slots) return [];
  if (config.use_real_time) {
    const now = new Date();
    const fmt = (d: Date) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
    const add = (m: number) => fmt(new Date(now.getTime() + m * 60000));
    return [`Agora — ${fmt(now)} · 1 vaga`, `Em 15 min — ${add(15)} · 2 vagas`, `Em 30 min — ${add(30)} · 3 vagas`];
  }
  return config.slot_labels?.length ? config.slot_labels : ['Hoje às 19h', 'Hoje às 20h', 'Amanhã às 10h'];
}

export function PresellPreview({ config, scale = 0.45 }: PresellPreviewProps) {
  const slots = previewSlots(config);
  const bgStyle = config.bg_image_url
    ? { backgroundImage: `url(${config.bg_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { backgroundColor: config.bg_color || '#ffffff' };

  const textColor = config.text_color || '#111111';
  const ctaColor = config.cta_color || '#25d366';
  const isDark = isDarkColor(config.bg_color || '#ffffff');

  // Fake countdown: always show 4:57 in preview
  const previewMins = '04';
  const previewSecs = '57';

  return (
    <div
      style={{ width: 390, height: 700, transform: `scale(${scale})`, transformOrigin: 'top center', borderRadius: 16, overflow: 'hidden', flexShrink: 0 }}
      className="shadow-2xl border border-white/10"
    >
      <div style={{ ...bgStyle, width: '100%', height: '100%', position: 'relative', fontFamily: 'system-ui, sans-serif', overflowY: 'auto' }}>
        {config.bg_image_url && (
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)' }} />
        )}

        <div style={{ position: 'relative', zIndex: 1, padding: '32px 28px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100%', boxSizing: 'border-box' }}>

          {/* Viewer count */}
          {config.show_viewer_count && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 999, marginBottom: 14,
              backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'}`,
              color: textColor, fontSize: 11, fontWeight: 600,
            }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#ef4444', display: 'inline-block' }} />
              {config.viewer_count_base ?? 35} pessoas tentando entrar agora
            </div>
          )}

          {/* Badge */}
          {config.badge && (
            <div style={{
              display: 'inline-block', padding: '5px 14px', borderRadius: 999,
              backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
              color: textColor, fontSize: 12, fontWeight: 600, marginBottom: 18, letterSpacing: 0.5,
            }}>
              {config.badge}
            </div>
          )}

          {/* Location badge */}
          {config.location_city && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              backgroundColor: 'rgba(10,10,14,0.82)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 14, padding: '10px 14px', marginBottom: 16,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                backgroundColor: 'rgba(59,130,246,0.18)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg viewBox="0 0 24 24" fill="none" width={18} height={18}>
                  <path d="M12 2L3 6v6c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V6L12 2z" fill="#3b82f6" opacity="0.25"/>
                  <path d="M12 2L3 6v6c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V6L12 2z" stroke="#3b82f6" strokeWidth="1.5" strokeLinejoin="round"/>
                  <circle cx="12" cy="12" r="2" fill="#3b82f6"/>
                </svg>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3 }}>
                {config.location_label && (
                  <span style={{ fontSize: 10, fontWeight: 500, color: '#60a5fa' }}>{config.location_label}</span>
                )}
                <span style={{ fontSize: 14, fontWeight: 700, color: '#ffffff' }}>{config.location_city}</span>
              </div>
            </div>
          )}

          {/* Avatar */}
          {config.avatar_url ? (
            <img
              src={config.avatar_url}
              alt="avatar"
              style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(255,255,255,0.3)', marginBottom: 12 }}
            />
          ) : (
            <div style={{
              width: 80, height: 80, borderRadius: '50%', marginBottom: 12,
              backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, color: textColor, opacity: 0.5,
            }}>
              👤
            </div>
          )}

          {/* Name */}
          {config.name && (
            <p style={{ color: textColor, fontSize: 14, fontWeight: 600, marginBottom: 14, opacity: 0.85 }}>
              {config.name}
            </p>
          )}

          {/* Headline */}
          <h1 style={{ color: textColor, fontSize: 20, fontWeight: 800, textAlign: 'center', lineHeight: 1.25, marginBottom: 10 }}>
            {(config.headline || 'Sua call está pronta').replace('{hora}', `${pad2(new Date().getHours())}:${pad2(new Date().getMinutes())}`)}
          </h1>

          {/* Subheadline */}
          {config.subheadline && (
            <p style={{ color: textColor, fontSize: 13, textAlign: 'center', lineHeight: 1.5, opacity: 0.7, marginBottom: 18, maxWidth: 300 }}>
              {config.subheadline}
            </p>
          )}

          {/* Countdown */}
          {config.show_countdown && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 18 }}>
              <p style={{ color: textColor, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.5, marginBottom: 8 }}>
                Esta oferta expira em
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {[previewMins, previewSecs].map((unit, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {i > 0 && <span style={{ color: ctaColor, fontSize: 20, fontWeight: 800 }}>:</span>}
                    <div style={{
                      width: 44, height: 44, borderRadius: 8,
                      backgroundColor: ctaColor + '22',
                      border: `1px solid ${ctaColor}44`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{ color: ctaColor, fontSize: 20, fontWeight: 800 }}>{unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Slots */}
          {config.show_slots && slots.length > 0 && (
            <div style={{ width: '100%', marginBottom: 18 }}>
              <p style={{ color: textColor, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.5, marginBottom: 8, textAlign: 'center' }}>
                {config.use_real_time ? 'Horários disponíveis agora' : 'Selecione um horário'}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {slots.slice(0, 4).map((slot, i) => {
                  const available = config.slot_availability
                    ? (config.slot_availability[i] ?? true)
                    : true;
                  return (
                    <div key={i} style={{
                      padding: '9px 14px', borderRadius: 9, textAlign: 'center', position: 'relative',
                      backgroundColor: !available
                        ? (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)')
                        : available && i === 0 ? ctaColor : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'),
                      color: !available ? (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)') : (i === 0 ? '#fff' : textColor),
                      fontSize: 12, fontWeight: 600,
                      border: `2px solid ${!available ? 'transparent' : (i === 0 ? ctaColor : 'transparent')}`,
                      cursor: available ? 'pointer' : 'not-allowed',
                      textDecoration: !available ? 'line-through' : 'none',
                      opacity: !available ? 0.6 : 1,
                    }}>
                      {slot}
                      {!available && (
                        <span style={{
                          position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                          fontSize: 10, fontWeight: 400, textDecoration: 'none', opacity: 0.7,
                        }}>
                          Esgotado
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Video */}
          {config.video_url && (
            isYouTubeUrl(config.video_url) ? (
              <div style={{ width: '100%', marginBottom: 18, borderRadius: 12, overflow: 'hidden', aspectRatio: '16/9' }}>
                <iframe
                  src={youTubeEmbedUrl(config.video_url)}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title="vídeo"
                />
              </div>
            ) : (
              <div style={{ width: '100%', marginBottom: 18, borderRadius: 12, overflow: 'hidden', background: '#000' }}>
                <video
                  src={config.video_url}
                  poster={config.video_poster_url}
                  controls
                  playsInline
                  style={{ width: '100%', maxHeight: 200, display: 'block' }}
                />
              </div>
            )
          )}

          <div style={{ flex: 1 }} />

          {/* CTA button */}
          <button style={{
            width: '100%', padding: '14px 20px', borderRadius: 12, border: 'none',
            backgroundColor: ctaColor,
            color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer',
            boxShadow: `0 4px 24px ${ctaColor}66`,
          }}>
            {config.cta_text || 'Entrar na Call'}
          </button>

          <p style={{ color: textColor, fontSize: 10, opacity: 0.35, marginTop: 12, textAlign: 'center' }}>
            Ao clicar, você será redirecionado para a chamada.
          </p>
        </div>
      </div>
    </div>
  );
}

function isDarkColor(hex: string): boolean {
  const h = hex.replace('#', '');
  if (h.length < 6) return false;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 128;
}
