import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans">

      {/* ── Nav ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-sm border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
            <span className="text-white font-black text-sm">C</span>
          </div>
          <span className="font-bold text-lg tracking-tight">CallPrivada</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/login')}
            className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-1.5"
          >
            Entrar
          </button>
          <button
            onClick={() => navigate('/register')}
            className="text-sm font-semibold bg-gradient-to-r from-pink-500 to-rose-600 text-white px-4 py-2 rounded-xl hover:opacity-90 transition-opacity"
          >
            Criar conta grátis
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="pt-32 pb-20 px-6 text-center max-w-xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-pink-500/10 border border-pink-500/20 rounded-full px-4 py-1.5 text-pink-400 text-xs font-semibold mb-6">
          🔥 A plataforma que seus concorrentes não querem que você conheça
        </div>
        <h1 className="text-4xl font-black leading-tight mb-4">
          Venda seus conteúdos de forma{' '}
          <span className="bg-gradient-to-r from-pink-500 to-rose-400 bg-clip-text text-transparent">
            simples, justa e global
          </span>
        </h1>
        <p className="text-gray-400 text-base leading-relaxed mb-8">
          Monetize seu conteúdo de videochamada WhatsApp. Seus leads pagam por uma chamada privada ao vivo.
        </p>
        <button
          onClick={() => navigate('/register')}
          className="w-full max-w-xs mx-auto block py-4 rounded-2xl font-bold text-base bg-gradient-to-r from-pink-500 to-rose-600 text-white hover:opacity-90 transition-opacity shadow-lg shadow-pink-500/30"
        >
          Criar conta gratuitamente
        </button>
        <p className="text-xs text-gray-600 mt-3">Sem cartão de crédito • Pronto em minutos</p>
      </section>

      {/* ── Phone mockup ── */}
      <section className="px-6 pb-16 flex justify-center">
        <div className="relative w-56">
          <div className="bg-[#111b21] rounded-[2.5rem] border-4 border-[#1f2c34] shadow-2xl overflow-hidden aspect-[9/19]">
            {/* Status bar */}
            <div className="bg-[#075e54] px-4 pt-10 pb-3 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-pink-500 flex items-center justify-center text-xs font-bold">A</div>
              <div>
                <p className="text-white text-xs font-semibold">Ana Carolina</p>
                <p className="text-green-300 text-[10px]">chamada de vídeo</p>
              </div>
              <div className="ml-auto flex gap-2">
                <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
                </div>
              </div>
            </div>
            {/* Video area */}
            <div className="bg-gradient-to-b from-[#0d1117] to-[#1a1a2e] h-40 flex items-center justify-center relative">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-400 to-rose-600 flex items-center justify-center text-2xl font-black">A</div>
              <div className="absolute bottom-2 right-2 w-10 h-14 bg-[#222] rounded-xl border border-white/10" />
            </div>
            {/* Controls */}
            <div className="bg-[#111b21] px-4 py-3 flex justify-around">
              {['🎤','📷','💬','⋯'].map(ic => (
                <div key={ic} className="w-9 h-9 rounded-full bg-[#2a3942] flex items-center justify-center text-sm">{ic}</div>
              ))}
            </div>
            {/* Chat */}
            <div className="bg-[#0d1117] p-3 space-y-2">
              <div className="bg-[#1f2c34] rounded-2xl rounded-tl-sm px-3 py-2 text-xs text-gray-300 max-w-[80%]">
                Oi amor, tô te esperando 🔥
              </div>
              <div className="bg-[#005c4b] rounded-2xl rounded-tr-sm px-3 py-2 text-xs text-white max-w-[80%] ml-auto">
                Chega logo 😍
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Por que escolher ── */}
      <section className="px-6 pb-16 max-w-lg mx-auto">
        <h2 className="text-2xl font-black text-center mb-8">
          Por que escolher a <span className="text-pink-400">CallPrivada?</span>
        </h2>
        <div className="space-y-4">
          {[
            { icon: '⚡', title: 'Fácil de usar', desc: 'Faça upload do seu vídeo e comece a monetizar em minutos.' },
            { icon: '💰', title: 'Taxa justa', desc: 'Apenas 10% + R$0 em cada venda. Sem mensalidade.' },
            { icon: '🚀', title: 'Saques rápidos', desc: 'Receba via PIX a qualquer momento, sem burocracia.' },
            { icon: '🔒', title: 'Segurança e privacidade', desc: 'Todo o processo pensado para proteger você e seus dados.' },
            { icon: '📹', title: 'Lives com gravação', desc: 'Crie funis de chamada ao vivo com vídeos gravados. Seus leads não percebem a diferença.' },
          ].map(f => (
            <div key={f.title} className="flex gap-4 bg-white/[0.03] border border-white/5 rounded-2xl p-4">
              <div className="text-2xl shrink-0 mt-0.5">{f.icon}</div>
              <div>
                <p className="font-bold text-sm text-white mb-0.5">{f.title}</p>
                <p className="text-gray-400 text-sm leading-snug">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Como funciona ── */}
      <section className="px-6 pb-16 max-w-lg mx-auto">
        <h2 className="text-2xl font-black text-center mb-2">Como funciona</h2>
        <p className="text-gray-400 text-sm text-center mb-8">Entenda o passo a passo do sistema em 3 etapas simples.</p>
        <div className="space-y-4">
          {[
            { n: '1', title: 'Cadastro Rápido', desc: 'Crie sua conta grátis em minutos. Configure seu perfil, escolha seu nome de contato e comece a vender imediatamente.' },
            { n: '2', title: 'Envio Simples', desc: 'Faça upload do vídeo. Configure o valor da cobrança PIX e compartilhe o link da sua "chamada" com seus leads.' },
            { n: '3', title: 'Venda Global', desc: 'Seu lead entra na chamada, interage com o vídeo ao vivo e paga via PIX para continuar assistindo.' },
          ].map(s => (
            <div key={s.n} className="flex gap-4 bg-white/[0.03] border border-white/5 rounded-2xl p-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-sm font-black shrink-0">
                {s.n}
              </div>
              <div>
                <p className="font-bold text-sm text-white mb-0.5">{s.title}</p>
                <p className="text-gray-400 text-sm leading-snug">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Converse e ganhe ── */}
      <section className="px-6 pb-16 max-w-lg mx-auto text-center">
        <h2 className="text-2xl font-black mb-3">
          Converse e{' '}
          <span className="bg-gradient-to-r from-pink-500 to-rose-400 bg-clip-text text-transparent">
            ganhe mais
          </span>{' '}
          com seus fãs
        </h2>
        <p className="text-gray-400 text-sm leading-relaxed mb-6">
          Além de vender seus packs, você pode cobrar diretamente com camadas de pagamento durante a chamada — cobra na entrada, no meio, no fim. O lead paga achando que está desbloqueando momentos exclusivos ao vivo.
        </p>
        <div className="space-y-3 text-left mb-8">
          {[
            'PIX integrado na chamada',
            'Cobranças múltiplas durante a exibição',
            'Controla cada cobrança',
            'Dashboard com analytics em tempo real',
          ].map(i => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-pink-500/20 flex items-center justify-center shrink-0">
                <svg className="w-3 h-3 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm text-gray-300">{i}</p>
            </div>
          ))}
        </div>
        <button
          onClick={() => navigate('/register')}
          className="w-full py-4 rounded-2xl font-bold text-base bg-gradient-to-r from-pink-500 to-rose-600 text-white hover:opacity-90 transition-opacity shadow-lg shadow-pink-500/30"
        >
          Quero começar agora
        </button>
      </section>

      {/* ── CTA final ── */}
      <section className="px-6 pb-24 max-w-lg mx-auto text-center">
        <div className="bg-gradient-to-br from-pink-500/10 to-rose-600/10 border border-pink-500/20 rounded-3xl p-8">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-black text-lg">C</span>
          </div>
          <h3 className="text-xl font-black mb-2">CallPrivada</h3>
          <p className="text-gray-400 text-sm mb-6">
            Viva a experiência única das videochamadas exclusivas na palma da sua mão.
          </p>
          <button
            onClick={() => navigate('/register')}
            className="w-full py-4 rounded-2xl font-bold text-base bg-gradient-to-r from-pink-500 to-rose-600 text-white hover:opacity-90 transition-opacity"
          >
            Criar conta grátis
          </button>
          <p className="text-xs text-gray-600 mt-3">Sem cartão de crédito necessário</p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 px-6 py-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
            <span className="text-white font-black text-xs">C</span>
          </div>
          <span className="font-bold text-sm">CallPrivada</span>
        </div>
        <p className="text-gray-600 text-xs">© 2026 CallPrivada. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
