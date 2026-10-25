import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import type { User } from '../types';
import {
  getMe, login as apiLogin, register as apiRegister, clearToken, setToken, getToken, fetchFavoriteIds, setUnauthorizedHandler,
} from '../services/api';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  favoriteIds: Set<string>;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { fullName: string; email: string; password: string; phone?: string; role: string; acceptTerms: boolean }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setSession: (token: string, user: User) => Promise<void>;
  refreshFavorites: () => Promise<void>;
  toggleFavLocal: (id: string, saved: boolean) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  const reset = useCallback(async () => {
    await clearToken();
    setUser(null);
    setFavoriteIds(new Set());
  }, []);

  // Password changed elsewhere, account suspended or token expired.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      reset();
      Alert.alert('Signed out', 'Your session has ended. Please sign in again.');
    });
    return () => setUnauthorizedHandler(null);
  }, [reset]);

  useEffect(() => {
    (async () => {
      try {
        if (!(await getToken())) return;
        const { user: me } = await getMe();
        setUser(me);
        setFavoriteIds(new Set(await fetchFavoriteIds().catch(() => [] as string[])));
      } catch {
        await reset();
      } finally {
        setLoading(false);
      }
    })();
  }, [reset]);

  const login = async (email: string, password: string) => {
    const data = await apiLogin(email, password);
    setUser(data.user);
    setFavoriteIds(new Set(await fetchFavoriteIds().catch(() => [] as string[])));
  };

  const register: AuthContextValue['register'] = async (data) => {
    const res = await apiRegister(data);
    setUser(res.user);
    setFavoriteIds(new Set());
  };

  const setSession = async (token: string, u: User) => {
    await setToken(token);
    setUser(u);
  };

  const refreshUser = async () => {
    try { setUser((await getMe()).user); } catch { /* handled by 401 handler */ }
  };

  const refreshFavorites = async () => {
    try { setFavoriteIds(new Set(await fetchFavoriteIds())); } catch { /* ignore */ }
  };

  const toggleFavLocal = (id: string, saved: boolean) => {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (saved) next.add(id); else next.delete(id);
      return next;
    });
  };

  return (
    <AuthContext.Provider value={{ user, loading, favoriteIds, login, register, logout: reset, refreshUser, setSession, refreshFavorites, toggleFavLocal }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
