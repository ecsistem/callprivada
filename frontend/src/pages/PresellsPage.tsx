import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listPresells, deletePresell, type PresellPage } from '../services/presellService';
import {
  Plus, ExternalLink, Edit3, Trash2, Copy, Check,
  Flame, Rocket, LayoutTemplate,
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
  formal: 'Formal',
  coach: 'Coach',
  fitness: 'Fitness',
  simple: 'Simples',
};

export default function PresellsPage() {
  const qc = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['presells', 1],
    queryFn: () => listPresells(1),
  });

  const deleteMutation = useMutation({
    mutationFn: deletePresell,
    onSuccess: () => {
      setDeletingId(null);
      qc.invalidateQueries({ queryKey: ['presells'] });
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
            <h1 className="text-2xl font-bold text-white">Presell Pages</h1>
            {pages.length > 0 && (
              <span className="flex items-center gap-1 text-xs text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full font-medium">
                <Flame size={10} />
                {pages.length} ativa{pages.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <p className="text-gray-500 text-sm mt-0.5">
            Página de agendamento de call — protege seu link e aquece o lead antes da chamada
          </p>
        </div>
        <Link to="/presell/new"
          className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-green-900/30">
          <Plus size={16} />
          Nova presell
        </Link>
      </div>

      {/* Tip */}
      <div className="flex items-start gap-3 bg-blue-500/5 border border-blue-500/15 rounded-2xl px-4 py-3.5">
        <Flame size={15} className="text-blue-400 mt-0.5 shrink-0" />
        <p className="text-xs text-gray-400 leading-relaxed">
          <span className="text-white font-medium">Como usar:</span> Rode o link da presell no anúncio (não o da chamada direta). O lead abre uma página de "agendamento de call" — passa pelo crivo das plataformas e chega aquecido para a chamada fake.
        </p>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="bg-[#18181b] border border-white/5 rounded-2xl h-24 animate-pulse" />
          ))}
        </div>
      ) : pages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-2xl bg-[#18181b] border border-white/5 flex items-center justify-center mb-5">
            <Rocket size={32} className="text-gray-600" />
          </div>
          <p className="text-white font-semibold text-lg mb-2">Nenhuma presell criada ainda</p>
          <p className="text-gray-500 text-sm mb-7 max-w-sm leading-relaxed">
            Crie sua primeira página de presell e use o link dela no anúncio — seu funil fica protegido e os leads chegam mais quentes.
          </p>
          <Link to="/presell/new"
            className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold px-5 py-3 rounded-xl transition-all shadow-lg shadow-green-900/30">
            <Plus size={16} />
            Criar primeira presell
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {pages.map(page => (
            <div key={page.id}
              className="bg-[#18181b] border border-white/5 hover:border-white/10 rounded-2xl p-5 transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
                    <LayoutTemplate size={18} className="text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-white truncate">{page.config.name || 'Sem nome'}</p>
                      <span className="text-xs text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full">
                        {TEMPLATE_LABELS[page.template_slug] ?? page.template_slug}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5 truncate">{page.config.headline}</p>
                    <div className="flex items-center gap-3 mt-2.5 flex-wrap">
                      <code className="text-xs text-gray-600 font-mono bg-white/5 px-2 py-0.5 rounded-lg">
                        /p/{page.slug}
                      </code>
                      <CopyButton text={`${window.location.origin}/p/${page.slug}`} />
                      <a href={`/p/${page.slug}`} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors">
                        <ExternalLink size={12} />
                        Visualizar
                      </a>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Link to={`/presell/${page.id}/edit`}
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/5 transition-all"
                    title="Editar">
                    <Edit3 size={16} />
                  </Link>
                  {deletingId === page.id ? (
                    <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-1.5">
                      <button onClick={() => deleteMutation.mutate(page.id)} disabled={deleteMutation.isPending}
                        className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors disabled:opacity-50">
                        {deleteMutation.isPending ? 'Excluindo…' : 'Confirmar'}
                      </button>
                      <span className="text-gray-600">·</span>
                      <button onClick={() => setDeletingId(null)} className="text-xs text-gray-500 hover:text-gray-300">
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setDeletingId(page.id)}
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                      title="Excluir">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
