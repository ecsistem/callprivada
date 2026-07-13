import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadVideo, listVideos, deleteVideo, reoptimizeVideo, type Video } from '../services/videoService';
import { VideoDropzone } from '../components/ui/VideoDropzone';
import { VideoThumbnail } from '../components/ui/VideoThumbnail';
import { Film, Trash2, Check, AlertCircle, Clock, Zap } from 'lucide-react';

const MAX_BYTES = 2 * 1024 * 1024 * 1024;

function formatBytes(b: number) {
  if (b >= 1e9) return (b / 1e9).toFixed(1) + ' GB';
  if (b >= 1e6) return (b / 1e6).toFixed(1) + ' MB';
  return (b / 1e3).toFixed(0) + ' KB';
}

function formatDuration(sec: number | null) {
  if (!sec) return null;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function StatusBadge({ status }: { status: Video['status'] }) {
  if (status === 'ready') return (
    <span className="flex items-center gap-1 text-xs text-green-400 bg-green-500/10 px-2.5 py-1 rounded-full">
      <Check size={11} />Pronto
    </span>
  );
  if (status === 'uploading') return (
    <span className="flex items-center gap-1 text-xs text-yellow-400 bg-yellow-500/10 px-2.5 py-1 rounded-full">
      <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />Enviando…
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-xs text-red-400 bg-red-500/10 px-2.5 py-1 rounded-full">
      <AlertCircle size={11} />Falhou
    </span>
  );
}

export default function VideosPage() {
  const qc = useQueryClient();
  const [progress, setProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const { data: videos = [], isLoading } = useQuery({
    queryKey: ['videos'],
    queryFn: listVideos,
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadVideo(file, setProgress),
    onSuccess: () => {
      setProgress(null);
      setUploadError('');
      setPendingFile(null);
      qc.invalidateQueries({ queryKey: ['videos'] });
    },
    onError: (err: unknown) => {
      setProgress(null);
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message;
      setUploadError(msg ?? 'Erro ao enviar vídeo.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteVideo,
    onSuccess: () => {
      setDeletingId(null);
      qc.invalidateQueries({ queryKey: ['videos'] });
    },
    onSettled: () => setDeletingId(null),
  });

  const [optimizeMsg, setOptimizeMsg] = useState<{ id: string; text: string; ok: boolean } | null>(null);
  const reoptimizeMutation = useMutation({
    mutationFn: reoptimizeVideo,
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['videos'] });
      if (res.optimized) {
        const pct = res.old_size_bytes > 0
          ? Math.round((1 - res.new_size_bytes / res.old_size_bytes) * 100)
          : 0;
        setOptimizeMsg({ id: res.video_id, ok: true, text: `Otimizado: ${formatBytes(res.old_size_bytes)} → ${formatBytes(res.new_size_bytes)} (−${pct}%)` });
      } else {
        setOptimizeMsg({ id: res.video_id, ok: false, text: res.reason || 'Nada a otimizar.' });
      }
    },
    onError: (err: unknown, id) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message;
      setOptimizeMsg({ id, ok: false, text: msg ?? 'Erro ao otimizar.' });
    },
  });

  function handleFileSelect(file: File) {
    if (file.size > MAX_BYTES) { setUploadError('Arquivo excede 2 GB.'); return; }
    setUploadError('');
    setPendingFile(file);
    uploadMutation.mutate(file);
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Vídeos</h1>
          <p className="text-gray-500 text-sm mt-0.5">{videos.length} vídeo{videos.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {uploadError && (
        <div className="flex items-start gap-2.5 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          {uploadError}
        </div>
      )}

      {/* Upload dropzone — always visible, shows preview during upload */}
      <div className="bg-[#18181b] border border-white/5 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-white">Enviar vídeo</p>
            <p className="text-xs text-gray-600 mt-0.5">MP4, MOV ou WebM · até 2 GB por arquivo</p>
          </div>
          {uploadMutation.isPending && (
            <span className="text-xs text-green-400 font-mono font-bold">{progress ?? 0}%</span>
          )}
        </div>
        <VideoDropzone
          onFileSelect={handleFileSelect}
          loading={uploadMutation.isPending}
          progress={progress}
          previewFile={pendingFile}
        />
      </div>

      {/* Video list */}
      {isLoading ? (
        <div className="space-y-3">
          {[0,1,2].map(i => <div key={i} className="bg-[#18181b] border border-white/5 rounded-2xl h-20 animate-pulse" />)}
        </div>
      ) : videos.length === 0 && !uploadMutation.isPending ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#18181b] flex items-center justify-center mx-auto mb-4">
            <Film size={28} className="text-gray-600" />
          </div>
          <p className="text-white font-medium mb-1">Nenhum vídeo ainda</p>
          <p className="text-gray-500 text-sm">Use o campo acima para enviar seu primeiro vídeo</p>
        </div>
      ) : (
        <div className="space-y-3">
          {videos.map(v => (
            <div key={v.id}
              className="bg-[#18181b] border border-white/5 hover:border-white/10 rounded-2xl p-4 flex items-center gap-4 transition-colors">
              {/* Video thumbnail */}
              {v.status === 'ready' ? (
                <VideoThumbnail videoId={v.id} className="w-20 h-14 shrink-0" />
              ) : (
                <div className="w-20 h-14 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                  <Film size={18} className="text-gray-600" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{v.original_name}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-gray-500">{formatBytes(v.size_bytes)}</span>
                  {v.duration_seconds && (
                    <span className="text-xs text-gray-600 flex items-center gap-1">
                      <Clock size={10} />{formatDuration(v.duration_seconds)}
                    </span>
                  )}
                </div>
                {optimizeMsg?.id === v.id && (
                  <p className={`text-xs mt-1 ${optimizeMsg.ok ? 'text-green-400' : 'text-gray-500'}`}>
                    {optimizeMsg.text}
                  </p>
                )}
              </div>
              <StatusBadge status={v.status} />
              {v.status === 'ready' && (
                <button
                  onClick={() => { setOptimizeMsg(null); reoptimizeMutation.mutate(v.id); }}
                  disabled={reoptimizeMutation.isPending}
                  title="Comprimir para carregar rápido no celular"
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-600 hover:text-[#FE015C] hover:bg-[#FE015C]/10 transition-all disabled:opacity-50"
                >
                  {reoptimizeMutation.isPending && reoptimizeMutation.variables === v.id ? (
                    <span className="w-3.5 h-3.5 border-2 border-[#FE015C]/40 border-t-[#FE015C] rounded-full animate-spin" />
                  ) : (
                    <Zap size={15} />
                  )}
                </button>
              )}
              {deletingId === v.id ? (
                <div className="flex items-center gap-1.5">
                  <button onClick={() => deleteMutation.mutate(v.id)} disabled={deleteMutation.isPending}
                    className="text-xs text-red-400 hover:text-red-300 font-medium disabled:opacity-50">
                    {deleteMutation.isPending ? '…' : 'Confirmar'}
                  </button>
                  <span className="text-gray-600">·</span>
                  <button onClick={() => setDeletingId(null)} className="text-xs text-gray-500 hover:text-gray-300">
                    Cancelar
                  </button>
                </div>
              ) : (
                <button onClick={() => setDeletingId(v.id)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all">
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
