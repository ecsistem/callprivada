import api from './api';

export interface Video {
  id: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  duration_seconds: number | null;
  status: 'uploading' | 'ready' | 'failed';
  created_at: string;
}

export async function uploadVideo(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<Video> {
  const form = new FormData();
  form.append('video', file);

  const { data } = await api.post<{ data: Video }>('/videos', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress(e) {
      if (onProgress && e.total) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    },
  });
  return data.data;
}

export async function listVideos(): Promise<Video[]> {
  const { data } = await api.get<{ data: Video[] }>('/videos');
  return data.data;
}

export async function getVideoURL(id: string): Promise<string> {
  const { data } = await api.get<{ url: string }>(`/videos/${id}/url`);
  return data.url;
}

export async function deleteVideo(id: string): Promise<void> {
  await api.delete(`/videos/${id}`);
}
