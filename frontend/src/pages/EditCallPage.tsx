import { useState, useRef, useEffect } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCall, updateCall, uploadContactPhoto } from '../services/callService';
import { ImageDropzone } from '../components/ui/ImageDropzone';
import { useImageUpload } from '../hooks/use-image-upload';
import {
  ArrowLeft, BarChart2, ExternalLink, Copy, Check,
  AlertCircle, DollarSign, RefreshCw, Navigation, Film, ChevronDown,
  Sliders, ListOrdered, LayoutTemplate, Rocket, X, ChevronRight,
} from 'lucide-react';
import { listEvents } from '../services/eventService';
import { listPresells, listUpsells, listDownsells, getPresellsByCallId } from '../services/presellService';
import { listVideos, type Video } from '../services/videoService';

const inputCls = "w-full bg-[#1c0510] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#FE015C]/60 focus:ring-1 focus:ring-[#FE015C]/20 transition-all";

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${value ? 'bg-green-500' : 'bg-white/10'}`}
    >
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

const PUBLIC_BASE = window.location.origin;

export default function EditCallPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isNew = searchParams.get('created') === '1';
  const qc = useQueryClient();

  const { data: call, isLoading } = useQuery({
    queryKey: ['call', id],
    queryFn: () => getCall(id!),
    enabled: !!id,
  });

  const [displayName, setDisplayName] = useState('');
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<'active' | 'disabled'>('active');
  const [entryEnabled, setEntryEnabled] = useState(false);
  const [entryPrice, setEntryPrice] = useState('');
  const [loopVideo, setLoopVideo] = useState(true);
  const [callMode, setCallMode] = useState<'incoming' | 'outgoing'>('incoming');
  const [endCallRedirectUrl, setEndCallRedirectUrl] = useState('');
  const [redirectMode, setRedirectMode] = useState<'none' | 'upsell' | 'downsell' | 'presell' | 'custom'>('none');
  const [billingMode, setBillingMode] = useState<'none' | 'credits'>('none');
  const [videoId, setVideoId] = useState('');
  const [showVideoPicker, setShowVideoPicker] = useState(false);
  const [error, setError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  const initialized = useRef(false);
  if (call && !initialized.current) {
    setTitle(call.title);
    setDisplayName(call.display_name);
    setStatus(call.status === 'disabled' ? 'disabled' : 'active');
    if (call.entry_price_cents > 0) {
      setEntryEnabled(true);
      setEntryPrice((call.entry_price_cents / 100).toFixed(2));
    }
    setLoopVideo(call.loop_video ?? true);
    setCallMode((call.call_mode as 'incoming' | 'outgoing') ?? 'incoming');
    setBillingMode((call.billing_mode as 'none' | 'credits') ?? 'none');
    const redir = call.end_call_redirect_url ?? '';
    setEndCallRedirectUrl(redir);
    if (redir.startsWith('/u/')) setRedirectMode('upsell');
    else if (redir.startsWith('/d/')) setRedirectMode('downsell');
    else if (redir.startsWith('/p/')) setRedirectMode('presell');
    else if (redir) setRedirectMode('custom');
    else setRedirectMode('none');
    setVideoId(call.video_id ?? '');
    initialized.current = true;
  }

  const {
    previewUrl: photoPreview,
    fileName: photoFileName,
    fileInputRef: photoInputRef,
    handleThumbnailClick: openPhotoDialog,
    handleFileChange: onPhotoFileChange,
    handleRemove: removePhoto,
    setServerUrl: setPhotoServerUrl,
  } = useImageUpload({ initialUrl: call?.contact_photo_url ?? null });

  // sync server URL when call data loads/changes
  useEffect(() => {
    if (call?.contact_photo_url && !photoPreview) {
      setPhotoServerUrl(call.contact_photo_url);
    }
  }, [call?.contact_photo_url]);

  const photoMutation = useMutation({
    mutationFn: (file: File) => uploadContactPhoto(id!, file),
    onSuccess: (res) => {
      if (res.url) setPhotoServerUrl(res.url);
      qc.invalidateQueries({ queryKey: ['call', id] });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message;
      setError(msg ?? 'Erro ao enviar foto.');
    },
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onPhotoFileChange(e);
    const file = e.target.files?.[0];
    if (file) photoMutation.mutate(file);
  };

  const { data: presellsData } = useQuery({
    queryKey: ['presells'],
    queryFn: () => listPresells(1),
  });
  const presells = presellsData?.data ?? [];

  const { data: upsellsData } = useQuery({
    queryKey: ['upsells', 1],
    queryFn: () => listUpsells(1),
  });
  const upsells = upsellsData?.data ?? [];

  const { data: downsellsData } = useQuery({
    queryKey: ['downsells', 1],
    queryFn: () => listDownsells(1),
  });
  const downsells = downsellsData?.data ?? [];

  const { data: linkedPresells = [] } = useQuery({
    queryKey: ['call-presells', id],
    queryFn: () => getPresellsByCallId(id!),
    enabled: !!id,
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events', id],
    queryFn: () => listEvents(id!),
    enabled: !!id,
  });

  const { data: videos = [] } = useQuery<Video[]>({
    queryKey: ['videos'],
    queryFn: listVideos,
  });
  const selectedVideo = videos.find(v => v.id === videoId);

  const entryPriceCents = entryEnabled ? Math.round(parseFloat(entryPrice || '0') * 100) : 0;

  const updateMutation = useMutation({
    mutationFn: () => updateCall(id!, { title, display_name: displayName, status, entry_price_cents: entryPriceCents, loop_video: loopVideo, call_mode: callMode, billing_mode: billingMode, end_call_redirect_url: endCallRedirectUrl, video_id: videoId || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['call', id] });
      qc.invalidateQueries({ queryKey: ['calls'] });
      setError('');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message;
      setError(msg ?? 'Erro ao salvar.');
    },
  });

  const publicLink = call ? `${PUBLIC_BASE}/c/${call.slug}` : '';

  if (isLoading) {
    return (
      <div className="p-6 max-w-xl mx-auto space-y-4">
        <div className="h-8 w-48 bg-white/5 rounded-xl animate-pulse" />
        {[0,1,2].map(i => <div key={i} className="h-24 bg-white/5 rounded-2xl animate-pulse" />)}
      </div>
    );
  }

  if (!call) {
    return (
      <div className="p-6 max-w-xl mx-auto flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle size={32} className="text-gray-600 mb-3" />
        <p className="text-white font-medium mb-1">Chamada não encontrada</p>
        <Link to="/calls" className="text-green-400 text-sm hover:text-green-300 mt-2">← Voltar para chamadas</Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/calls" className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/5 transition-all">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-white truncate">{call.title}</h1>
          <p className="text-gray-500 text-sm mt-0.5">Editar chamada</p>
        </div>
      </div>

      {/* "Criado!" banner — aparece só quando vem de criação nova */}
      {isNew && (
        <div className="bg-green-500/10 border border-green-500/25 rounded-2xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-green-500/20 flex items-center justify-center shrink-0">
                <Rocket size={16} className="text-green-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-green-400">Chamada criada! 3 passos para lançar</p>
                <p className="text-xs text-gray-500 mt-0.5">Complete cada etapa para deixar o funil pronto</p>
              </div>
            </div>
            <button onClick={() => setSearchParams({})} className="text-gray-600 hover:text-gray-400 shrink-0 p-1">
              <X size={14} />
            </button>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2">
            {[
              {
                done: events.length > 0,
                label: 'Adicionar eventos à timeline',
                desc: 'Popups, ofertas e gatilhos que aparecem durante a chamada',
                to: `/calls/${id}/timeline`,
                cta: 'Abrir timeline',
                icon: <ListOrdered size={14} />,
                color: 'text-purple-400',
                bg: 'bg-purple-500/10',
              },
              {
                done: linkedPresells.length > 0,
                label: 'Criar presell para o funil',
                desc: 'Página de aquecimento que envia o lead para a chamada',
                to: '/presell/new',
                cta: 'Criar presell',
                icon: <LayoutTemplate size={14} />,
                color: 'text-blue-400',
                bg: 'bg-blue-500/10',
              },
              {
                done: false,
                label: 'Compartilhar o link da chamada',
                desc: call ? `${PUBLIC_BASE}/c/${call.slug}` : '—',
                action: () => { navigator.clipboard.writeText(publicLink); setCopied(true); setTimeout(() => setCopied(false), 2000); },
                cta: copied ? 'Copiado!' : 'Copiar link',
                icon: <Copy size={14} />,
                color: 'text-green-400',
                bg: 'bg-green-500/10',
              },
            ].map((step, i) => (
              <div key={i} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${step.done ? 'border-green-500/20 bg-green-500/5' : 'border-white/5 bg-white/[0.02]'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${step.done ? 'bg-green-500' : 'bg-white/10'}`}>
                  {step.done ? <Check size={12} className="text-white" /> : <span className="text-xs text-gray-400 font-bold">{i + 1}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold ${step.done ? 'text-green-400 line-through opacity-60' : 'text-white'}`}>{step.label}</p>
                  <p className="text-[10px] text-gray-600 truncate mt-0.5">{step.desc}</p>
                </div>
                {!step.done && (
                  step.to ? (
                    <Link to={step.to} className={`flex items-center gap-1 text-xs font-medium shrink-0 ${step.color} ${step.bg} px-2.5 py-1.5 rounded-lg hover:opacity-80 transition-opacity`}>
                      {step.icon}{step.cta}
                    </Link>
                  ) : (
                    <button onClick={step.action} className={`flex items-center gap-1 text-xs font-medium shrink-0 ${step.color} ${step.bg} px-2.5 py-1.5 rounded-lg hover:opacity-80 transition-opacity`}>
                      {step.icon}{step.cta}
                    </button>
                  )
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-2">
        <Link to={`/calls/${id}/timeline`}
          className="flex items-center gap-2.5 bg-purple-500/5 hover:bg-purple-500/10 border border-purple-500/20 hover:border-purple-500/30 rounded-2xl px-3 py-3 transition-all">
          <div className="w-8 h-8 rounded-xl bg-purple-500/15 flex items-center justify-center shrink-0">
            <ListOrdered size={15} className="text-purple-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-purple-400 truncate">Timeline</p>
            <p className="text-[10px] text-gray-600 truncate">{events.length} evento{events.length !== 1 ? 's' : ''}</p>
          </div>
        </Link>
        <Link to={`/calls/${id}/editor`}
          className="flex items-center gap-2.5 bg-green-500/5 hover:bg-green-500/10 border border-green-500/20 hover:border-green-500/30 rounded-2xl px-3 py-3 transition-all">
          <div className="w-8 h-8 rounded-xl bg-green-500/15 flex items-center justify-center shrink-0">
            <Sliders size={15} className="text-green-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-green-400 truncate">Vídeo</p>
            <p className="text-[10px] text-gray-600 truncate">Corte e zoom</p>
          </div>
        </Link>
        <Link to={`/calls/${id}/analytics`}
          className="flex items-center gap-2.5 bg-[#18181b] hover:bg-white/5 border border-white/5 hover:border-white/10 rounded-2xl px-3 py-3 transition-all">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
            <BarChart2 size={15} className="text-blue-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white truncate">Analytics</p>
            <p className="text-[10px] text-gray-600 truncate">Visitas</p>
          </div>
        </Link>
      </div>

      {/* Public link */}
      <div className="bg-[#18181b] border border-white/5 rounded-2xl p-4">
        <p className="text-xs text-gray-500 mb-2.5 font-medium uppercase tracking-wider">Link público</p>
        <div className="flex items-center gap-2 bg-[#1c0510] border border-white/5 rounded-xl px-3 py-2">
          <code className="text-green-400 text-xs flex-1 truncate">{publicLink}</code>
          <button
            onClick={() => { navigator.clipboard.writeText(publicLink); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            className="text-gray-500 hover:text-white transition-colors shrink-0"
          >
            {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
          </button>
          <a href={`/c/${call.slug}`} target="_blank" rel="noreferrer" className="text-gray-500 hover:text-white transition-colors shrink-0">
            <ExternalLink size={13} />
          </a>
        </div>
      </div>

      {/* Contact photo with dropzone */}
      <div className="bg-[#18181b] border border-white/5 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-white">Foto de contato</p>
            <p className="text-xs text-gray-600 mt-0.5">Aparece no avatar da chamada falsa</p>
          </div>
          {photoMutation.isPending && (
            <span className="text-xs text-green-400 flex items-center gap-1.5">
              <span className="w-3 h-3 border border-green-400/40 border-t-green-400 rounded-full animate-spin" />
              Enviando…
            </span>
          )}
        </div>
        <ImageDropzone
          previewUrl={photoPreview}
          fileName={photoFileName}
          onFileChange={handlePhotoChange}
          onRemove={removePhoto}
          onClick={openPhotoDialog}
          fileInputRef={photoInputRef}
          loading={photoMutation.isPending}
          label="Clique ou arraste a foto"
          hint="JPG, PNG ou WebP"
        />
      </div>

      {/* Form */}
      <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(); }} className="space-y-4">
        {error && (
          <div className="flex items-start gap-2.5 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />{error}
          </div>
        )}
        {saveSuccess && (
          <div className="flex items-center gap-2 text-green-400 text-sm bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
            <Check size={15} />Alterações salvas com sucesso!
          </div>
        )}

        <div className="bg-[#18181b] border border-white/5 rounded-2xl p-5 space-y-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Informações do funil</p>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-400">Nome da campanha</label>
            <input required value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
            <p className="text-xs text-gray-600">Visível só pra você no painel</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-400">Nome do contato</label>
            <input required value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={inputCls} />
            <p className="text-xs text-gray-600">Quem o lead vê ligando</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-400">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as 'active' | 'disabled')} className={inputCls + ' cursor-pointer'}>
              <option value="active">Ativa</option>
              <option value="disabled">Desativada</option>
            </select>
          </div>
        </div>

        {/* Vídeo */}
        <div className="bg-[#18181b] border border-white/5 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <Film size={16} className="text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Vídeo da chamada</p>
              <p className="text-xs text-gray-600">O vídeo que será exibido ao lead</p>
            </div>
          </div>

          {/* Vídeo atual / selecionado */}
          <button
            type="button"
            onClick={() => setShowVideoPicker(v => !v)}
            className="w-full flex items-center gap-3 bg-[#1c0510] border border-white/10 rounded-xl px-4 py-3 text-left hover:border-purple-500/40 transition-colors group"
          >
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
              <Film size={14} className="text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              {selectedVideo ? (
                <>
                  <p className="text-sm text-white truncate">{selectedVideo.original_name}</p>
                  <p className="text-xs text-gray-500">
                    {selectedVideo.duration_seconds ? `${Math.floor(selectedVideo.duration_seconds / 60)}:${String(selectedVideo.duration_seconds % 60).padStart(2, '0')}` : ''} · {(selectedVideo.size_bytes / 1024 / 1024).toFixed(1)} MB
                  </p>
                </>
              ) : (
                <p className="text-sm text-gray-500">Nenhum vídeo selecionado</p>
              )}
            </div>
            <ChevronDown size={15} className={`text-gray-500 transition-transform ${showVideoPicker ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown picker */}
          {showVideoPicker && (
            <div className="border border-white/10 rounded-xl overflow-hidden divide-y divide-white/5 max-h-56 overflow-y-auto">
              {videos.filter(v => v.status === 'ready').length === 0 ? (
                <p className="text-sm text-gray-500 px-4 py-3">Nenhum vídeo disponível</p>
              ) : (
                videos.filter(v => v.status === 'ready').map(v => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => { setVideoId(v.id); setShowVideoPicker(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${v.id === videoId ? 'bg-purple-500/15 text-white' : 'bg-[#1c0510] text-gray-300 hover:bg-white/5'}`}
                  >
                    <Film size={13} className={v.id === videoId ? 'text-purple-400' : 'text-gray-600'} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{v.original_name}</p>
                      <p className="text-xs text-gray-500">
                        {v.duration_seconds ? `${Math.floor(v.duration_seconds / 60)}:${String(v.duration_seconds % 60).padStart(2, '0')}` : '–'} · {(v.size_bytes / 1024 / 1024).toFixed(1)} MB
                      </p>
                    </div>
                    {v.id === videoId && <Check size={13} className="text-purple-400 shrink-0" />}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Entry payment */}
        <div className="bg-[#18181b] border border-white/5 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                <DollarSign size={16} className="text-yellow-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Cobrar na entrada (PIX)</p>
                <p className="text-xs text-gray-600">Lead paga antes de entrar — qualifica o tráfego</p>
              </div>
            </div>
            <Toggle value={entryEnabled} onChange={setEntryEnabled} />
          </div>
          {entryEnabled && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-400">Valor (R$)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">R$</span>
                <input type="number" min="0.01" step="0.01" placeholder="0,00"
                  value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)}
                  className={inputCls + ' pl-10'} />
              </div>
            </div>
          )}
        </div>

        {/* Créditos por minuto */}
        <div className="bg-[#18181b] border border-white/5 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center">
                <DollarSign size={16} className="text-orange-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Créditos por minuto</p>
                <p className="text-xs text-gray-600">Lead compra pacotes; créditos consumidos por minuto</p>
              </div>
            </div>
            <Toggle value={billingMode === 'credits'} onChange={v => setBillingMode(v ? 'credits' : 'none')} />
          </div>
          {billingMode === 'credits' && (
            <div className="bg-[#1c0510] border border-white/5 rounded-xl p-3 space-y-1.5 text-xs text-gray-400">
              <p className="font-semibold text-gray-300">Pacotes disponíveis para o lead:</p>
              {[
                { label: '5 minutos', price: 'R$ 10,00' },
                { label: '15 minutos', price: 'R$ 25,00' },
                { label: '30 minutos', price: 'R$ 45,00' },
                { label: '60 minutos', price: 'R$ 80,00' },
              ].map(p => (
                <div key={p.label} className="flex justify-between">
                  <span>{p.label}</span>
                  <span className="text-white font-medium">{p.price}</span>
                </div>
              ))}
              <p className="text-gray-600 pt-1">O lead escolhe o pacote, paga via PIX e começa a ligação.</p>
            </div>
          )}
        </div>

        {/* Loop */}
        <div className="bg-[#18181b] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <RefreshCw size={16} className="text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Repetir vídeo em loop</p>
                <p className="text-xs text-gray-600">
                  {loopVideo ? 'Vídeo repete automaticamente' : 'Mostra tela de encerramento ao final'}
                </p>
              </div>
            </div>
            <Toggle value={loopVideo} onChange={setLoopVideo} />
          </div>
        </div>

        {/* Modo de chamada */}
        <div className="bg-[#18181b] border border-white/5 rounded-2xl p-5 space-y-3">
          <p className="text-sm font-medium text-white">Modo de chamada</p>
          <div className="grid grid-cols-2 gap-2">
            {([
              { value: 'incoming', label: '📲 Modelo ligando', desc: 'Lead recebe a chamada e precisa atender' },
              { value: 'outgoing', label: '📞 Lead ligando', desc: 'Lead liga para a modelo — conecta em 3s' },
            ] as const).map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setCallMode(opt.value)}
                className={`flex flex-col gap-1 p-3 rounded-xl border text-left transition-all ${
                  callMode === opt.value
                    ? 'bg-green-500/10 border-green-500/40 text-white'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
                }`}
              >
                <span className="text-sm font-semibold">{opt.label}</span>
                <span className="text-xs opacity-70">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Redirect ao encerrar */}
        <div className="bg-[#18181b] border border-white/5 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
              <Navigation size={16} className="text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Redirecionar ao encerrar</p>
              <p className="text-xs text-gray-600">Para onde o lead vai quando a chamada termina</p>
            </div>
          </div>

          {/* Modo */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {([
              { value: 'none', label: '✕ Nenhum', desc: 'Tela de encerramento' },
              { value: 'upsell', label: '↑ Upsell', desc: 'Oferta pós-call' },
              { value: 'downsell', label: '↓ Downsell', desc: 'Oferta de recuperação' },
              { value: 'presell', label: '⊙ Presell', desc: 'Reaquecer o lead' },
              { value: 'custom', label: '✎ URL manual', desc: 'Link externo' },
            ] as const).map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setRedirectMode(opt.value);
                  if (opt.value === 'none') setEndCallRedirectUrl('');
                }}
                className={`flex flex-col gap-0.5 px-3 py-2.5 rounded-xl border text-left transition-all ${
                  redirectMode === opt.value
                    ? 'bg-purple-500/10 border-purple-500/40 text-white'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
                }`}
              >
                <span className="text-xs font-semibold">{opt.label}</span>
                <span className="text-[10px] opacity-60">{opt.desc}</span>
              </button>
            ))}
          </div>

          {/* Picker de upsell */}
          {redirectMode === 'upsell' && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-400">Selecionar upsell</label>
              {upsells.length === 0 ? (
                <div className="flex items-center justify-between bg-[#1c0510] border border-white/5 rounded-xl px-4 py-3">
                  <p className="text-xs text-gray-500">Nenhum upsell criado ainda.</p>
                  <Link to="/upsell/new" className="text-xs text-purple-400 hover:text-purple-300 font-medium">+ Criar →</Link>
                </div>
              ) : (
                <select
                  value={upsells.find(u => endCallRedirectUrl === `/u/${u.slug}`)?.id ?? ''}
                  onChange={e => {
                    const u = upsells.find(x => x.id === e.target.value);
                    setEndCallRedirectUrl(u ? `/u/${u.slug}` : '');
                  }}
                  className={inputCls + ' cursor-pointer'}
                >
                  <option value="">— Escolha um upsell —</option>
                  {upsells.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.config.name || u.config.headline?.slice(0, 40) || u.slug} (/u/{u.slug})
                    </option>
                  ))}
                </select>
              )}
              {endCallRedirectUrl && (
                <p className="text-xs text-purple-400 font-mono bg-purple-500/10 px-3 py-1.5 rounded-lg">{endCallRedirectUrl}</p>
              )}
            </div>
          )}

          {/* Picker de downsell */}
          {redirectMode === 'downsell' && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-400">Selecionar downsell</label>
              {downsells.length === 0 ? (
                <div className="flex items-center justify-between bg-[#1c0510] border border-white/5 rounded-xl px-4 py-3">
                  <p className="text-xs text-gray-500">Nenhum downsell criado ainda.</p>
                  <Link to="/downsell/new" className="text-xs text-yellow-400 hover:text-yellow-300 font-medium">+ Criar →</Link>
                </div>
              ) : (
                <select
                  value={downsells.find(d => endCallRedirectUrl === `/d/${d.slug}`)?.id ?? ''}
                  onChange={e => {
                    const d = downsells.find(x => x.id === e.target.value);
                    setEndCallRedirectUrl(d ? `/d/${d.slug}` : '');
                  }}
                  className={inputCls + ' cursor-pointer'}
                >
                  <option value="">— Escolha um downsell —</option>
                  {downsells.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.config.name || d.config.headline?.slice(0, 40) || d.slug} (/d/{d.slug})
                    </option>
                  ))}
                </select>
              )}
              {endCallRedirectUrl && (
                <p className="text-xs text-yellow-400 font-mono bg-yellow-500/10 px-3 py-1.5 rounded-lg">{endCallRedirectUrl}</p>
              )}
            </div>
          )}

          {/* Picker de presell */}
          {redirectMode === 'presell' && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-400">Selecionar presell</label>
              {presells.length === 0 ? (
                <div className="flex items-center justify-between bg-[#1c0510] border border-white/5 rounded-xl px-4 py-3">
                  <p className="text-xs text-gray-500">Nenhum presell criado ainda.</p>
                  <Link to="/presell/new" className="text-xs text-blue-400 hover:text-blue-300 font-medium">+ Criar →</Link>
                </div>
              ) : (
                <select
                  value={presells.find(p => endCallRedirectUrl === `/p/${p.slug}`)?.id ?? ''}
                  onChange={e => {
                    const p = presells.find(x => x.id === e.target.value);
                    setEndCallRedirectUrl(p ? `/p/${p.slug}` : '');
                  }}
                  className={inputCls + ' cursor-pointer'}
                >
                  <option value="">— Escolha um presell —</option>
                  {presells.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.config.name || p.config.headline?.slice(0, 40) || p.slug} (/p/{p.slug})
                    </option>
                  ))}
                </select>
              )}
              {endCallRedirectUrl && (
                <p className="text-xs text-blue-400 font-mono bg-blue-500/10 px-3 py-1.5 rounded-lg">{endCallRedirectUrl}</p>
              )}
            </div>
          )}

          {/* URL manual */}
          {redirectMode === 'custom' && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-400">URL de destino</label>
              <input
                value={endCallRedirectUrl}
                onChange={e => setEndCallRedirectUrl(e.target.value)}
                placeholder="https://... ou /c/abc123"
                className={inputCls}
              />
              <p className="text-xs text-gray-600">Qualquer URL — external, outra call, landing page, etc.</p>
            </div>
          )}

          {redirectMode === 'none' && (
            <p className="text-xs text-gray-600 bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3">
              Será exibida a tela padrão de "Chamada encerrada" com opção de ligar novamente.
            </p>
          )}
        </div>

        {/* Presells vinculados */}
        <div className="bg-[#18181b] border border-white/5 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <LayoutTemplate size={16} className="text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Presells vinculados</p>
                <p className="text-xs text-gray-600">Páginas que enviam tráfego para esta chamada</p>
              </div>
            </div>
            <Link to="/presell/new" className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/15 px-2.5 py-1.5 rounded-lg transition-all font-medium">
              <LayoutTemplate size={11} />+ Criar
            </Link>
          </div>
          {linkedPresells.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/8 p-4 text-center space-y-2">
              <p className="text-xs text-gray-500">Nenhum presell aponta para esta chamada ainda.</p>
              <Link to="/presell/new" className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors">
                <ChevronRight size={12} />Criar primeiro presell
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {linkedPresells.map(p => (
                <div key={p.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${
                      p.type === 'presell' ? 'bg-green-500/15 text-green-400' :
                      p.type === 'upsell' ? 'bg-purple-500/15 text-purple-400' :
                      'bg-yellow-500/15 text-yellow-400'
                    }`}>{p.type}</span>
                    <span className="text-sm text-white truncate">{p.config.name || p.config.headline?.slice(0, 30) || p.slug}</span>
                    <span className="text-xs text-gray-600">/p/{p.slug}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-gray-500">{p.cta_clicks} cliques</span>
                    <Link to={`/presell/${p.id}/edit`} className="text-xs text-gray-400 hover:text-white transition-colors">Editar</Link>
                    <a href={`/p/${p.slug}`} target="_blank" rel="noreferrer" className="text-xs text-gray-400 hover:text-white transition-colors">Ver →</a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={updateMutation.isPending}
            className="flex-1 bg-[#FE015C] hover:bg-[#FD267D] disabled:opacity-50 text-white font-semibold rounded-xl py-3 text-sm transition-all shadow-lg shadow-[#FE015C]/20">
            {updateMutation.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Salvando…
              </span>
            ) : 'Salvar alterações'}
          </button>
          <button type="button" onClick={() => navigate('/calls')}
            className="px-5 bg-white/5 hover:bg-white/10 text-sm text-gray-400 hover:text-white rounded-xl transition-all font-medium">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
