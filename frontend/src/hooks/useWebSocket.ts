import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';

export type WSEvent = {
  type: string;
  payload: Record<string, unknown>;
};

type Handler = (event: WSEvent) => void;

export function useWebSocket(onEvent: Handler) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const wsRef = useRef<WebSocket | null>(null);
  const handlerRef = useRef<Handler>(onEvent);
  handlerRef.current = onEvent;

  const connect = useCallback(() => {
    if (!accessToken) return;

    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = window.location.host;

    const url = `${proto}://${host}/ws/dashboard?token=${encodeURIComponent(accessToken)}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data as string) as WSEvent;
        handlerRef.current(event);
      } catch {
        // ignora mensagens malformadas
      }
    };

    ws.onclose = () => {
      wsRef.current = null;
      // Reconecta após 5s em caso de queda inesperada.
      setTimeout(connect, 5000);
    };

    ws.onerror = () => ws.close();
  }, [accessToken]);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect]);
}
