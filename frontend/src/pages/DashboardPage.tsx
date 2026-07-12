import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Phone, Video, CreditCard, Zap, Plus,
  Eye, TrendingUp, ArrowUpRight, Activity,
  Flame, Target, Rocket, ChevronRight, Sparkles,
  DollarSign, CheckCircle2, Clock,
} from 'lucide-react';
import { getDashboardSummary, getPaymentStats, type PaymentPeriod } from '../services/dashboardService';
import { useAuthStore } from '../stores/authStore';
import { useWebSocket, type WSEvent } from '../hooks/useWebSocket';
import { WSToastList, makeToast, type Toast } from '../components/WSToast';
import { formatPrice } from '../lib/currency';

function intervalLabel(interval: string) {
  switch (interval) {
    case 'MONTHLY': return '/mês';
    case 'SEMIANNUALLY': return '/6 meses';
    case 'ANNUALLY': return '/ano';
    default: return '';
  }
}

function StatCard({
  label, value, icon, sub, color,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  sub?: string;
  color: string;
}) {
  return (
    <div className="bg-[#18181b] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          {icon}
        </div>
      </div>
      <p className="text-3xl font-bold text-white mb-1">{value}</p>
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{label}</p>
      {sub && <p className="text-xs text-gray-700 mt-1">{sub}</p>}
    </div>
  );
}

function QuickAction({
  to, icon, label, sub, variant = 'default',
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  sub: string;
  variant?: 'primary' | 'default';
}) {
  if (variant === 'primary') {
    return (
      <Link to={to}
        className="group flex items-center gap-4 bg-[#FE015C] hover:bg-[#FD267D] rounded-2xl px-5 py-4 transition-all shadow-lg shadow-[#FE015C]/20">
        <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">{icon}</div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-white">{label}</p>
          <p className="text-xs text-white/70 mt-0.5 truncate">{sub}</p>
        </div>
        <ArrowUpRight size={16} className="text-white/60 shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
      </Link>
    );
  }
  return (
    <Link to={to}
      className="group flex items-center gap-4 bg-[#18181b] border border-white/5 hover:border-white/10 hover:bg-[#1f1f23] rounded-2xl px-5 py-4 transition-all">
      <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-white/8 transition-colors">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-white">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5 truncate">{sub}</p>
      </div>
      <ArrowUpRight size={14} className="text-gray-600 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
    </Link>
  );
}

// Setup checklist for first-time users
function SetupChecklist() {
  const steps = [
    {
      n: 1,
      title: 'Faça upload do vídeo',
      desc: 'Grave você apresentando sua oferta ou prova de resultado.',
      to: '/videos',
      cta: 'Ir para vídeos',
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
    },
    {
      n: 2,
      title: 'Crie a chamada fake',
      desc: 'Configure nome, foto do contato e o vídeo da chamada.',
      to: '/calls/new',
      cta: 'Criar chamada',
      color: 'text-[#FE015C]',
      bg: 'bg-[#FE015C]/10',
      border: 'border-[#FE015C]/20',
    },
    {
      n: 3,
      title: 'Adicione eventos na timeline',
      desc: 'Popups de oferta, countdown, cobrança — tudo sincronizado ao vídeo.',
      to: '/calls/new',
      cta: 'Criar chamada →timeline',
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
    },
    {
      n: 4,
      title: 'Crie a página de presell',
      desc: 'A página de chegada que aquece o lead antes de ver a chamada.',
      to: '/presells/new',
      cta: 'Criar presell',
      color: 'text-orange-400',
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/20',
    },
    {
      n: 5,
      title: 'Jogue o link no funil',
      desc: 'Coloque na página de obrigado, story, direct ou e-mail.',
      to: '/calls',
      cta: 'Ver meus funis',
      color: 'text-pink-400',
      bg: 'bg-pink-500/10',
      border: 'border-pink-500/20',
    },
  ];

  return (
    <div className="bg-gradient-to-br from-[#FE015C]/5 via-transparent to-[#FD267D]/5 border border-[#FE015C]/15 rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-xl bg-[#FE015C]/10 flex items-center justify-center">
          <Rocket size={16} className="text-[#FE015C]" />
        </div>
        <div>
          <p className="text-white font-semibold text-sm">Primeiros passos — lance seu funil em 5 minutos</p>
          <p className="text-gray-500 text-xs mt-0.5">Siga a ordem para ter tudo funcionando do início</p>
        </div>
      </div>
      <div className="space-y-2.5">
        {steps.map((s) => (
          <Link key={s.n} to={s.to}
            className={`group flex items-center gap-4 ${s.bg} border ${s.border} rounded-xl px-4 py-3.5 hover:brightness-110 transition-all`}>
            <div className={`w-7 h-7 rounded-full border ${s.border} flex items-center justify-center shrink-0`}>
              <span className={`text-xs font-bold ${s.color}`}>{s.n}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${s.color}`}>{s.title}</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{s.desc}</p>
            </div>
            <ChevronRight size={14} className="text-gray-600 shrink-0 group-hover:text-gray-400 group-hover:translate-x-0.5 transition-all" />
          </Link>
        ))}
      </div>
    </div>
  );
}

// Funil guide — 3 passos para rodar
function FunnelGuide() {
  const steps = [
    {
      n: '01',
      title: 'Sobe o vídeo',
      desc: 'Grave ou use um vídeo de call. Pode ser você falando sobre a oferta ou provando resultado.',
      color: 'text-blue-400', bg: 'bg-blue-500/10',
    },
    {
      n: '02',
      title: 'Cria a chamada',
      desc: 'Configure o funil: nome do contato, foto e os eventos que aparecem durante o vídeo (popup, oferta, countdown).',
      color: 'text-[#FE015C]', bg: 'bg-[#FE015C]/10',
    },
    {
      n: '03',
      title: 'Dispara no funil',
      desc: 'Joga o link na página de obrigado, no story, no direct — o lead abre e vê você "ligando" pra ele.',
      color: 'text-purple-400', bg: 'bg-purple-500/10',
    },
  ];

  return (
    <div className="bg-[#18181b] border border-white/5 rounded-2xl p-5">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-7 h-7 rounded-lg bg-yellow-500/10 flex items-center justify-center">
          <Rocket size={13} className="text-yellow-400" />
        </div>
        <p className="text-sm font-semibold text-white">Como usar no seu funil</p>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        {steps.map((s, i) => (
          <div key={i} className="relative">
            {i < steps.length - 1 && (
              <ChevronRight size={14} className="absolute -right-2.5 top-1/2 -translate-y-1/2 text-gray-700 hidden sm:block" />
            )}
            <div className={`w-7 h-7 rounded-lg ${s.bg} flex items-center justify-center mb-2.5`}>
              <span className={`text-xs font-bold ${s.color}`}>{s.n}</span>
            </div>
            <p className="text-sm font-medium text-white mb-1">{s.title}</p>
            <p className="text-xs text-gray-600 leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

const PERIODS: { key: PaymentPeriod; label: string }[] = [
  { key: 'day',    label: 'Hoje' },
  { key: 'month',  label: 'Este mês' },
  { key: 'year',   label: 'Este ano' },
  { key: 'all',    label: 'Total' },
  { key: 'custom', label: 'Período' },
];

function PaymentsPanel() {
  const [period, setPeriod] = useState<PaymentPeriod>('month');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const canQuery = period !== 'custom' || (from !== '' && to !== '');

  const { data, isLoading } = useQuery({
    queryKey: ['payment-stats', period, from, to],
    queryFn: () => getPaymentStats(period, from, to),
    enabled: canQuery,
  });

  const convRate = data && data.generated > 0
    ? Math.round((data.paid / data.generated) * 100)
    : 0;

  return (
    <div className="bg-[#18181b] border border-white/5 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 flex items-center justify-between gap-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <DollarSign size={17} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Pagamentos</p>
            <p className="text-xs text-gray-500 mt-0.5">Cobranças geradas e pagas</p>
          </div>
        </div>

        {/* Period tabs */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1">
            {PERIODS.map(p => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  period === p.key
                    ? 'bg-[#FE015C] text-white shadow-sm shadow-[#FE015C]/30'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {period === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={from}
                onChange={e => setFrom(e.target.value)}
                className="bg-[#1c0510] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#FE015C]/50 transition-colors"
              />
              <span className="text-gray-600 text-xs">até</span>
              <input
                type="date"
                value={to}
                min={from}
                onChange={e => setTo(e.target.value)}
                className="bg-[#1c0510] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#FE015C]/50 transition-colors"
              />
            </div>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 divide-x divide-white/5">
        {/* Gerados */}
        <div className="px-5 py-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={13} className="text-gray-500" />
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Gerados</p>
          </div>
          {isLoading ? (
            <div className="h-8 w-16 bg-white/5 rounded-lg animate-pulse" />
          ) : (
            <p className="text-3xl font-bold text-white">{data?.generated ?? 0}</p>
          )}
          <p className="text-xs text-gray-600 mt-1">cobranças criadas</p>
        </div>

        {/* Pagos */}
        <div className="px-5 py-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 size={13} className="text-emerald-500" />
            <p className="text-xs text-emerald-600 font-medium uppercase tracking-wider">Pagos</p>
          </div>
          {isLoading ? (
            <div className="h-8 w-16 bg-white/5 rounded-lg animate-pulse" />
          ) : (
            <p className="text-3xl font-bold text-emerald-400">{data?.paid ?? 0}</p>
          )}
          <p className="text-xs text-gray-600 mt-1">confirmados</p>
        </div>

        {/* Receita */}
        <div className="px-5 py-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={13} className="text-blue-500" />
            <p className="text-xs text-blue-600 font-medium uppercase tracking-wider">Receita</p>
          </div>
          {isLoading ? (
            <div className="h-8 w-24 bg-white/5 rounded-lg animate-pulse" />
          ) : (
            <p className="text-2xl font-bold text-blue-400 leading-tight">
              {formatPrice(data?.total_cents ?? 0)}
            </p>
          )}
          <p className="text-xs text-gray-600 mt-1">valor recebido</p>
        </div>
      </div>

      {/* Conversion bar */}
      {!isLoading && (data?.generated ?? 0) > 0 && (
        <div className="px-5 pb-5">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs text-gray-600">Taxa de conversão</p>
            <p className="text-xs font-semibold text-white">{convRate}%</p>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${convRate}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <p className="text-[10px] text-gray-700">0%</p>
            <p className="text-[10px] text-gray-700">100%</p>
          </div>
        </div>
      )}

      {!isLoading && (data?.generated ?? 0) === 0 && (
        <div className="px-5 pb-5 flex items-center gap-2 text-xs text-gray-600">
          <DollarSign size={13} />
          {!canQuery ? 'Selecione um período acima para filtrar' : `Nenhuma cobrança ${period === 'day' ? 'hoje' : period === 'month' ? 'neste mês' : period === 'year' ? 'neste ano' : period === 'custom' ? 'no período selecionado' : 'ainda'}`}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [toasts, setToasts] = useState<Toast[]>([]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: getDashboardSummary,
  });

  const handleWsEvent = useCallback((event: WSEvent) => {
    if (event.type === 'new_visit') {
      const p = event.payload as { call_title?: string; device?: string };
      setToasts(prev => [...prev, makeToast('new_visit', '🔥 Lead entrou na chamada!', `${p.call_title ?? 'Chamada'} — ${p.device ?? ''}`)]);
      qc.invalidateQueries({ queryKey: ['dashboard-summary'] });
    } else if (event.type === 'payment_received') {
      const p = event.payload as { call_title?: string; amount_cents?: number };
      const amount = p.amount_cents ? formatPrice(p.amount_cents) : '';
      setToasts(prev => [...prev, makeToast('payment_received', `💰 PIX recebido! ${amount}`, p.call_title ?? '')]);
    }
  }, [qc]);

  useWebSocket(handleWsEvent);

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const firstName = (user?.name || user?.email || '').split(' ')[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-7">
      <WSToastList toasts={toasts} onDismiss={dismissToast} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm flex items-center gap-1.5">
            <Flame size={13} className="text-orange-400" />
            {greeting}, {firstName} — bora fechar mais leads hoje
          </p>
          <h1 className="text-2xl font-bold text-white mt-0.5">Painel de Controle</h1>
        </div>
        <Link to="/calls/new"
          className="flex items-center gap-2 bg-[#FE015C] hover:bg-[#FD267D] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-[#FE015C]/30">
          <Plus size={16} />
          Novo funil
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {isLoading ? (
          [0,1,2].map(i => (
            <div key={i} className="bg-[#18181b] border border-white/5 rounded-2xl h-32 animate-pulse" />
          ))
        ) : isError ? (
          <div className="col-span-3 text-gray-500 text-sm py-4">Não foi possível carregar as métricas.</div>
        ) : data && (
          <>
            <StatCard
              label="Funis criados"
              value={data.calls_count}
              icon={<Phone size={18} className="text-[#FE015C]" />}
              sub="Chamadas configuradas"
              color="bg-[#FE015C]/10"
            />
            <StatCard
              label="Funis ativos"
              value={data.active_links}
              icon={<Target size={18} className="text-blue-400" />}
              sub="Recebendo tráfego agora"
              color="bg-blue-500/10"
            />
            <StatCard
              label="Leads alcançados"
              value={data.total_views}
              icon={<Eye size={18} className="text-purple-400" />}
              sub="Total de visualizações"
              color="bg-purple-500/10"
            />
          </>
        )}
      </div>

      {/* Payments panel */}
      <PaymentsPanel />

      {/* Onboarding checklist for new users, compact guide for returning ones */}
      {data?.calls_count === 0 ? <SetupChecklist /> : <FunnelGuide />}

      {/* Plan banner */}
      {data !== undefined && (
        <div className={`rounded-2xl p-5 border ${data.plan ? 'bg-[#FE015C]/5 border-[#FE015C]/15' : 'bg-yellow-500/5 border-yellow-500/20'}`}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${data.plan ? 'bg-[#FE015C]/10' : 'bg-yellow-500/10'}`}>
                <TrendingUp size={18} className={data.plan ? 'text-[#FE015C]' : 'text-yellow-400'} />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-0.5">Plano</p>
                {data.plan ? (
                  <p className="text-white font-semibold">
                    {data.plan.name}
                    <span className="text-gray-400 font-normal text-sm ml-2">
                      {formatPrice(data.plan.price_cents)}{intervalLabel(data.plan.interval)}
                    </span>
                  </p>
                ) : (
                  <p className="text-yellow-400 font-medium text-sm">Sem plano ativo — você está bloqueado</p>
                )}
              </div>
            </div>
            <Link to="/subscription"
              className={`shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-all ${
                data.plan
                  ? 'text-[#FE015C] bg-[#FE015C]/10 border border-[#FE015C]/20 hover:bg-[#FE015C]/15'
                  : 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/30 hover:bg-yellow-500/15'
              }`}>
              <Activity size={13} />
              {data.plan ? 'Gerenciar plano' : 'Ativar agora'}
            </Link>
          </div>
          {!data.plan && (
            <p className="text-xs text-yellow-700 mt-3 pl-[52px]">
              Assine para criar funis e escalar suas vendas com chamadas fake.
            </p>
          )}
        </div>
      )}

      {/* Quick actions */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={13} className="text-gray-600" />
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Ações rápidas</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <QuickAction
            to="/calls/new"
            icon={<Plus size={18} className="text-white" />}
            label="Criar novo funil"
            sub="Configure uma chamada fake para sua oferta"
            variant="primary"
          />
          <QuickAction
            to="/calls"
            icon={<Phone size={18} className="text-gray-400" />}
            label="Meus funis"
            sub="Gerenciar e copiar links de chamada"
          />
          <QuickAction
            to="/videos"
            icon={<Video size={18} className="text-gray-400" />}
            label="Meus vídeos"
            sub="Upload do conteúdo da chamada"
          />
          <QuickAction
            to="/subscription"
            icon={<CreditCard size={18} className="text-gray-400" />}
            label="Assinatura"
            sub="Plano e pagamento via PIX"
          />
          <QuickAction
            to="/settings/payment"
            icon={<Zap size={18} className="text-gray-400" />}
            label="Configurar PIX"
            sub="Credenciais para cobrar na entrada"
          />
        </div>
      </div>
    </div>
  );
}
