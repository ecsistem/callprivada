import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listCalls, type Call } from '../services/callService';
import { listPresells, listDownsells, listUpsells, type PresellPage } from '../services/presellService';
import { listEvents } from '../services/eventService';
import { useQueries } from '@tanstack/react-query';
import {
  ArrowRight, LayoutTemplate, Phone, TrendingDown, TrendingUp,
  ExternalLink, Plus, GitBranch,
} from 'lucide-react';

function FunnelArrow() {
  return (
    <div className="flex flex-col items-center gap-0.5 shrink-0 px-1">
      <div className="w-px h-3 bg-white/20" />
      <ArrowRight size={14} className="text-white/30 -rotate-0" style={{ transform: 'rotate(90deg)' }} />
      <div className="w-px h-3 bg-white/20" />
    </div>
  );
}

function FunnelNode({ icon, label, sublabel, badge, color, to }: {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  badge?: string;
  color: string;
  to?: string;
}) {
  const inner = (
    <div
      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all text-left w-full"
      style={{ background: `${color}0d`, borderColor: `${color}33` }}
    >
      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: `${color}22` }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-xs font-semibold truncate">{label}</p>
        {sublabel && <p className="text-gray-500 text-[10px] truncate">{sublabel}</p>}
      </div>
      {badge && (
        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0"
          style={{ background: `${color}22`, color }}>
          {badge}
        </span>
      )}
    </div>
  );
  if (to) {
    return (
      <a href={to} target="_blank" rel="noreferrer" className="block hover:opacity-80 transition-opacity">
        {inner}
      </a>
    );
  }
  return inner;
}

function EmptyNode({ label, to }: { label: string; to: string }) {
  return (
    <Link to={to}
      className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-dashed border-white/10 text-gray-600 hover:border-white/20 hover:text-gray-400 transition-all text-xs">
      <Plus size={12} />{label}
    </Link>
  );
}

interface CallFunnelData {
  call: Call;
  presells: PresellPage[];
  upsellEvents: { slug: string }[];
}

function CallFunnelCard({ data }: { data: CallFunnelData }) {
  const { call, presells, upsellEvents } = data;
  const { data: upsellsAll } = useQuery({
    queryKey: ['upsells', 1],
    queryFn: () => listUpsells(1),
  });
  const { data: downsellsAll } = useQuery({
    queryKey: ['downsells', 1],
    queryFn: () => listDownsells(1),
  });

  const callPresells = presells.filter(p =>
    p.config.redirect_url === `/c/${call.slug}` || p.call_id === call.id
  );
  const linkedUpsells = (upsellsAll?.data ?? []).filter(u =>
    upsellEvents.some(e => e.slug === u.slug) ||
    call.end_call_redirect_url === `/u/${u.slug}`
  );
  const linkedDownsells = (downsellsAll?.data ?? []).filter(d =>
    callPresells.some(p => p.config.downsell_slug === d.slug)
  );

  return (
    <div className="bg-[#18181b] border border-white/5 rounded-2xl p-5 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch size={14} className="text-green-400" />
          <p className="text-white font-semibold text-sm">{call.title}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <a href={`/c/${call.slug}`} target="_blank" rel="noreferrer"
            className="text-gray-600 hover:text-white transition-colors">
            <ExternalLink size={13} />
          </a>
          <Link to={`/calls/${call.id}/edit`}
            className="text-xs text-gray-600 hover:text-green-400 transition-colors font-medium">
            Editar
          </Link>
        </div>
      </div>

      {/* Funil visual: Presell → Call → Upsell */}
      <div className="flex flex-col items-center gap-1.5">
        {/* Presell(s) */}
        <div className="w-full space-y-1">
          {callPresells.length > 0 ? callPresells.map(p => (
            <FunnelNode
              key={p.id}
              icon={<LayoutTemplate size={14} />}
              label={p.config.name || p.config.headline?.slice(0, 30) || p.slug}
              sublabel={`/p/${p.slug}`}
              badge="presell"
              color="#22c55e"
              to={`/p/${p.slug}`}
            />
          )) : (
            <EmptyNode label="Vincular presell" to="/presell/new" />
          )}
        </div>

        <FunnelArrow />

        {/* Call */}
        <FunnelNode
          icon={<Phone size={14} />}
          label={call.display_name}
          sublabel={`/c/${call.slug}`}
          badge="call"
          color="#3b82f6"
          to={`/c/${call.slug}`}
        />

        <FunnelArrow />

        {/* Upsell(s) */}
        <div className="w-full space-y-1">
          {linkedUpsells.length > 0 ? linkedUpsells.map(u => (
            <FunnelNode
              key={u.id}
              icon={<TrendingUp size={14} />}
              label={u.config.headline?.slice(0, 30) || u.slug}
              sublabel={`/u/${u.slug}`}
              badge="upsell"
              color="#a855f7"
              to={`/u/${u.slug}`}
            />
          )) : (
            <EmptyNode label="Adicionar upsell" to="/upsell/new" />
          )}
        </div>
      </div>

      {/* Downsell(s) do presell */}
      {linkedDownsells.length > 0 && (
        <div className="pt-3 border-t border-white/5">
          <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1.5">Exit-intent do presell</p>
          <div className="space-y-1">
            {linkedDownsells.map(d => (
              <FunnelNode
                key={d.id}
                icon={<TrendingDown size={14} />}
                label={d.config.headline?.slice(0, 30) || d.slug}
                sublabel={`/d/${d.slug}`}
                badge="downsell"
                color="#f59e0b"
                to={`/d/${d.slug}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function FunnelsPage() {
  const { data: callsData, isLoading: loadingCalls } = useQuery({
    queryKey: ['calls', 1],
    queryFn: () => listCalls(1, 50),
  });
  const calls = callsData?.data ?? [];

  const { data: presellsData } = useQuery({
    queryKey: ['presells', 1],
    queryFn: () => listPresells(1),
  });
  const presells = presellsData?.data ?? [];

  const eventsQueries = useQueries({
    queries: calls.map(c => ({
      queryKey: ['events', c.id],
      queryFn: () => listEvents(c.id),
      enabled: calls.length > 0,
    })),
  });

  const funnelData: CallFunnelData[] = calls.map((call, i) => {
    const events = eventsQueries[i]?.data ?? [];
    const upsellEvents = events
      .filter(e => e.type === 'upsell' && e.upsell_slug)
      .map(e => ({ slug: e.upsell_slug! }));
    return { call, presells, upsellEvents };
  });

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">Funis</h1>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-500/15 text-blue-400 border border-blue-500/20">
              visão geral
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-1">Mapa completo: presell → call → upsell → downsell</p>
        </div>
        <Link to="/calls/new"
          className="flex items-center gap-2 bg-[#FE015C] hover:bg-[#FD267D] text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-[#FE015C]/20">
          <Plus size={16} />Novo funil
        </Link>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-3 text-xs">
        {[
          { color: '#22c55e', label: 'Presell — entrada do tráfego' },
          { color: '#3b82f6', label: 'Call — funil principal' },
          { color: '#a855f7', label: 'Upsell — pós-call / in-call' },
          { color: '#f59e0b', label: 'Downsell — exit-intent' },
        ].map(({ color, label }) => (
          <div key={color} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: color }} />
            <span className="text-gray-500">{label}</span>
          </div>
        ))}
      </div>

      {loadingCalls && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[0,1,2].map(i => <div key={i} className="h-48 bg-white/5 rounded-2xl animate-pulse" />)}
        </div>
      )}

      {!loadingCalls && calls.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-4">
            <GitBranch size={24} className="text-blue-400" />
          </div>
          <p className="text-white font-semibold text-lg mb-1">Nenhum funil ainda</p>
          <p className="text-gray-500 text-sm mb-5 max-w-xs">Crie uma chamada e conecte presell, upsell e downsell para montar seu funil completo</p>
          <Link to="/calls/new"
            className="flex items-center gap-2 bg-[#FE015C] hover:bg-[#FD267D] text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-all">
            <Plus size={16} />Criar chamada
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {funnelData.map(d => (
          <CallFunnelCard key={d.call.id} data={d} />
        ))}
      </div>
    </div>
  );
}
