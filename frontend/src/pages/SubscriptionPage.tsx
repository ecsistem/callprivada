import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { listPlans, checkout, getMySubscription, cancelSubscription } from '../services/subscriptionService';
import {
  Check, CreditCard, AlertCircle, Zap, Calendar,
  TrendingUp, Target, Flame, ShieldCheck, BarChart2, Infinity,
} from 'lucide-react';
import { formatPrice } from '../lib/currency';

function intervalLabel(interval: string) {
  const map: Record<string, string> = {
    MONTHLY: 'mês', SEMIANNUALLY: 'semestre', ANNUALLY: 'ano', WEEKLY: 'semana',
  };
  return map[interval] ?? interval.toLowerCase();
}

const FEATURES = [
  { icon: Infinity, label: 'Funis ilimitados', desc: 'Crie quantas chamadas quiser, sem limite' },
  { icon: Target, label: 'Leads ilimitados', desc: 'Qualquer volume de tráfego, sem cobrança extra' },
  { icon: BarChart2, label: 'Analytics completo', desc: 'Device, referrer, tempo assistido por lead' },
  { icon: Zap, label: 'Cobrança na entrada (PIX)', desc: 'Cobrar o lead antes de entrar na chamada' },
  { icon: TrendingUp, label: 'Eventos de conversão', desc: 'Popups, ofertas e countdown no momento certo' },
  { icon: ShieldCheck, label: 'Link único por funil', desc: 'URL curta e rastreável para cada campanha' },
];

export default function SubscriptionPage() {
  const [checkoutError, setCheckoutError] = useState('');

  const { data: plans = [], isLoading: loadingPlans } = useQuery({
    queryKey: ['plans'],
    queryFn: listPlans,
  });

  const { data: sub, isLoading: loadingSub, refetch: refetchSub } = useQuery({
    queryKey: ['subscription'],
    queryFn: getMySubscription,
    retry: false,
  });

  const checkoutMutation = useMutation({
    mutationFn: checkout,
    onSuccess: (url) => { window.location.href = url; },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message;
      setCheckoutError(msg ?? 'Erro ao iniciar checkout.');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: cancelSubscription,
    onSuccess: () => refetchSub(),
  });

  const isActive = sub?.status === 'active';
  const activePlan = sub?.plan_id ? plans.find(p => p.id === sub.plan_id) : null;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Flame size={16} className="text-orange-400" />
          <h1 className="text-2xl font-bold text-white">Plano e Assinatura</h1>
        </div>
        <p className="text-gray-500 text-sm">
          Escale suas vendas com chamadas fake — pague via PIX e ative na hora.
        </p>
      </div>

      {/* Status atual */}
      {!loadingSub && (
        <div className={`rounded-2xl p-5 border ${isActive ? 'bg-green-500/5 border-green-500/20' : 'bg-[#18181b] border-white/5'}`}>
          <div className="flex items-start gap-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${isActive ? 'bg-green-500/15' : 'bg-white/5'}`}>
              <CreditCard size={20} className={isActive ? 'text-green-400' : 'text-gray-500'} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-1">Status do plano</p>
              <p className={`font-semibold ${isActive ? 'text-green-400' : 'text-gray-400'}`}>
                {isActive ? `✓ Ativo${activePlan ? ` — ${activePlan.name}` : ' — você pode criar funis'}` : sub ? sub.status : 'Sem plano ativo'}
              </p>
              {isActive && activePlan && (activePlan.max_calls > 0 || activePlan.max_presells > 0 || activePlan.max_videos > 0) && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {activePlan.max_calls > 0 && <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">até {activePlan.max_calls} chamadas</span>}
                  {activePlan.max_presells > 0 && <span className="text-[11px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">até {activePlan.max_presells} presells</span>}
                  {activePlan.max_videos > 0 && <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">até {activePlan.max_videos} vídeos</span>}
                </div>
              )}
              {sub?.current_period_end && (
                <div className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-500">
                  <Calendar size={12} />
                  Válido até {new Date(sub.current_period_end).toLocaleDateString('pt-BR')}
                </div>
              )}
            </div>
            {isActive && (
              <button
                onClick={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
                className="text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 px-3 py-1.5 rounded-xl font-medium transition-all disabled:opacity-50 shrink-0"
              >
                {cancelMutation.isPending ? 'Cancelando…' : 'Cancelar plano'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* O que está incluso */}
      <div className="bg-[#18181b] border border-white/5 rounded-2xl p-5 space-y-4">
        <p className="text-sm font-semibold text-white">O que você tem acesso</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <div key={i} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon size={13} className="text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{f.label}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{f.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Planos */}
      {!isActive && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-white">Escolha seu plano</h2>
            <p className="text-gray-500 text-sm mt-0.5">
              Pague via PIX — ativa imediatamente, sem cartão.
            </p>
          </div>

          {checkoutError && (
            <div className="flex items-start gap-2.5 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              {checkoutError}
            </div>
          )}

          {loadingPlans ? (
            <div className="space-y-3">
              {[0,1].map(i => <div key={i} className="bg-[#18181b] border border-white/5 rounded-2xl h-24 animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-3">
              {plans.map((plan, idx) => (
                <div key={plan.id}
                  className={`relative rounded-2xl p-5 border transition-all ${
                    idx === 0
                      ? 'bg-green-500/5 border-green-500/30 shadow-lg shadow-[#FE015C]/10'
                      : 'bg-[#18181b] border-white/5 hover:border-white/10'
                  }`}
                >
                  {idx === 0 && (
                    <div className="absolute -top-3 left-5">
                      <span className="flex items-center gap-1 text-xs font-bold text-white bg-green-600 px-3 py-1 rounded-full shadow-lg">
                        <Flame size={10} />Mais popular
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${idx === 0 ? 'bg-green-500/15' : 'bg-white/5'}`}>
                        <Zap size={18} className={idx === 0 ? 'text-green-400' : 'text-gray-500'} />
                      </div>
                      <div>
                        <p className="font-semibold text-white">{plan.name}</p>
                        <p className="text-sm text-gray-500 mt-0.5">
                          <span className="text-white font-bold text-xl">{formatPrice(plan.price_cents)}</span>
                          <span className="ml-1">/ {intervalLabel(plan.interval)}</span>
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => { setCheckoutError(''); checkoutMutation.mutate(plan.id); }}
                      disabled={checkoutMutation.isPending}
                      className={`shrink-0 flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl transition-all disabled:opacity-50 ${
                        idx === 0
                          ? 'bg-[#FE015C] hover:bg-[#FD267D] text-white shadow-lg shadow-[#FE015C]/20'
                          : 'bg-white/10 hover:bg-white/15 text-white'
                      }`}
                    >
                      {checkoutMutation.isPending ? (
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Check size={15} />
                      )}
                      Pagar com PIX
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-gray-700 text-center">
            Pague via PIX · Ativa na hora · Cancele quando quiser
          </p>
        </div>
      )}
    </div>
  );
}
