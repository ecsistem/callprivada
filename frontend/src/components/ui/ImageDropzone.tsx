import { useCallback, useState } from 'react';
import { ImagePlus, Upload, Trash2, X } from 'lucide-react';

interface ImageDropzoneProps {
  previewUrl: string | null;
  fileName?: string | null;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
  onClick: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  label?: string;
  hint?: string;
  loading?: boolean;
  className?: string;
}

export function ImageDropzone({
  previewUrl,
  fileName,
  onFileChange,
  onRemove,
  onClick,
  fileInputRef,
  label = 'Clique para selecionar',
  hint = 'ou arraste e solte aqui',
  loading = false,
  className = '',
}: ImageDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };
  const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file && file.type.startsWith('image/')) {
        const fakeEvent = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>;
        onFileChange(fakeEvent);
      }
    },
    [onFileChange],
  );

  return (
    <div className={className}>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        ref={fileInputRef}
        onChange={onFileChange}
      />

      {!previewUrl ? (
        <div
          onClick={onClick}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center gap-3 h-44 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${
            isDragging
              ? 'border-green-500/60 bg-green-500/5'
              : 'border-white/10 bg-[#111115] hover:border-white/20 hover:bg-white/[0.02]'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
            <ImagePlus size={18} className="text-gray-500" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-300">{label}</p>
            <p className="text-xs text-gray-600 mt-0.5">{hint}</p>
          </div>
          {loading && (
            <div className="w-5 h-5 border-2 border-white/20 border-t-green-400 rounded-full animate-spin" />
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="group relative h-44 rounded-2xl overflow-hidden border border-white/10">
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                type="button"
                onClick={onClick}
                className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
                title="Trocar imagem"
              >
                <Upload size={15} className="text-white" />
              </button>
              <button
                type="button"
                onClick={onRemove}
                className="w-9 h-9 rounded-xl bg-red-500/20 hover:bg-red-500/40 flex items-center justify-center transition-colors"
                title="Remover"
              >
                <Trash2 size={15} className="text-red-400" />
              </button>
            </div>
            {loading && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-white/20 border-t-green-400 rounded-full animate-spin" />
              </div>
            )}
          </div>
          {fileName && (
            <div className="flex items-center gap-2 text-xs text-gray-500 px-1">
              <span className="flex-1 truncate">{fileName}</span>
              <button type="button" onClick={onRemove} className="hover:text-white transition-colors shrink-0">
                <X size={13} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
