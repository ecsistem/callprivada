import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../services/authService';
import { useAuthStore } from '../stores/authStore';



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
      const resp = err as { response?: { data?: { error?: { code?: string; message?: string } } } };
      if (resp?.response?.data?.error?.code === 'user_blocked') {
        navigate('/pending');
        return;
      }
      const msg = resp?.response?.data?.error?.message;
      setError(msg ?? 'Email ou senha inválidos.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#120208]">

      {/* ══ LEFT: imagem pura ═══════════════════════════════════════ */}
      <div className="hidden md:block relative overflow-hidden md:w-[55%]">
        <img
          src="/brand-hero.jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        {/* overlay escuro geral */}
        <div className="absolute inset-0 bg-black/30" />
        {/* degradê lateral → mescla com o fundo do form */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#0e0107]/40 to-[#0e0107]" />
        {/* degradê vertical suave */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#120208]/60 via-transparent to-[#120208]/60" />
      </div>

      {/* ══ RIGHT: form ═════════════════════════════════════════════ */}
      <div className="flex-1 flex items-center justify-center px-8 py-14 bg-[#0e0107]">
        <div className="w-full max-w-[380px]">

          {/* Mobile logo */}
          <div className="md:hidden flex items-center gap-3 mb-8">
            <img src="/logo.png" alt="CallPrivada" className="w-9 h-9 object-contain" />
            <p className="text-xl font-bold text-white">Call <span className="text-[#FE015C]">Privada</span></p>
          </div>

          {/* Heading */}
          <div className="mb-7">
            <h1 className="text-3xl font-bold text-white">Bem-vindo(a)</h1>
            <p className="text-gray-400 text-sm mt-1.5">
              Entre na sua conta para{' '}
              <span className="text-[#FE015C] font-medium">continuar</span>
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-6 mb-7 border-b border-white/8">
            <button className="pb-3 text-sm font-semibold text-[#FE015C] border-b-2 border-[#FE015C] -mb-px">
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
              <div className="flex items-center gap-3 bg-[#1c0510] border border-white/8 rounded-2xl px-4 py-3.5 focus-within:border-[#FE015C]/50 focus-within:bg-[#280818] transition-all">
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
              <div className="flex items-center gap-3 bg-[#1c0510] border border-white/8 rounded-2xl px-4 py-3.5 focus-within:border-[#FE015C]/50 focus-within:bg-[#280818] transition-all">
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
              <span className="text-[#FE015C] text-xs hover:underline cursor-pointer transition-colors">
                Esqueceu sua senha?
              </span>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-[#FE015C] hover:bg-[#FD267D] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 text-sm transition-all shadow-lg shadow-pink-900/40"
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
            <Link to="/register" className="text-[#FE015C] hover:underline font-medium transition-colors">
              Criar conta
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
