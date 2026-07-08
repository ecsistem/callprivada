import { useCallback, useEffect, useRef, useState } from 'react';

interface UseImageUploadProps {
  onUpload?: (file: File, localUrl: string) => void;
  initialUrl?: string | null;
}

export function useImageUpload({ onUpload, initialUrl }: UseImageUploadProps = {}) {
  const previewRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialUrl ?? null);
  const [fileName, setFileName] = useState<string | null>(null);

  // sync if initialUrl changes (e.g. after server load)
  useEffect(() => {
    if (initialUrl && !previewRef.current) {
      setPreviewUrl(initialUrl);
    }
  }, [initialUrl]);

  const handleThumbnailClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      // revoke previous blob if it was a blob URL
      if (previewRef.current?.startsWith('blob:')) {
        URL.revokeObjectURL(previewRef.current);
      }
      setFileName(file.name);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      previewRef.current = url;
      onUpload?.(file, url);
    },
    [onUpload],
  );

  const handleRemove = useCallback(() => {
    if (previewRef.current?.startsWith('blob:')) {
      URL.revokeObjectURL(previewRef.current);
    }
    setPreviewUrl(null);
    setFileName(null);
    previewRef.current = null;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const setServerUrl = useCallback((url: string) => {
    // called after server confirms upload — replace blob with remote URL
    if (previewRef.current?.startsWith('blob:')) {
      URL.revokeObjectURL(previewRef.current);
    }
    previewRef.current = url;
    setPreviewUrl(url);
  }, []);

  useEffect(() => {
    return () => {
      if (previewRef.current?.startsWith('blob:')) {
        URL.revokeObjectURL(previewRef.current);
      }
    };
  }, []);

  return {
    previewUrl,
    fileName,
    fileInputRef,
    handleThumbnailClick,
    handleFileChange,
    handleRemove,
    setServerUrl,
  };
}
