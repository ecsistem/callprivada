import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient, useQueries } from '@tanstack/react-query';
import { listCalls, deleteCall, type Call } from '../services/callService';
import { listEvents } from '../services/eventService';
import { getPresellsByCallId } from '../services/presellService';
import {
  Plus, Phone, ExternalLink, Edit3, Trash2,
  BarChart2, Copy, Check, Flame, Rocket,
  ListOrdered, LayoutTemplate, AlertTriangle,
} from 'lucide-react';

function StatusDot({ status }: { status: Call['status'] }) {
  const cfg = {
    active: { dot: 'bg-green-400 animate-pulse', text: 'text-green-400', label: 'Ativo', bg: 'bg-green-500/10' },
    disabled: { dot: 'bg-gray-500', text: 'text-gray-500', label: 'Pausado', bg: 'bg-gray-500/10' },
    expired: { dot: 'bg-red-500', text: 'text-red-400', label: 'Expirado', bg: 'bg-red-500/10' },
  }[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${cfg.text} ${cfg.bg} px-2.5 py-1 rounded-full`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy(e: React.MouseEvent) {
    e.preventDefault();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button onClick={copy}
      className="flex items-center gap-1 text-xs text-gray-500 hover:text-green-400 transition-colors font-medium">
      {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
      {copied ? 'Copiado!' : 'Copiar link'}
    </button>
  );
}

function HealthBadge({ ok, label, warnLabel }: { ok: boolean; label: string; warnLabel: string }) {
  if (ok) return (
    <span className="inline-flex items-center gap-1 text-[10px] text-green-500/70 font-medium">
      <Check size={10} />{label}
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-yellow-500/80 font-medium">
      <AlertTriangle size={10} />{warnLabel}
    </span>
  );
}

function CallCard({
  call,
  eventCount,
  presellCount,
  onDelete,
  isDeleting,
}: {
  call: Call;
  eventCount: number | undefined;
  presellCount: number | undefined;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const publicLink = `${window.location.origin}/c/${call.slug}`;

  const hasEvents = (eventCount ?? 0) > 0;
  const hasPresell = (presellCount ?? 0) > 0;
  const hasPhoto = !!call.contact_photo_url;
  const healthScore = [hasEvents, hasPresell, hasPhoto].filter(Boolean).length;

  return (
    <div className={`bg-[#18181b] border rounded-2xl p-5 transition-all ${
      call.status === 'active' ? 'border-white/5 hover:border-white/10' : 'border-white/[0.03] opacity-75'
    }`}>
      <div className="flex items-start justify-between gap-4">
        {/* Info */}
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 overflow-hidden ${
            call.status === 'active' ? 'bg-green-500/10' : 'bg-white/5'
          }`}>
            {call.contact_photo_url ? (
              <img src={call.contact_photo_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <Phone size={18} className={call.status === 'active' ? 'text-green-400' : 'text-gray-500'} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-white truncate">{call.title}</p>
              <StatusDot status={call.status} />
              {healthScore < 3 && call.status === 'active' && (
                <span className="text-[10px] text-yellow-500/70 bg-yellow-500/10 border border-yellow-500/20 px-1.5 py-0.5 rounded-full font-medium">
                  {3 - healthScore} pendência{3 - healthScore > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              Contato: <span className="text-gray-400">{call.display_name}</span>
            </p>

            {/* Health mini bar */}
            <div className="flex items-center gap-3 mt-2">
              <HealthBadge ok={hasEvents} label={`${eventCount} evento${eventCount !== 1 ? 's' : ''}`} warnLabel="sem eventos" />
              <span className="text-white/10">·</span>
              <HealthBadge ok={hasPresell} label={`${presellCount} presell`} warnLabel="sem presell" />
              <span className="text-white/10">·</span>
              <HealthBadge ok={hasPhoto} label="foto" warnLabel="sem foto" />
            </div>

            <div className="flex items-center gap-3 mt-2.5 flex-wrap">
              <code className="text-xs text-gray-600 font-mono bg-white/5 px-2 py-0.5 rounded-lg">
                /c/{call.slug}
              </code>
              <CopyButton text={publicLink} />
              <a href={`/c/${call.slug}`} target="_blank" rel="noreferrer"
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors">
                <ExternalLink size={12} />Testar
              </a>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <Link to={`/calls/${call.id}/timeline`}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all text-gray-500 hover:text-purple-400 hover:bg-purple-500/10"
            title="Timeline de eventos">
            <ListOrdered size={16} />
          </Link>
          <Link to={`/calls/${call.id}/analytics`}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/5 transition-all"
            title="Analytics">
            <BarChart2 size={16} />
          </Link>
          <Link to={`/calls/${call.id}/edit`}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/5 transition-all"
            title="Editar">
            <Edit3 size={16} />
          </Link>
          {confirmDelete ? (
            <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-1.5">
              <button onClick={onDelete} disabled={isDeleting}
                className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors disabled:opacity-50">
                {isDeleting ? 'Excluindo…' : 'Confirmar'}
              </button>
              <span className="text-gray-600">·</span>
              <button onClick={() => setConfirmDelete(false)} className="text-xs text-gray-500 hover:text-gray-300">
                Cancelar
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
              title="Excluir">
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CallsPage() {
  const qc = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['calls', 1],
    queryFn: () => listCalls(1, 50),
  });

  const calls = data?.data ?? [];

  const eventsQueries = useQueries({
    queries: calls.map(c => ({
      queryKey: ['events', c.id],
      queryFn: () => listEvents(c.id),
    })),
  });

  const presellsQueries = useQueries({
    queries: calls.map(c => ({
      queryKey: ['call-presells', c.id],
      queryFn: () => getPresellsByCallId(c.id),
    })),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCall,
    onSuccess: () => {
      setDeletingId(null);
      qc.invalidateQueries({ queryKey: ['calls'] });
    },
    onSettled: () => setDeletingId(null),
  });

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">Funis de Chamada</h1>
            {calls.some(c => c.status === 'active') && (
              <span className="flex items-center gap-1 text-xs text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full font-medium">
                <Flame size={10} />
                {calls.filter(c => c.status === 'active').length} rodando
              </span>
            )}
          </div>
          <p className="text-gray-500 text-sm mt-0.5">
            {data ? `${data.total} funil${data.total !== 1 ? 'is' : ''} configurado${data.total !== 1 ? 's' : ''}` : 'Carregando…'}
          </p>
        </div>
        <Link to="/calls/new"
          className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-green-900/30">
          <Plus size={16} />
          Novo funil
        </Link>
      </div>

      {/* Legenda de saúde — só se houver chamadas */}
      {calls.length > 0 && (
        <div className="flex flex-wrap gap-4 text-[11px] text-gray-600">
          <span className="flex items-center gap-1"><Check size={11} className="text-green-500/70" />completo</span>
          <span className="flex items-center gap-1"><AlertTriangle size={11} className="text-yellow-500/70" />pendente</span>
          <span className="flex items-center gap-1"><ListOrdered size={11} className="text-purple-400/60" />timeline</span>
          <span className="flex items-center gap-1"><LayoutTemplate size={11} className="text-blue-400/60" />presell</span>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {[0,1,2].map(i => (
            <div key={i} className="bg-[#18181b] border border-white/5 rounded-2xl h-28 animate-pulse" />
          ))}
        </div>
      ) : calls.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-2xl bg-[#18181b] border border-white/5 flex items-center justify-center mb-5">
            <Rocket size={32} className="text-gray-600" />
          </div>
          <p className="text-white font-semibold text-lg mb-2">Nenhum funil criado ainda</p>
          <p className="text-gray-500 text-sm mb-2 max-w-sm leading-relaxed">
            Crie sua primeira chamada fake e jogue o link no funil — o lead abre e vê você ligando pra ele.
          </p>
          <p className="text-gray-700 text-xs mb-7">Funciona em página de obrigado, story, direct e e-mail</p>
          <Link to="/calls/new"
            className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold px-5 py-3 rounded-xl transition-all shadow-lg shadow-green-900/30">
            <Plus size={16} />
            Criar primeiro funil
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {calls.map((call, i) => (
            <CallCard
              key={call.id}
              call={call}
              eventCount={eventsQueries[i]?.data?.length}
              presellCount={presellsQueries[i]?.data?.length}
              onDelete={() => { setDeletingId(call.id); deleteMutation.mutate(call.id); }}
              isDeleting={deletingId === call.id && deleteMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}
