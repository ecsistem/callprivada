import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getVideoURL } from '../../services/videoService';
import { Play, Film } from 'lucide-react';

interface VideoThumbnailProps {
  videoId: string;
  className?: string;
  /** Se true, renderiza <video> inline ao clicar. Se false, só mostra thumbnail com botão play. */
  playInline?: boolean;
}

export function VideoThumbnail({ videoId, className = '', playInline = true }: VideoThumbnailProps) {
  const [playing, setPlaying] = useState(false);

  const { data: url, isLoading } = useQuery({
    queryKey: ['video-url', videoId],
    queryFn: () => getVideoURL(videoId),
    staleTime: 1000 * 60 * 30, // 30min — presigned URL válida por 1h
    enabled: Boolean(videoId),
  });

  if (isLoading) {
    return (
      <div className={`bg-white/5 rounded-xl flex items-center justify-center ${className}`}>
        <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
      </div>
    );
  }

  if (!url) {
    return (
      <div className={`bg-white/5 rounded-xl flex items-center justify-center ${className}`}>
        <Film size={20} className="text-gray-600" />
      </div>
    );
  }

  if (playing) {
    return (
      <div className={`relative bg-black rounded-xl overflow-hidden ${className}`}>
        <video
          src={url}
          autoPlay
          controls
          className="w-full h-full object-contain"
          onEnded={() => setPlaying(false)}
        />
      </div>
    );
  }

  return (
    <div
      className={`relative bg-black rounded-xl overflow-hidden cursor-pointer group ${className}`}
      onClick={() => playInline && setPlaying(true)}
    >
      <video
        src={url}
        className="w-full h-full object-cover"
        muted
        preload="metadata"
      />
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-colors" />
      {/* Play button */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 group-hover:scale-110 transition-all">
          <Play size={16} className="text-white ml-0.5" fill="white" />
        </div>
      </div>
    </div>
  );
}
