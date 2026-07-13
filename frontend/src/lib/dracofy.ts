declare global {
  interface Window {
    DTrack?: {
      pageview: (path: string) => void;
      event: (name: string, props?: Record<string, unknown>) => void;
    };
  }
}

export function dracofyPageview(pathname: string) {
  try {
    window.DTrack?.pageview(pathname);
  } catch { /* ignore */ }
}

export function dracofyEvent(name: string, props?: Record<string, unknown>) {
  try {
    window.DTrack?.event(name, props);
  } catch { /* ignore */ }
}
