import { useCallback, useRef, useState } from 'react';
import { Film, Upload, Trash2, X } from 'lucide-react';

interface VideoDropzoneProps {
  onFileSelect: (file: File) => void;
  loading?: boolean;
  progress?: number | null;
  previewFile?: File | null;
  label?: string;
  hint?: string;
}

function formatBytes(b: number) {
  if (b >= 1e9) return (b / 1e9).toFixed(1) + ' GB';
  if (b >= 1e6) return (b / 1e6).toFixed(1) + ' MB';
  return (b / 1e3).toFixed(0) + ' KB';
}

export function VideoDropzone({
  onFileSelect,
  loading = false,
  progress = null,
  previewFile = null,
  label = 'Clique para selecionar',
  hint = 'MP4, MOV ou WebM · até 2 GB',
}: VideoDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('video/')) return;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setFileName(file.name);
      onFileSelect(file);
    },
    [onFileSelect, previewUrl],
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };
  const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleRemove = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setFileName(null);
  };

  if (!previewFile && !previewUrl) {
    return (
      <>
        <input ref={inputRef} type="file" accept=".mp4,.mov,.webm,video/*" className="hidden" onChange={handleInputChange} />
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center gap-3 h-44 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${
            isDragging ? 'border-green-500/60 bg-green-500/5' : 'border-white/10 bg-[#1c0510] hover:border-white/20 hover:bg-white/[0.02]'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
            <Film size={18} className="text-gray-500" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-300">{label}</p>
            <p className="text-xs text-gray-600 mt-0.5">{hint}</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="space-y-2">
      <input ref={inputRef} type="file" accept=".mp4,.mov,.webm,video/*" className="hidden" onChange={handleInputChange} />

      {/* Video preview */}
      <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black">
        {previewUrl && (
          <video
            src={previewUrl}
            className="w-full max-h-52 object-contain"
            controls
            muted
            playsInline
          />
        )}

        {/* Progress overlay */}
        {loading && progress !== null && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-3 p-6">
            <div className="w-full bg-white/10 rounded-full h-1.5">
              <div
                className="bg-gradient-to-r from-green-500 to-emerald-400 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-white text-sm font-medium">Enviando… {progress}%</p>
          </div>
        )}

        {/* Actions overlay (only when not loading) */}
        {!loading && (
          <div className="absolute top-2 right-2 flex gap-1.5">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="w-8 h-8 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur flex items-center justify-center transition-colors"
              title="Trocar vídeo"
            >
              <Upload size={13} className="text-white" />
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="w-8 h-8 rounded-xl bg-red-500/40 hover:bg-red-500/60 backdrop-blur flex items-center justify-center transition-colors"
              title="Remover"
            >
              <Trash2 size={13} className="text-red-300" />
            </button>
          </div>
        )}
      </div>

      {/* Filename */}
      {fileName && (
        <div className="flex items-center gap-2 text-xs text-gray-500 px-1">
          <Film size={11} className="text-blue-400 shrink-0" />
          <span className="flex-1 truncate">{fileName}</span>
          {!loading && (
            <span className="text-gray-600 shrink-0">
              {previewFile ? formatBytes(previewFile.size) : ''}
            </span>
          )}
          {!loading && (
            <button type="button" onClick={handleRemove} className="hover:text-white transition-colors shrink-0">
              <X size={13} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
