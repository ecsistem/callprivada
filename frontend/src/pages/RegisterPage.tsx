import { BarChart2, Check, DollarSign, Eye, EyeOff, Phone, TrendingUp, Zap } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../services/authService';
import { useAuthStore } from '../stores/authStore';

const PERKS = [
  { icon: Phone,      color: 'text-pink-400',   bg: 'bg-pink-500/15',   text: 'Chamadas falsas convincentes via WhatsApp' },
  { icon: Zap,        color: 'text-rose-400',    bg: 'bg-rose-500/15',   text: 'Editor de timeline com camadas de gatilhos' },
  { icon: DollarSign, color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/15',text: 'Pagamentos PIX integrados (ZuckPay)' },
  { icon: BarChart2,  color: 'text-pink-300',    bg: 'bg-pink-500/10',   text: 'Analytics de visitas em tempo real' },
  { icon: TrendingUp, color: 'text-rose-300',    bg: 'bg-rose-500/10',   text: 'Funis completos: presell → call → upsell' },
];

const STATS = [
  { value: '4x', label: 'mais conversão' },
  { value: 'R$0', label: 'para começar' },
  { value: '5min', label: 'para criar' },
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [name, setName] = useState('');
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
      const data = await register({ name, email, password });
      setAuth(data.user, data.access_token, data.refresh_token);
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message;
      setError(msg ?? 'Erro ao criar conta.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col md:flex-row">

      {/* ── Left: branding panel ── */}
      <section className="auth-panel hidden md:flex flex-col justify-between w-[440px] shrink-0 relative overflow-hidden p-10">
        {/* Background */}
        <div className="absolute inset-0 bg-[#0f0508]" />
        <div className="absolute inset-0 bg-gradient-to-br from-pink-950/60 via-transparent to-rose-950/40" />
        {/* Glow blobs */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-pink-600/12 blur-3xl pointer-events-none" />
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-rose-500/8 blur-3xl pointer-events-none" />
        {/* Grid */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.3) 1px, transparent 1px)', backgroundSize: '40px 40px' }}
        />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-lg shadow-pink-900/50">
            <Phone size={16} className="text-white" />
          </div>
          <span className="text-white font-bold text-lg">CallPrivada</span>
        </div>

        {/* Center content */}
        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-white text-2xl font-bold leading-tight">
              Comece a monetizar<br />
              <span className="text-pink-400">suas chamadas hoje</span>
            </h2>
            <p className="text-gray-500 text-sm mt-2 leading-relaxed">
              Tudo que você precisa para vender através de chamadas falsas convincentes.
            </p>
          </div>

          {/* Perks list */}
          <ul className="space-y-3">
            {PERKS.map((perk) => {
              const Icon = perk.icon;
              return (
                <li key={perk.text} className="flex items-start gap-3">
                  <div className={`w-7 h-7 rounded-lg ${perk.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                    <Icon size={13} className={perk.color} />
                  </div>
                  <span className="text-gray-300 text-sm leading-snug">{perk.text}</span>
                </li>
              );
            })}
          </ul>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {STATS.map(s => (
              <div key={s.label} className="bg-white/[0.04] border border-white/8 rounded-2xl p-3 text-center">
                <p className="text-pink-400 text-xl font-bold">{s.value}</p>
                <p className="text-gray-500 text-[11px] mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom quote */}
        <div className="relative z-10">
          <div className="bg-white/[0.04] border border-white/8 rounded-2xl p-4">
            <p className="text-gray-300 text-sm leading-relaxed italic">
              "Crie chamadas convincentes e monetize cada segundo de atenção do seu lead."
            </p>
            <div className="flex items-center gap-2 mt-3">
              <div className="w-7 h-7 rounded-full bg-pink-600/30 flex items-center justify-center">
                <span className="text-pink-400 text-xs font-bold">CP</span>
              </div>
              <div>
                <p className="text-white text-xs font-medium">CallPrivada</p>
                <p className="text-gray-600 text-[10px]">A ferramenta de vendas por chamada</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Right: form ── */}
      <section className="flex-1 flex items-center justify-center px-8 py-12">
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
              Criar conta<br />
              <span className="font-light text-gray-400">é grátis</span>
            </h1>
            <p className="text-gray-500 text-sm mt-2">Comece em menos de 5 minutos</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-start gap-2.5 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3">
                <span className="mt-0.5 shrink-0">⚠</span>
                <span>{error}</span>
              </div>
            )}

            <div className="auth-el auth-d2 space-y-1.5">
              <label className="text-sm font-medium text-gray-400">Nome</label>
              <div className="glass-input-wrap">
                <input
                  type="text"
                  required
                  minLength={2}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                />
              </div>
            </div>

            <div className="auth-el auth-d3 space-y-1.5">
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

            <div className="auth-el auth-d4 space-y-1.5">
              <label className="text-sm font-medium text-gray-400">Senha</label>
              <div className="glass-input-wrap relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="mínimo 8 caracteres"
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
              {/* Password strength hints */}
              {password.length > 0 && (
                <div className="flex gap-1 pt-1">
                  {[password.length >= 8, /[A-Z]/.test(password), /[0-9]/.test(password)].map((ok, i) => (
                    <div key={i} className={`flex-1 h-1 rounded-full transition-colors ${ok ? 'bg-pink-500' : 'bg-white/10'}`} />
                  ))}
                </div>
              )}
            </div>

            {/* Terms */}
            <div className="auth-el auth-d5">
              <p className="text-xs text-gray-600 leading-relaxed">
                Ao criar conta, você concorda com nossos{' '}
                <span className="text-pink-400 cursor-pointer hover:underline">Termos de Uso</span>
                {' '}e{' '}
                <span className="text-pink-400 cursor-pointer hover:underline">Política de Privacidade</span>.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="auth-el auth-d6 w-full rounded-2xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3.5 text-sm transition-all shadow-lg shadow-pink-900/40 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Criando conta…
                </>
              ) : (
                <>
                  <Check size={15} />
                  Criar conta grátis
                </>
              )}
            </button>
          </form>

          <p className="auth-el auth-d7 text-center text-sm text-gray-600 mt-6">
            Já tem conta?{' '}
            <Link to="/login" className="text-pink-400 hover:text-pink-300 font-medium transition-colors">
              Entrar
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
