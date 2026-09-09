import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Role, City } from '../types';
import { getMe, clearToken, setToken, fetchFavorites, toggleFavorite, fetchCities, fetchNotifications } from '../lib/api';
import { cities as staticCities } from '../data/mockData';

interface AuthState {
  id: string;
  role: Role;
  name: string;
  email: string;
  verified: boolean;
  aadhaarVerified: boolean;
  avatar: string;
  phone: string;
}

interface AppState {
  route: string;
  navigate: (to: string) => void;
  auth: AuthState | null;
  authLoading: boolean;
  loginFromToken: (token: string) => Promise<void>;
  logout: () => void;
  refreshAuth: () => Promise<void>;
  wishlist: string[];
  toggleWishlist: (id: string) => void;
  wishlistLoading: boolean;
  cities: City[];
  darkMode: boolean;
  toggleDarkMode: () => void;
  language: string;
  setLanguage: (lang: string) => void;
  unreadNotifications: number;
  refreshNotifications: () => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);

const parseRoute = () => {
  const hash = window.location.hash.replace(/^#/, '');
  return hash || '/';
};

function mapUserToAuth(user: any): AuthState {
  return {
    id: user._id || user.id,
    role: user.role as Role,
    name: user.fullName,
    email: user.email,
    verified: user.verified || false,
    aadhaarVerified: user.aadhaarVerified || false,
    avatar: user.avatar || '',
    phone: user.phone || '',
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState(parseRoute());
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [cities, setCities] = useState<City[]>(staticCities);
  const [darkMode, setDarkMode] = useState(false);
  const [language, setLanguage] = useState('en');
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    const onHash = () => setRoute(parseRoute());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  // Fetch cities once on mount, merge with static data for images
  useEffect(() => {
    fetchCities().then((data) => {
      if (data.length > 0) {
        const merged = staticCities.map((sc) => {
          const apiCity = data.find((c) => c.name.toLowerCase() === sc.name.toLowerCase());
          return apiCity ? { ...sc, listingCount: apiCity.listingCount } : sc;
        });
        setCities(merged);
      }
    }).catch(() => {});
  }, []);

  const refreshNotifications = useCallback(async () => {
    try {
      const data = await fetchNotifications(1);
      setUnreadNotifications(data.unreadCount);
    } catch {
      // silent
    }
  }, []);

  // Restore session from stored JWT on mount
  useEffect(() => {
    let mounted = true;
    const token = localStorage.getItem('drisya_token');
    if (!token) {
      setAuthLoading(false);
      return;
    }
    (async () => {
      try {
        const { user } = await getMe();
        if (!mounted) return;
        setAuth(mapUserToAuth(user));
        const favs = await fetchFavorites();
        if (mounted) setWishlist(favs);
        // fetch notification count
        try {
          const notifData = await fetchNotifications(1);
          if (mounted) setUnreadNotifications(notifData.unreadCount);
        } catch {}
      } catch {
        clearToken();
      } finally {
        if (mounted) setAuthLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const navigate = useCallback((to: string) => {
    window.location.hash = to;
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  const loginFromToken = useCallback(async (token: string) => {
    setToken(token);
    const { user } = await getMe();
    setAuth(mapUserToAuth(user));
    const favs = await fetchFavorites();
    setWishlist(favs);
    try {
      const notifData = await fetchNotifications(1);
      setUnreadNotifications(notifData.unreadCount);
    } catch {}
  }, []);

  const refreshAuth = useCallback(async () => {
    try {
      const { user } = await getMe();
      setAuth(mapUserToAuth(user));
    } catch {}
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setAuth(null);
    setWishlist([]);
    setUnreadNotifications(0);
    navigate('/');
  }, [navigate]);

  const toggleWishlistCb = useCallback((id: string) => {
    setWishlist((prev) => {
      const isSaved = prev.includes(id);
      const next = isSaved ? prev.filter((x) => x !== id) : [...prev, id];
      if (auth?.id) {
        setWishlistLoading(true);
        toggleFavorite(id)
          .catch(() => { setWishlist(prev); })
          .finally(() => setWishlistLoading(false));
      }
      return next;
    });
  }, [auth?.id]);

  const toggleDarkMode = useCallback(() => setDarkMode((d) => !d), []);

  const value = useMemo<AppState>(
    () => ({
      route,
      navigate,
      auth,
      authLoading,
      loginFromToken,
      logout,
      refreshAuth,
      wishlist,
      toggleWishlist: toggleWishlistCb,
      wishlistLoading,
      cities,
      darkMode,
      toggleDarkMode,
      language,
      setLanguage,
      unreadNotifications,
      refreshNotifications,
    }),
    [route, navigate, auth, authLoading, loginFromToken, logout, refreshAuth, wishlist, toggleWishlistCb, wishlistLoading, cities, darkMode, toggleDarkMode, language, unreadNotifications, refreshNotifications],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
