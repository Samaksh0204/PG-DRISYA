import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User } from '../types';
import { getMe, login as apiLogin, register as apiRegister, clearToken, setToken, fetchFavoriteIds } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthState {
  user: User | null;
  loading: boolean;
  favoriteIds: Set<string>;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (data: { fullName: string; email: string; password: string; phone?: string; role: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshFavorites: () => Promise<void>;
  toggleFavLocal: (id: string, saved: boolean) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true, favoriteIds: new Set() });

  const restoreSession = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('drisya_token');
      if (!token) { setState({ user: null, loading: false, favoriteIds: new Set() }); return; }

      const { user } = await getMe();
      const ids = await fetchFavoriteIds().catch(() => [] as string[]);
      setState({ user: user as User, loading: false, favoriteIds: new Set(ids) });
    } catch {
      await clearToken();
      setState({ user: null, loading: false, favoriteIds: new Set() });
    }
  }, []);

  useEffect(() => { restoreSession(); }, [restoreSession]);

  const login = async (email: string, password: string) => {
    const data = await apiLogin(email, password);
    const ids = await fetchFavoriteIds().catch(() => [] as string[]);
    setState({ user: data.user as User, loading: false, favoriteIds: new Set(ids) });
  };

  const register = async (data: { fullName: string; email: string; password: string; phone?: string; role: string }) => {
    const res = await apiRegister(data);
    setState({ user: res.user as User, loading: false, favoriteIds: new Set() });
  };

  const logout = async () => {
    await clearToken();
    setState({ user: null, loading: false, favoriteIds: new Set() });
  };

  const refreshUser = async () => {
    try {
      const { user } = await getMe();
      setState((prev) => ({ ...prev, user: user as User }));
    } catch {}
  };

  const refreshFavorites = async () => {
    try {
      const ids = await fetchFavoriteIds();
      setState((prev) => ({ ...prev, favoriteIds: new Set(ids) }));
    } catch {}
  };

  const toggleFavLocal = (id: string, saved: boolean) => {
    setState((prev) => {
      const next = new Set(prev.favoriteIds);
      if (saved) next.add(id); else next.delete(id);
      return { ...prev, favoriteIds: next };
    });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, refreshUser, refreshFavorites, toggleFavLocal }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
