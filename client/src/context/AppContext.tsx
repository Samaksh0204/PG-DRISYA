import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Role, City, UserProfile } from '../types';
import {
  getMe, clearToken, setToken, getToken, fetchFavoriteIds, toggleFavorite, fetchCities,
  fetchNotifications, setUnauthorizedHandler,
} from '../lib/api';
import { cityImages } from '../data/cities';

export interface Toast {
  id: number;
  message: string;
  kind: 'success' | 'error' | 'info';
}

interface AppState {
  route: string;
  navigate: (to: string) => void;
  auth: UserProfile | null;
  authLoading: boolean;
  loginWithToken: (token: string) => Promise<UserProfile>;
  setAuthUser: (user: UserProfile) => void;
  logout: () => void;
  refreshAuth: () => Promise<void>;
  wishlist: string[];
  toggleWishlist: (id: string) => void;
  cities: City[];
  darkMode: boolean;
  toggleDarkMode: () => void;
  unreadNotifications: number;
  refreshNotifications: () => Promise<void>;
  toasts: Toast[];
  toast: (message: string, kind?: Toast['kind']) => void;
  dismissToast: (id: number) => void;
}

const AppContext = createContext<AppState | null>(null);

const parseRoute = () => window.location.hash.replace(/^#/, '') || '/';

function readDarkPref(): boolean {
  try {
    const saved = localStorage.getItem('drisya_dark');
    if (saved !== null) return saved === '1';
  } catch { /* ignore */ }
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState(parseRoute());
  const [auth, setAuth] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [darkMode, setDarkMode] = useState(readDarkPref);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  const toast = useCallback((message: string, kind: Toast['kind'] = 'success') => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-3), { id, message, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);
  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const navigate = useCallback((to: string) => {
    window.location.hash = to;
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  useEffect(() => {
    const onHash = () => setRoute(parseRoute());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    try { localStorage.setItem('drisya_dark', darkMode ? '1' : '0'); } catch { /* ignore */ }
  }, [darkMode]);

  // Cities with real listing counts. Images are matched by name; unknown cities get a placeholder.
  useEffect(() => {
    fetchCities()
      .then((data) =>
        setCities(
          data.map((c) => ({
            id: c.name.toLowerCase(),
            name: c.name,
            state: cityImages[c.name.toLowerCase()]?.state || '',
            listingCount: c.listingCount,
            image: cityImages[c.name.toLowerCase()]?.image || '',
          })),
        ),
      )
      .catch(() => setCities([]));
  }, []);

  const refreshNotifications = useCallback(async () => {
    if (!getToken()) return;
    try {
      setUnreadNotifications((await fetchNotifications(1)).unreadCount);
    } catch { /* silent */ }
  }, []);

  const loadSessionExtras = useCallback(async () => {
    const [ids] = await Promise.all([fetchFavoriteIds().catch(() => [] as string[]), refreshNotifications()]);
    setWishlist(ids);
  }, [refreshNotifications]);

  const resetSession = useCallback(() => {
    clearToken();
    setAuth(null);
    setWishlist([]);
    setUnreadNotifications(0);
  }, []);

  // Session expired / password changed elsewhere / account suspended.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      resetSession();
      toast('Your session has ended. Please log in again.', 'info');
    });
    return () => setUnauthorizedHandler(null);
  }, [resetSession, toast]);

  // Restore session from the stored token.
  useEffect(() => {
    let mounted = true;
    if (!getToken()) {
      setAuthLoading(false);
      return;
    }
    getMe()
      .then(async ({ user }) => {
        if (!mounted) return;
        setAuth(user);
        await loadSessionExtras();
      })
      .catch(() => resetSession())
      .finally(() => mounted && setAuthLoading(false));
    return () => { mounted = false; };
  }, [loadSessionExtras, resetSession]);

  // Poll the notification badge every minute while logged in.
  useEffect(() => {
    if (!auth) return;
    const tick = () => { if (document.visibilityState === 'visible') refreshNotifications(); };
    const t = setInterval(tick, 60000);
    document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', tick); };
  }, [auth, refreshNotifications]);

  const loginWithToken = useCallback(async (token: string) => {
    setToken(token);
    const { user } = await getMe();
    setAuth(user);
    await loadSessionExtras();
    return user;
  }, [loadSessionExtras]);

  const refreshAuth = useCallback(async () => {
    try {
      setAuth((await getMe()).user);
    } catch { /* handled by unauthorized handler */ }
  }, []);

  const logout = useCallback(() => {
    resetSession();
    navigate('/');
  }, [navigate, resetSession]);

  const toggleWishlist = useCallback((id: string) => {
    if (!auth) {
      toast('Log in to save PGs to your wishlist', 'info');
      navigate('/login');
      return;
    }
    // API call happens outside the state updater so StrictMode can't fire it twice.
    const wasSaved = wishlist.includes(id);
    setWishlist((prev) => (wasSaved ? prev.filter((x) => x !== id) : [...new Set([...prev, id])]));
    toggleFavorite(id)
      .then((saved) => toast(saved ? 'Saved to your wishlist' : 'Removed from your wishlist'))
      .catch((err) => {
        setWishlist((prev) => (wasSaved ? [...new Set([...prev, id])] : prev.filter((x) => x !== id)));
        toast(err.message || 'Could not update your wishlist', 'error');
      });
  }, [auth, wishlist, navigate, toast]);

  const toggleDarkMode = useCallback(() => setDarkMode((d) => !d), []);

  const value = useMemo<AppState>(() => ({
    route, navigate, auth, authLoading, loginWithToken, setAuthUser: setAuth, logout, refreshAuth,
    wishlist, toggleWishlist, cities, darkMode, toggleDarkMode, unreadNotifications, refreshNotifications,
    toasts, toast, dismissToast,
  }), [route, navigate, auth, authLoading, loginWithToken, logout, refreshAuth, wishlist, toggleWishlist, cities, darkMode, toggleDarkMode, unreadNotifications, refreshNotifications, toasts, toast, dismissToast]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export const isOwnerRole = (role?: Role) => role === 'owner' || role === 'admin';
