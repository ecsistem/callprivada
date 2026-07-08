import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getCallAnalytics } from '../services/analyticsService';
import { getPresellsByCallId } from '../services/presellService';
import { ArrowLeft, Eye, Clock, Monitor, Globe, Cpu, TrendingUp, MousePointerClick, LayoutTemplate } from 'lucide-react';

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 text-xs text-right text-gray-500 shrink-0 truncate">{label}</span>
      <div className="flex-1 bg-white/5 rounded-full h-1.5">
        <div className="bg-green-500 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-xs text-gray-400 text-right shrink-0 font-mono">{value}</span>
    </div>
  );
}

function Section({ title, icon, data }: { title: string; icon: React.ReactNode; data: Record<string, number> }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const max = entries[0]?.[1] ?? 1;
  if (entries.length === 0) return null;
  return (
    <div className="bg-[#18181b] border border-white/5 rounded-2xl p-5 space-y-3">
      <div className="flex items-center gap-2">
        <div className="text-gray-500">{icon}</div>
        <p className="text-sm font-semibold text-white">{title}</p>
      </div>
      <div className="space-y-2.5">
        {entries.map(([k, v]) => <Bar key={k} label={k} value={v} max={max} />)}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="bg-[#18181b] border border-white/5 rounded-2xl p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-white mt-0.5">{value}</p>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['analytics', id],
    queryFn: () => getCallAnalytics(id!),
    enabled: !!id,
  });

  const { data: linkedPresells = [] } = useQuery({
    queryKey: ['call-presells', id],
    queryFn: () => getPresellsByCallId(id!),
    enabled: !!id,
  });

  function formatTime(seconds: number) {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to={`/calls/${id}/edit`} className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/5 transition-all">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-gray-500 text-sm mt-0.5">Dados de visitas e comportamento</p>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[0,1].map(i => <div key={i} className="bg-[#18181b] border border-white/5 rounded-2xl h-24 animate-pulse" />)}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[0,1,2].map(i => <div key={i} className="bg-[#18181b] border border-white/5 rounded-2xl h-36 animate-pulse" />)}
          </div>
        </div>
      )}

      {isError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl px-5 py-4 text-red-400 text-sm">
          Erro ao carregar analytics da chamada.
        </div>
      )}

      {data && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              icon={<Eye size={20} className="text-green-400" />}
              label="Total de visitas"
              value={data.total_visits.toLocaleString('pt-BR')}
              color="bg-green-500/10"
            />
            <StatCard
              icon={<Clock size={20} className="text-blue-400" />}
              label="Tempo médio assistido"
              value={formatTime(data.avg_watched)}
              color="bg-blue-500/10"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Section title="Dispositivos" icon={<Monitor size={14} />} data={data.devices} />
            <Section title="Navegadores" icon={<Globe size={14} />} data={data.browsers} />
            <Section title="Sistemas" icon={<Cpu size={14} />} data={data.os_list} />
          </div>

          {data.top_referrers.length > 0 && (
            <div className="bg-[#18181b] border border-white/5 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Globe size={14} className="text-gray-500" />
                <p className="text-sm font-semibold text-white">Principais origens</p>
              </div>
              <div className="space-y-2.5">
                {(() => {
                  const max = data.top_referrers[0]?.count ?? 1;
                  return data.top_referrers.map(r => (
                    <Bar key={r.source} label={r.source} value={r.count} max={max} />
                  ));
                })()}
              </div>
            </div>
          )}

          {/* Funil de conversão */}
          {linkedPresells.length > 0 && (
            <div className="bg-[#18181b] border border-white/5 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <TrendingUp size={14} className="text-purple-400" />
                <p className="text-sm font-semibold text-white">Funil de conversão</p>
              </div>
              <div className="space-y-3">
                {linkedPresells.map(p => {
                  const convRate = data.total_visits > 0 ? Math.round((p.cta_clicks / data.total_visits) * 100) : 0;
                  return (
                    <div key={p.id} className="rounded-xl bg-white/[0.02] border border-white/5 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <LayoutTemplate size={14} className="text-green-400 shrink-0" />
                          <span className="text-sm text-white font-medium truncate">{p.config.name || p.config.headline?.slice(0, 40) || p.slug}</span>
                          <span className="text-xs text-gray-600">/p/{p.slug}</span>
                        </div>
                        <a href={`/presell/${p.id}/edit`} className="text-xs text-gray-500 hover:text-white shrink-0 ml-2">Editar</a>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-1.5">
                          <MousePointerClick size={13} className="text-blue-400" />
                          <span className="text-gray-400">{p.cta_clicks.toLocaleString('pt-BR')}</span>
                          <span className="text-gray-600 text-xs">cliques no CTA</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Eye size={13} className="text-green-400" />
                          <span className="text-gray-400">{data.total_visits.toLocaleString('pt-BR')}</span>
                          <span className="text-gray-600 text-xs">visitas na call</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <TrendingUp size={13} className="text-purple-400" />
                          <span className={`font-semibold ${convRate >= 20 ? 'text-green-400' : convRate >= 10 ? 'text-yellow-400' : 'text-red-400'}`}>{convRate}%</span>
                          <span className="text-gray-600 text-xs">conversão</span>
                        </div>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-1.5">
                        <div className="bg-purple-500 h-1.5 rounded-full transition-all" style={{ width: `${Math.min(convRate, 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {data.total_visits === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#18181b] border border-white/5 flex items-center justify-center mb-3">
                <Eye size={24} className="text-gray-600" />
              </div>
              <p className="text-white font-medium mb-1">Nenhuma visita ainda</p>
              <p className="text-gray-500 text-sm">Compartilhe o link da chamada para começar a ver dados aqui.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
