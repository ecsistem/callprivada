import { Clock, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PendingApprovalPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#120208] flex items-center justify-center px-4">
      {/* Glow background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[#FE015C]/5 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md text-center">
        {/* Icon */}
        <div className="mx-auto w-20 h-20 rounded-3xl bg-[#FE015C]/10 border border-[#FE015C]/20 flex items-center justify-center mb-6">
          <Clock size={36} className="text-[#FE015C]" />
        </div>

        {/* Headline */}
        <h1 className="text-2xl sm:text-3xl font-black text-white mb-3">
          Conta em análise
        </h1>
        <p className="text-gray-400 text-sm leading-relaxed mb-8 max-w-sm mx-auto">
          Sua conta foi criada e está aguardando aprovação do administrador.
          Você receberá acesso assim que for aprovado.
        </p>

        {/* Info card */}
        <div className="bg-[#1c0510] border border-white/8 rounded-2xl p-5 mb-8 text-left">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#FE015C]/15 border border-[#FE015C]/20 flex items-center justify-center shrink-0 mt-0.5">
              <Mail size={14} className="text-[#FE015C]" />
            </div>
            <div>
              <p className="text-white text-sm font-semibold mb-0.5">O que acontece agora?</p>
              <p className="text-gray-500 text-xs leading-relaxed">
                Nossa equipe irá revisar sua conta. Assim que aprovada, você poderá fazer login e acessar o dashboard normalmente.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-3 rounded-xl font-bold text-sm border border-white/12 hover:border-white/25 hover:bg-white/5 text-gray-300 hover:text-white transition-all"
          >
            Voltar ao login
          </button>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 rounded-xl font-bold text-sm bg-[#FE015C] hover:bg-[#FD267D] text-white transition-all shadow-lg shadow-[#FE015C]/25"
          >
            Ir para a home
          </button>
        </div>
      </div>
    </div>
  );
}
