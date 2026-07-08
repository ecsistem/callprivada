import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { listVideos, Video } from '../services/videoService';
import { createCall, uploadContactPhoto } from '../services/callService';
import { useImageUpload } from '../hooks/use-image-upload';
import { ImageDropzone } from '../components/ui/ImageDropzone';
import { VideoThumbnail } from '../components/ui/VideoThumbnail';
import {
  ArrowLeft, ArrowRight, Check, AlertCircle, Film, Phone,
  User, Settings2, ChevronRight, Clock, MicOff, Video as VideoIcon,
  VideoOff, PhoneOff, DollarSign, RefreshCw, Calendar,
} from 'lucide-react';
import { useState } from 'react';

const inputCls = "w-full bg-[#1c0510] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-green-500/60 focus:ring-1 focus:ring-green-500/20 transition-all";

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!value)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${value ? 'bg-green-500' : 'bg-white/10'}`}>
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDuration(sec: number | null) {
  if (!sec) return '—';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ── Phone preview ────────────────────────────────────────────────────────────
function PhonePreview({ displayName, avatarSrc }: { displayName: string; avatarSrc: string | null }) {
  const name = displayName.trim() || 'Nome do contato';

  return (
    <div className="relative w-[220px] h-[440px] rounded-[36px] bg-[#0a0a0a] border-[6px] border-[#2a2a2a] shadow-2xl overflow-hidden shrink-0 select-none">
      {/* Notch */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-5 bg-[#0a0a0a] rounded-b-2xl z-10" />

      {/* WhatsApp green gradient bg */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#075e54] via-[#128c7e] to-[#0a1628]" />

      {/* WA badge */}
      <div className="absolute top-6 left-0 right-0 flex flex-col items-center gap-1.5 pt-2">
        <span className="text-[9px] text-white/50 tracking-wide font-medium">CHAMADA DE VÍDEO WHATSAPP</span>

        {/* Avatar */}
        <div className="w-16 h-16 rounded-full border-2 border-white/20 overflow-hidden bg-[#075e54] flex items-center justify-center mt-1">
          {avatarSrc ? (
            <img src={avatarSrc} alt="avatar" className="w-full h-full object-cover" />
          ) : (
            <User size={28} className="text-white/40" />
          )}
        </div>

        {/* Name */}
        <p className="text-white font-semibold text-sm tracking-tight max-w-[160px] truncate text-center">
          {name}
        </p>
        <p className="text-white/50 text-[10px]">00:00</p>
      </div>

      {/* Own cam thumbnail */}
      <div className="absolute top-[170px] right-3 w-14 h-20 rounded-xl bg-[#1a1a2e] border border-white/10 overflow-hidden flex items-center justify-center">
        <VideoIcon size={14} className="text-white/20" />
      </div>

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-4 pb-8 pt-4">
        <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center">
          <MicOff size={14} className="text-white" />
        </div>
        <div className="w-12 h-12 rounded-full bg-[#f02849] flex items-center justify-center">
          <PhoneOff size={16} className="text-white" />
        </div>
        <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center">
          <VideoOff size={14} className="text-white" />
        </div>
      </div>

      {/* Signal bars top right */}
      <div className="absolute top-7 right-4 flex items-end gap-[2px]">
        {[3,5,7,9].map((h,i) => (
          <div key={i} style={{ height: h }} className={`w-[3px] rounded-sm ${i < 3 ? 'bg-white/60' : 'bg-white/20'}`} />
        ))}
      </div>
    </div>
  );
}

// ── Step indicator ────────────────────────────────────────────────────────────
const STEPS = [
  { label: 'Vídeo', icon: Film },
  { label: 'Identidade', icon: User },
  { label: 'Configurações', icon: Settings2 },
];

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((s, i) => {
        const Icon = s.icon;
        const done = i < current;
        const active = i === current;
        return (
          <div key={i} className="flex items-center">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              active ? 'bg-green-500/15 text-green-400 border border-green-500/30' :
              done ? 'text-green-500' : 'text-gray-600'
            }`}>
              {done
                ? <Check size={13} />
                : <Icon size={13} />
              }
              <span className={active || done ? '' : 'hidden sm:inline'}>{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-px w-6 mx-1 transition-all ${done ? 'bg-green-500/40' : 'bg-white/5'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Video card ────────────────────────────────────────────────────────────────
function VideoCard({ video, selected, onSelect }: { video: Video; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left flex items-center gap-4 p-3 rounded-2xl border transition-all ${
        selected
          ? 'bg-green-500/10 border-green-500/40 shadow-lg shadow-green-900/10'
          : 'bg-[#1c0510] border-white/5 hover:border-white/15 hover:bg-white/[0.03]'
      }`}
    >
      {/* Video thumbnail */}
      <VideoThumbnail
        videoId={video.id}
        className="w-20 h-14 shrink-0"
        playInline={false}
      />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${selected ? 'text-green-300' : 'text-gray-200'}`}>
          {video.original_name}
        </p>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-xs text-gray-600 flex items-center gap-1">
            <Clock size={10} />{formatDuration(video.duration_seconds)}
          </span>
          <span className="text-xs text-gray-700">{formatBytes(video.size_bytes)}</span>
        </div>
      </div>

      {/* Checkmark */}
      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
        selected ? 'border-green-500 bg-green-500' : 'border-white/10'
      }`}>
        {selected && <Check size={11} className="text-white" />}
      </div>
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function NewCallPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [videoId, setVideoId] = useState('');
  const [title, setTitle] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [startTime, setStartTime] = useState(0);

  const {
    previewUrl: avatarPreview,
    fileInputRef: avatarInputRef,
    handleThumbnailClick: openAvatarDialog,
    handleFileChange: onAvatarFileChange,
    handleRemove: removeAvatar,
  } = useImageUpload({
    onUpload: (file) => setAvatarFile(file),
  });
  const [expiresAt, setExpiresAt] = useState('');
  const [entryEnabled, setEntryEnabled] = useState(false);
  const [entryPrice, setEntryPrice] = useState('');
  const [loopVideo, setLoopVideo] = useState(true);
  const [callMode, setCallMode] = useState<'incoming' | 'outgoing'>('incoming');
  const [error, setError] = useState('');

  const { data: videos = [], isLoading: videosLoading } = useQuery({
    queryKey: ['videos'],
    queryFn: listVideos,
    select: (v) => v.filter((x) => x.status === 'ready'),
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const entryPriceCents = entryEnabled ? Math.round(parseFloat(entryPrice || '0') * 100) : 0;
      const call = await createCall({
        video_id: videoId,
        title,
        display_name: displayName,
        start_time_seconds: startTime,
        entry_price_cents: entryPriceCents,
        loop_video: loopVideo,
        call_mode: callMode,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      });
      if (avatarFile) {
        await uploadContactPhoto(call.id, avatarFile).catch(() => {/* non-fatal */});
      }
      return call;
    },
    onSuccess: (call) => navigate(`/calls/${call.id}/edit?created=1`),
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message;
      setError(msg ?? 'Erro ao criar chamada.');
    },
  });

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setAvatarFile(file);
    onAvatarFileChange(e);
  }

  function goNext() {
    setError('');
    if (step === 0 && !videoId) { setError('Selecione um vídeo para continuar.'); return; }
    if (step === 1) {
      if (!title.trim()) { setError('Informe um título interno.'); return; }
      if (!displayName.trim()) { setError('Informe o nome exibido na chamada.'); return; }
    }
    setStep(s => s + 1);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    mutation.mutate();
  }

  const selectedVideo = videos.find(v => v.id === videoId);

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-4">
          <Link to="/calls"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/5 transition-all shrink-0">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">Novo funil de chamada</h1>
            <p className="text-gray-500 text-sm mt-0.5">Configure a chamada fake que vai no seu funil de vendas</p>
          </div>
          <StepBar current={step} />
        </div>

        {/* Body: form + preview */}
        <div className="flex gap-8 items-start">

          {/* ── Left: wizard ── */}
          <div className="flex-1 min-w-0">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-start gap-2.5 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                  <AlertCircle size={15} className="mt-0.5 shrink-0" />{error}
                </div>
              )}

              {/* ── Step 0: Video ── */}
              {step === 0 && (
                <div className="space-y-3">
                  <div className="bg-[#18181b] border border-white/5 rounded-2xl p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
                        <Film size={16} className="text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">Selecione o vídeo</p>
                        <p className="text-xs text-gray-600">O vídeo que será exibido durante a chamada falsa</p>
                      </div>
                    </div>

                    {videosLoading ? (
                      <div className="space-y-2">
                        {[0,1].map(i => <div key={i} className="h-16 bg-white/5 rounded-2xl animate-pulse" />)}
                      </div>
                    ) : videos.length === 0 ? (
                      <div className="flex items-center justify-between bg-yellow-500/5 border border-yellow-500/20 rounded-2xl px-5 py-4">
                        <div>
                          <p className="text-sm font-medium text-yellow-400">Nenhum vídeo disponível</p>
                          <p className="text-xs text-yellow-600 mt-0.5">Faça upload de um vídeo primeiro</p>
                        </div>
                        <Link to="/videos"
                          className="flex items-center gap-1.5 text-xs font-semibold text-yellow-400 hover:text-yellow-300 bg-yellow-500/10 hover:bg-yellow-500/15 px-3 py-1.5 rounded-xl transition-all">
                          Enviar vídeo <ChevronRight size={13} />
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {videos.map(v => (
                          <VideoCard key={v.id} video={v} selected={videoId === v.id} onSelect={() => setVideoId(v.id)} />
                        ))}
                      </div>
                    )}
                  </div>

                  {selectedVideo && (
                    <div className="bg-green-500/5 border border-green-500/20 rounded-2xl px-4 py-3 flex items-center gap-3">
                      <Check size={14} className="text-green-400 shrink-0" />
                      <p className="text-xs text-green-400">
                        <span className="font-semibold">{selectedVideo.original_name}</span> selecionado
                        {selectedVideo.duration_seconds ? ` · ${formatDuration(selectedVideo.duration_seconds)}` : ''}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ── Step 1: Identity ── */}
              {step === 1 && (
                <div className="bg-[#18181b] border border-white/5 rounded-2xl p-5 space-y-5">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-9 h-9 rounded-xl bg-green-500/10 flex items-center justify-center">
                      <User size={16} className="text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Identidade da chamada</p>
                      <p className="text-xs text-gray-600">Como a chamada aparecerá para o visitante</p>
                    </div>
                  </div>

                  {/* Avatar upload */}
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-medium text-white">Foto do contato</p>
                      <p className="text-xs text-gray-600 mt-0.5">Aparece no avatar da chamada</p>
                    </div>
                    <ImageDropzone
                      previewUrl={avatarPreview}
                      onFileChange={handleAvatarChange}
                      onRemove={removeAvatar}
                      onClick={openAvatarDialog}
                      fileInputRef={avatarInputRef}
                      label="Clique ou arraste a foto"
                      hint="JPG, PNG ou WebP (opcional)"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-400">Nome da campanha</label>
                    <input required value={title} onChange={(e) => setTitle(e.target.value)}
                      placeholder="ex: Black Friday Lead #42" className={inputCls} />
                    <p className="text-xs text-gray-600">Visível só pra você no painel — use algo que identifique o funil</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-400">Nome do contato</label>
                    <input required value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="ex: Mariana do Suporte" className={inputCls} />
                    <p className="text-xs text-gray-600">Quem o lead vê ligando — use um nome que gere confiança</p>
                  </div>
                </div>
              )}

              {/* ── Step 2: Settings ── */}
              {step === 2 && (
                <div className="space-y-4">
                  {/* Start time */}
                  <div className="bg-[#18181b] border border-white/5 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center gap-3 mb-1">
                      <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center">
                        <Settings2 size={16} className="text-purple-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">Reprodução do vídeo</p>
                        <p className="text-xs text-gray-600">Configure como o vídeo será exibido</p>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-400">Iniciar em (segundos)</label>
                      <div className="relative">
                        <Clock size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" />
                        <input type="number" min={0} value={startTime}
                          onChange={(e) => setStartTime(Number(e.target.value))}
                          className={inputCls + ' pl-10'} />
                      </div>
                      <p className="text-xs text-gray-600">O vídeo começa neste segundo (padrão: 0)</p>
                    </div>

                    <div className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
                          <RefreshCw size={13} className="text-blue-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">Repetir em loop</p>
                          <p className="text-xs text-gray-600">{loopVideo ? 'Vídeo reinicia automaticamente' : 'Para ao fim do vídeo'}</p>
                        </div>
                      </div>
                      <Toggle value={loopVideo} onChange={setLoopVideo} />
                    </div>

                    {/* Modo de chamada */}
                    <div className="pt-2 border-t border-white/5 space-y-2">
                      <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Modo de chamada</p>
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
                  </div>

                  {/* Entry payment */}
                  <div className="bg-[#18181b] border border-white/5 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                          <DollarSign size={16} className="text-yellow-400" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">Cobrar na entrada (PIX)</p>
                          <p className="text-xs text-gray-600">Lead paga antes de entrar na chamada — qualifica o tráfego</p>
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

                  {/* Expiry */}
                  <div className="bg-[#18181b] border border-white/5 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center gap-3 mb-1">
                      <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center">
                        <Calendar size={16} className="text-orange-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">Expiração</p>
                        <p className="text-xs text-gray-600">Deixe em branco para não expirar</p>
                      </div>
                    </div>
                    <input type="datetime-local" value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                      className={inputCls} />
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex gap-3 pt-1">
                {step > 0 && (
                  <button type="button" onClick={() => { setError(''); setStep(s => s - 1); }}
                    className="flex items-center gap-2 px-5 py-3 bg-white/5 hover:bg-white/10 text-sm text-gray-400 hover:text-white rounded-xl transition-all font-medium">
                    <ArrowLeft size={14} />Voltar
                  </button>
                )}

                {step < 2 ? (
                  <button type="button" onClick={goNext}
                    disabled={step === 0 && videos.length === 0}
                    className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-3 text-sm transition-all shadow-lg shadow-green-900/30">
                    Próximo <ArrowRight size={14} />
                  </button>
                ) : (
                  <button type="submit" disabled={mutation.isPending}
                    className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold rounded-xl py-3 text-sm transition-all shadow-lg shadow-green-900/30">
                    {mutation.isPending ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Criando funil…
                      </>
                    ) : (
                      <>
                        <Phone size={14} />Criar funil
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* ── Right: preview ── */}
          <div className="hidden lg:flex flex-col items-center gap-4 shrink-0 sticky top-6">
            <p className="text-xs text-gray-600 font-medium uppercase tracking-wider">Preview</p>
            <PhonePreview displayName={displayName} avatarSrc={avatarPreview} />

            {/* Summary pills */}
            <div className="w-[220px] space-y-2">
              {selectedVideo && (
                <div className="flex items-center gap-2 bg-[#18181b] border border-white/5 rounded-xl px-3 py-2">
                  <Film size={12} className="text-blue-400 shrink-0" />
                  <span className="text-xs text-gray-400 truncate">{selectedVideo.original_name}</span>
                </div>
              )}
              {displayName && (
                <div className="flex items-center gap-2 bg-[#18181b] border border-white/5 rounded-xl px-3 py-2">
                  <User size={12} className="text-green-400 shrink-0" />
                  <span className="text-xs text-gray-400 truncate">{displayName}</span>
                </div>
              )}
              {entryEnabled && entryPrice && (
                <div className="flex items-center gap-2 bg-[#18181b] border border-yellow-500/20 rounded-xl px-3 py-2">
                  <DollarSign size={12} className="text-yellow-400 shrink-0" />
                  <span className="text-xs text-yellow-400">R$ {entryPrice} na entrada</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
