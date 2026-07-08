import { create } from 'zustand';
import type { User } from '../types/auth';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
  hydrate: () => void;
}

function loadFromStorage(): Pick<AuthState, 'user' | 'accessToken' | 'refreshToken'> {
  try {
    const raw = localStorage.getItem('auth');
    if (raw) {
      const { access_token, refresh_token, user } = JSON.parse(raw);
      if (user && access_token) return { user, accessToken: access_token, refreshToken: refresh_token };
    }
  } catch {
    localStorage.removeItem('auth');
  }
  return { user: null, accessToken: null, refreshToken: null };
}

export const useAuthStore = create<AuthState>((set) => ({
  ...loadFromStorage(),

  setAuth(user, accessToken, refreshToken) {
    localStorage.setItem('auth', JSON.stringify({ access_token: accessToken, refresh_token: refreshToken, user }));
    set({ user, accessToken, refreshToken });
  },

  clearAuth() {
    localStorage.removeItem('auth');
    set({ user: null, accessToken: null, refreshToken: null });
  },

  hydrate() {
    // mantido por compatibilidade — o estado já é carregado na inicialização
    const raw = localStorage.getItem('auth');
    if (!raw) return;
    try {
      const { access_token, refresh_token, user } = JSON.parse(raw);
      set({ user, accessToken: access_token, refreshToken: refresh_token });
    } catch {
      localStorage.removeItem('auth');
    }
  },
}));
