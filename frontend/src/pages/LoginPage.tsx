import { Eye, EyeOff, Phone, Star } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../services/authService';
import { useAuthStore } from '../stores/authStore';

const TESTIMONIALS = [
  {
    name: 'Ana Paula',
    handle: '@anapaula_vendas',
    text: 'Fiz R$3.200 na primeira semana usando o callPrivada. É surreal como funciona!',
    emoji: '💰',
  },
  {
    name: 'Carlos M.',
    handle: '@carlosm_digital',
    text: 'Taxa de conversão disparou 4x depois que comecei a usar.',
    emoji: '🚀',
  },
];

function PhoneMockup() {
  return (
    <div className="auth-float relative w-[200px] mx-auto">
      {/* Glow */}
      <div className="absolute inset-0 rounded-[36px] blur-3xl bg-pink-500/25 scale-110" />
      {/* Phone frame */}
      <div className="relative rounded-[36px] bg-[#111114] border border-white/10 shadow-2xl overflow-hidden" style={{ aspectRatio: '9/19.5' }}>
        {/* Status bar */}
        <div className="flex items-center justify-between px-5 pt-4 pb-1">
          <span className="text-white text-[10px] font-semibold">9:41</span>
          <div className="flex gap-1 items-center">
            <div className="w-3 h-1.5 rounded-sm bg-white/60" />
            <div className="w-0.5 h-1.5 rounded-sm bg-white/30" />
          </div>
        </div>
        {/* WhatsApp call screen */}
        <div className="flex flex-col items-center px-4 pt-4 pb-6 gap-3 h-full bg-gradient-to-b from-[#0d1117] to-[#1a0a0f]">
          <p className="text-gray-400 text-[10px]">Ligação de vídeo</p>
          {/* Avatar */}
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-400 to-rose-600 flex items-center justify-center shadow-lg shadow-pink-900/50">
              <span className="text-2xl">👩</span>
            </div>
            <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-[#0d1117]" />
          </div>
          <div className="text-center">
            <p className="text-white text-sm font-semibold">Fernanda</p>
            <p className="text-green-400 text-[10px] mt-0.5 flex items-center gap-1 justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
              Chamando…
            </p>
          </div>
          {/* Video area */}
          <div className="w-full flex-1 rounded-2xl bg-gradient-to-br from-pink-900/30 to-rose-900/20 border border-pink-500/10 flex items-center justify-center min-h-[80px]">
            <div className="w-8 h-8 rounded-full bg-pink-500/20 flex items-center justify-center">
              <Phone size={14} className="text-pink-400" />
            </div>
          </div>
          {/* Controls */}
          <div className="flex items-center justify-center gap-6 w-full pt-1">
            <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="white" strokeWidth="1.8">
                <path d="M9 9a3 3 0 1 1 6 0 3 3 0 0 1-6 0z"/>
                <path d="M6.168 18.849A4 4 0 0 1 10 16h4a4 4 0 0 1 3.834 2.855"/>
              </svg>
            </div>
            <div className="w-11 h-11 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-900/50">
              <Phone size={16} className="text-white rotate-[135deg]" />
            </div>
            <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="white" strokeWidth="1.8">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TestimonialCard({ t, delay }: { t: typeof TESTIMONIALS[0]; delay: string }) {
  return (
    <div className={`auth-el ${delay} flex items-start gap-3 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-4 w-full`}>
      <div className="w-9 h-9 rounded-xl bg-pink-500/20 flex items-center justify-center shrink-0 text-lg">{t.emoji}</div>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <p className="text-white text-xs font-semibold truncate">{t.name}</p>
          <span className="text-gray-600 text-[10px] truncate">{t.handle}</span>
        </div>
        <div className="flex gap-0.5 mb-1">
          {[0,1,2,3,4].map(i => <Star key={i} size={9} className="text-pink-400 fill-pink-400" />)}
        </div>
        <p className="text-gray-300 text-[11px] leading-relaxed">{t.text}</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login({ email, password });
      setAuth(data.user, data.access_token, data.refresh_token);
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message;
      setError(msg ?? 'Email ou senha inválidos.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col md:flex-row">

      {/* ── Left: form ── */}
      <section className="flex-1 flex items-center justify-center px-8 py-12 order-2 md:order-1">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="auth-el auth-d1 md:hidden flex items-center gap-2.5 mb-8">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-lg shadow-pink-900/40">
              <Phone size={14} className="text-white" />
            </div>
            <span className="text-white font-bold text-base">CallPrivada</span>
          </div>

          {/* Heading */}
          <div className="auth-el auth-d1 mb-7">
            <h1 className="text-4xl font-semibold text-white tracking-tight leading-tight">
              Bem-vindo<br />
              <span className="font-light text-gray-400">de volta</span>
            </h1>
            <p className="text-gray-500 text-sm mt-2">Acesse sua conta e continue monetizando</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="auth-el auth-d1 flex items-start gap-2.5 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3">
                <span className="mt-0.5 shrink-0">⚠</span>
                <span>{error}</span>
              </div>
            )}

            <div className="auth-el auth-d2 space-y-1.5">
              <label className="text-sm font-medium text-gray-400">Email</label>
              <div className="glass-input-wrap">
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div className="auth-el auth-d3 space-y-1.5">
              <label className="text-sm font-medium text-gray-400">Senha</label>
              <div className="glass-input-wrap relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ paddingRight: '48px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember + forgot */}
            <div className="auth-el auth-d4 flex items-center justify-between text-sm">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <span className="relative flex items-center">
                  <input type="checkbox" className="peer sr-only" />
                  <span className="w-4 h-4 rounded-md border border-white/20 bg-white/5 peer-checked:bg-pink-500 peer-checked:border-pink-500 transition-colors flex items-center justify-center">
                  </span>
                </span>
                <span className="text-gray-400">Manter conectado</span>
              </label>
              <span className="text-pink-400 hover:text-pink-300 cursor-pointer transition-colors text-xs font-medium">
                Esqueci a senha
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="auth-el auth-d5 w-full rounded-2xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3.5 text-sm transition-all shadow-lg shadow-pink-900/40"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Entrando…
                </span>
              ) : 'Entrar'}
            </button>
          </form>

          <p className="auth-el auth-d6 text-center text-sm text-gray-600 mt-6">
            Não tem conta?{' '}
            <Link to="/register" className="text-pink-400 hover:text-pink-300 font-medium transition-colors">
              Criar conta grátis
            </Link>
          </p>
        </div>
      </section>

      {/* ── Right: branding panel ── */}
      <section className="auth-panel hidden md:flex flex-col justify-between w-[440px] shrink-0 relative overflow-hidden order-1 md:order-2 p-8">
        {/* Background */}
        <div className="absolute inset-0 bg-[#0f0508]" />
        <div className="absolute inset-0 bg-gradient-to-br from-pink-950/60 via-transparent to-rose-950/40" />
        {/* Glow blobs */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-pink-600/15 blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/3 right-0 w-48 h-48 rounded-full bg-rose-600/10 blur-3xl pointer-events-none" />
        {/* Grid lines */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.3) 1px, transparent 1px)', backgroundSize: '40px 40px' }}
        />

        {/* Logo */}
        <div className="relative flex items-center gap-3 z-10">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-lg shadow-pink-900/50">
            <Phone size={16} className="text-white" />
          </div>
          <span className="text-white font-bold text-lg">CallPrivada</span>
        </div>

        {/* Center: phone mockup */}
        <div className="relative z-10 py-6">
          <PhoneMockup />
          <div className="text-center mt-6">
            <p className="text-white font-semibold text-lg leading-snug">
              Chame. Convença.<br />
              <span className="text-pink-400">Converta.</span>
            </p>
            <p className="text-gray-500 text-sm mt-2">Chamadas para quem vendem de verdade.</p>
          </div>
        </div>

        {/* Bottom: testimonials */}
        <div className="relative z-10 space-y-3">
          {TESTIMONIALS.map((t, i) => (
            <TestimonialCard key={t.handle} t={t} delay={`auth-d${i + 5}`} />
          ))}
        </div>
      </section>
    </div>
  );
}
