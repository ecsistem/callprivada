import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listUpsells, deletePresell, type PresellPage } from '../services/presellService';
import {
  Plus, ExternalLink, Edit3, Trash2, Copy, Check, TrendingUp,
} from 'lucide-react';

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

const TEMPLATE_LABELS: Record<string, string> = {
  'upsell-vip': '💎 VIP Upgrade',
  'upsell-premium': '🔥 Premium',
  'upsell-bonus': '🎁 Bônus',
};

export default function UpsellsPage() {
  const qc = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['upsells', 1],
    queryFn: () => listUpsells(1),
  });

  const deleteMutation = useMutation({
    mutationFn: deletePresell,
    onSuccess: () => {
      setDeletingId(null);
      qc.invalidateQueries({ queryKey: ['upsells'] });
    },
    onSettled: () => setDeletingId(null),
  });

  const pages: PresellPage[] = data?.data ?? [];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">Upsell Pages</h1>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-500/15 text-purple-400 border border-purple-500/20">
              pós-call
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-1">Páginas exibidas após a ligação ou durante um evento de upsell</p>
        </div>
        <Link to="/upsell/new"
          className="flex items-center gap-2 bg-[#FE015C] hover:bg-[#FD267D] text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-[#FE015C]/20">
          <Plus size={16} />Nova upsell
        </Link>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[0,1,2].map(i => <div key={i} className="h-24 bg-white/5 rounded-2xl animate-pulse" />)}
        </div>
      )}

      {!isLoading && pages.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-4">
            <TrendingUp size={24} className="text-purple-400" />
          </div>
          <p className="text-white font-semibold text-lg mb-1">Nenhuma upsell criada</p>
          <p className="text-gray-500 text-sm mb-5 max-w-xs">Crie uma página de upsell para exibir depois da ligação e aumentar o ticket médio</p>
          <Link to="/upsell/new"
            className="flex items-center gap-2 bg-[#FE015C] hover:bg-[#FD267D] text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-all">
            <Plus size={16} />Criar upsell
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {pages.map(p => {
          const publicUrl = `${window.location.origin}/u/${p.slug}`;
          return (
            <div key={p.id}
              className="bg-[#18181b] border border-white/5 hover:border-white/10 rounded-2xl p-4 flex items-center gap-4 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
                <TrendingUp size={18} className="text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-white font-semibold text-sm truncate">{p.config.name || p.slug}</p>
                  {p.template_slug && (
                    <span className="text-xs text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded-md shrink-0">
                      {TEMPLATE_LABELS[p.template_slug] ?? p.template_slug}
                    </span>
                  )}
                </div>
                <p className="text-gray-500 text-xs mt-0.5 truncate">{publicUrl}</p>
                <div className="flex items-center gap-3 mt-1">
                  <CopyButton text={publicUrl} />
                  <a href={`/u/${p.slug}`} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-400 transition-colors font-medium">
                    <ExternalLink size={11} />Abrir
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Link to={`/upsell/${p.id}/edit`}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-600 hover:text-white hover:bg-white/5 transition-all">
                  <Edit3 size={14} />
                </Link>
                {deletingId === p.id ? (
                  <div className="flex items-center gap-1">
                    <button onClick={() => deleteMutation.mutate(p.id)}
                      disabled={deleteMutation.isPending}
                      className="text-xs px-2 py-1 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all disabled:opacity-50">
                      {deleteMutation.isPending ? '…' : 'Confirmar'}
                    </button>
                    <button onClick={() => setDeletingId(null)}
                      className="text-xs px-2 py-1 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 transition-all">
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setDeletingId(p.id)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
