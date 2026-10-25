import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Alert, AppState } from 'react-native';
import type { User } from '../types';
import {
  getMe, login as apiLogin, register as apiRegister, clearToken, setToken, getToken, fetchFavoriteIds, setUnauthorizedHandler,
  fetchUnreadMessageCount, fetchNotifications,
} from '../services/api';

const COUNTS_POLL_MS = 30000;

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  favoriteIds: Set<string>;
  unreadMessages: number;
  unreadNotifications: number;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { fullName: string; email: string; password: string; phone?: string; role: string; acceptTerms: boolean }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setSession: (token: string, user: User) => Promise<void>;
  setUser: (user: User) => void;
  refreshFavorites: () => Promise<void>;
  refreshCounts: () => Promise<void>;
  toggleFavLocal: (id: string, saved: boolean) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const reset = useCallback(async () => {
    await clearToken();
    setUser(null);
    setFavoriteIds(new Set());
    setUnreadMessages(0);
    setUnreadNotifications(0);
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

  const refreshCounts = useCallback(async () => {
    if (!user) return;
    const [m, n] = await Promise.all([
      fetchUnreadMessageCount().catch(() => null),
      fetchNotifications(1).then((r) => r.unreadCount).catch(() => null),
    ]);
    if (m !== null) setUnreadMessages(m);
    if (n !== null) setUnreadNotifications(n);
  }, [user]);

  // Keep badges fresh while the app is in the foreground.
  useEffect(() => {
    if (!user) return;
    refreshCounts();
    let timer: ReturnType<typeof setInterval> | null = setInterval(refreshCounts, COUNTS_POLL_MS);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refreshCounts();
        if (!timer) timer = setInterval(refreshCounts, COUNTS_POLL_MS);
      } else if (timer) {
        clearInterval(timer);
        timer = null;
      }
    });
    return () => {
      if (timer) clearInterval(timer);
      sub.remove();
    };
  }, [user?.id, refreshCounts]);

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
    <AuthContext.Provider
      value={{
        user, loading, favoriteIds, unreadMessages, unreadNotifications,
        login, register, logout: reset, refreshUser, setSession, setUser, refreshFavorites, refreshCounts, toggleFavLocal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
