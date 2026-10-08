import { create } from 'zustand';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  permissions: string[];
  sessionId: string | null;
  isAuthenticated: boolean;
  setAuth: (
    user: User,
    token: string,
    refreshToken?: string,
    permissions?: string[],
    sessionId?: string
  ) => void;
  updateToken: (token: string, refreshToken?: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null,
  token: localStorage.getItem('token') || null,
  refreshToken: localStorage.getItem('refreshToken') || null,
  permissions: localStorage.getItem('permissions')
    ? JSON.parse(localStorage.getItem('permissions')!)
    : [],
  sessionId: localStorage.getItem('sessionId') || null,
  isAuthenticated: !!localStorage.getItem('token'),

  setAuth: (user, token, refreshToken, permissions = [], sessionId) => {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', token);
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('permissions', JSON.stringify(permissions));
    if (sessionId) localStorage.setItem('sessionId', sessionId);

    set({
      user,
      token,
      refreshToken: refreshToken || null,
      permissions,
      sessionId: sessionId || null,
      isAuthenticated: true,
    });
  },

  updateToken: (token, refreshToken) => {
    localStorage.setItem('token', token);
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
    set((state) => ({
      token,
      refreshToken: refreshToken || state.refreshToken,
    }));
  },

  logout: () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('permissions');
    localStorage.removeItem('sessionId');
    set({
      user: null,
      token: null,
      refreshToken: null,
      permissions: [],
      sessionId: null,
      isAuthenticated: false,
    });
  },
}));
