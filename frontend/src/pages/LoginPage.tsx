import { Eye, EyeOff, Mail, Lock, Video, Shield, Zap } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../services/authService';
import { useAuthStore } from '../stores/authStore';

const FEATURES = [
  { icon: Video,  title: 'Videochamadas privadas',  desc: 'Conecte-se com total privacidade.' },
  { icon: Shield, title: 'Seguro e protegido',       desc: 'Seus dados e conversas sempre protegidos.' },
  { icon: Zap,    title: 'Rápido e simples',         desc: 'Crie sua conta e comece em segundos.' },
];

/* ─── Logo SVG (câmera + chifres) ─────────────────────────────────── */
function BrandLogo({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none">
      {/* Chifres */}
      <path d="M16 14 C16 8 20 5 24 8" stroke="#f0186a" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      <path d="M40 14 C40 8 36 5 32 8" stroke="#f0186a" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      {/* Corpo da câmera */}
      <rect x="6" y="16" width="32" height="24" rx="6" stroke="#f0186a" strokeWidth="2.5" fill="none"/>
      {/* Lente */}
      <circle cx="22" cy="28" r="7" stroke="#f0186a" strokeWidth="2" fill="none"/>
      <circle cx="22" cy="28" r="3" fill="#f0186a" opacity="0.4"/>
      {/* Triângulo de vídeo */}
      <path d="M40 21 L50 25 L50 31 L40 35 Z" stroke="#f0186a" strokeWidth="2.5" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

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
    <div className="min-h-screen flex flex-col md:flex-row bg-[#080808]">

      {/* ══ LEFT: branding ══════════════════════════════════════════ */}
      <div className="hidden md:flex flex-col justify-between relative overflow-hidden md:w-[55%] p-10">

        {/* Hero image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/brand-hero.jpg')" }}
        />
        {/* Overlay: escurece a direita (onde está a mulher) para o texto à esq. ficar legível */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-black/20" />
        {/* Overlay extra no rodapé */}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/80 to-transparent" />

        {/* Glow circles (decorativos, sobre a foto) */}
        <div className="absolute top-4 left-4 w-20 h-20 rounded-full bg-pink-600/30 blur-2xl" />
        <div className="absolute bottom-16 right-8 w-24 h-24 rounded-full bg-pink-600/20 blur-2xl" />

        {/* Logo */}
        <div className="relative z-10">
          <BrandLogo size={64} />
          <h2 className="text-5xl font-black text-white mt-4 leading-none">Call</h2>
          <h2 className="text-5xl font-black text-[#f0186a] leading-none">Privada</h2>
          <div className="mt-3 space-y-0.5">
            <p className="text-gray-400 text-xs tracking-[0.2em] uppercase">Suas chamadas.</p>
            <p className="text-[#f0186a] text-xs tracking-[0.2em] uppercase font-semibold">Suas regras.</p>
          </div>
        </div>

        {/* Feature list */}
        <div className="relative z-10 space-y-5">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-black/50 border border-[#f0186a]/30 flex items-center justify-center shrink-0 backdrop-blur-sm">
                <Icon size={20} className="text-[#f0186a]" />
              </div>
              <div>
                <p className="text-white font-bold text-xs tracking-wider uppercase">{title}</p>
                <p className="text-gray-400 text-xs mt-1 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom badge */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full border border-[#f0186a]/40 flex items-center justify-center">
            <Lock size={12} className="text-[#f0186a]" />
          </div>
          <div>
            <p className="text-white text-[10px] tracking-widest uppercase">Privado. Seguro.</p>
            <p className="text-[10px] tracking-widest uppercase">
              <span className="text-[#f0186a] font-bold">100%</span>
              <span className="text-gray-400"> Seu.</span>
            </p>
          </div>
        </div>
      </div>

      {/* ══ RIGHT: form ═════════════════════════════════════════════ */}
      <div className="flex-1 flex items-center justify-center px-8 py-14 bg-[#0e0e12]">
        <div className="w-full max-w-[380px]">

          {/* Mobile logo */}
          <div className="md:hidden flex items-center gap-3 mb-8">
            <BrandLogo size={36} />
            <p className="text-xl font-bold text-white">Call <span className="text-[#f0186a]">Privada</span></p>
          </div>

          {/* Heading */}
          <div className="mb-7">
            <h1 className="text-3xl font-bold text-white">Bem-vindo(a)</h1>
            <p className="text-gray-400 text-sm mt-1.5">
              Entre na sua conta para{' '}
              <span className="text-[#f0186a] font-medium">continuar</span>
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-6 mb-7 border-b border-white/8">
            <button className="pb-3 text-sm font-semibold text-[#f0186a] border-b-2 border-[#f0186a] -mb-px">
              Login
            </button>
            <Link to="/register" className="pb-3 text-sm font-medium text-gray-500 hover:text-gray-300 transition-colors">
              Criar conta
            </Link>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2.5 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3 mb-5">
              <span className="mt-0.5 shrink-0">⚠</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">E-mail</label>
              <div className="flex items-center gap-3 bg-[#17171e] border border-white/8 rounded-2xl px-4 py-3.5 focus-within:border-[#f0186a]/50 focus-within:bg-[#1c0f18] transition-all">
                <Mail size={16} className="text-gray-600 shrink-0" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="flex-1 bg-transparent text-white text-sm placeholder-gray-600 outline-none"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">Senha</label>
              <div className="flex items-center gap-3 bg-[#17171e] border border-white/8 rounded-2xl px-4 py-3.5 focus-within:border-[#f0186a]/50 focus-within:bg-[#1c0f18] transition-all">
                <Lock size={16} className="text-gray-600 shrink-0" />
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="flex-1 bg-transparent text-white text-sm placeholder-gray-600 outline-none"
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="text-gray-500 hover:text-gray-300 transition-colors shrink-0">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Forgot password */}
            <div className="flex justify-end">
              <span className="text-[#f0186a] text-xs hover:underline cursor-pointer transition-colors">
                Esqueceu sua senha?
              </span>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-[#f0186a] hover:bg-[#d4135c] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 text-sm transition-all shadow-lg shadow-pink-900/40"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Entrando…
                </span>
              ) : 'Entrar'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-600 mt-6">
            Ainda não tem uma conta?{' '}
            <Link to="/register" className="text-[#f0186a] hover:underline font-medium transition-colors">
              Criar conta
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
