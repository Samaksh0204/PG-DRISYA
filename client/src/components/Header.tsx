import { useEffect, useRef, useState } from 'react';
import {
  Search as SearchIcon, Heart, MessageCircle, User, Menu, X, Moon, Sun, ShieldCheck, LayoutDashboard,
  ChevronDown, Building2, Bell, Settings, LogOut, Shield, HelpCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SearchBar } from './SearchBar';
import { Avatar } from './ui';

export function Header() {
  const { route, navigate, auth, logout, darkMode, toggleDarkMode, unreadNotifications } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const path = route.split('?')[0];

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setProfileOpen(false); setMenuOpen(false); }
    };
    document.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onClick); window.removeEventListener('keydown', onKey); };
  }, []);

  useEffect(() => { setMenuOpen(false); setProfileOpen(false); }, [route]);

  const isOwner = auth?.role === 'owner' || auth?.role === 'admin';
  const items = auth
    ? [
        { icon: LayoutDashboard, label: 'My trips & wishlist', to: '/dashboard' },
        ...(isOwner ? [{ icon: Building2, label: 'Host dashboard', to: '/owner' }] : [{ icon: Building2, label: 'List your PG', to: '/owner' }]),
        ...(auth.role === 'admin' ? [{ icon: Shield, label: 'Admin', to: '/admin' }] : []),
        { icon: MessageCircle, label: 'Messages', to: '/messages' },
        { icon: Bell, label: `Notifications${unreadNotifications ? ` (${unreadNotifications})` : ''}`, to: '/notifications' },
        { icon: Settings, label: 'Account settings', to: '/profile/edit' },
        { icon: HelpCircle, label: 'Help', to: '/help' },
      ]
    : [];

  const navLink = (to: string, label: string) => (
    <button onClick={() => navigate(to)} className="nav-link" aria-current={path === to ? 'page' : undefined}>
      {label}
    </button>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-ink-200 bg-white/95 shadow-soft backdrop-blur-md dark:border-ink-800 dark:bg-ink-950/95">
      <div className="container-page">
        <div className="flex h-16 items-center justify-between gap-4">
          <button onClick={() => navigate('/')} className="group flex items-center gap-2" aria-label="PG Drisya home">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink-900 text-brand-400 shadow-sm transition group-hover:rotate-[-6deg] dark:bg-brand-500 dark:text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <span className="font-display text-xl font-bold tracking-tight text-ink-900 dark:text-white">Drisya</span>
          </button>

          {path !== '/search' && path !== '/' && (
            <div className="hidden max-w-xl flex-1 lg:block">
              <SearchBar compact />
            </div>
          )}

          <nav className="hidden items-center gap-6 md:flex" aria-label="Main">
            {navLink('/search', 'Explore')}
            {navLink('/expert', 'Drisya Expert')}
            {navLink('/trust', 'Trust & Safety')}
          </nav>

          <div className="flex items-center gap-1.5">
            <button onClick={toggleDarkMode} className="btn-ghost h-9 w-9 !p-0" aria-label="Toggle dark mode">
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {auth && (
              <>
                <button onClick={() => navigate('/dashboard?tab=saved')} className="btn-ghost hidden h-9 w-9 !p-0 sm:inline-flex" aria-label="Wishlist">
                  <Heart className="h-4 w-4" />
                </button>
                <button onClick={() => navigate('/notifications')} className="btn-ghost relative h-9 w-9 !p-0" aria-label="Notifications">
                  <Bell className="h-4 w-4" />
                  {unreadNotifications > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] font-bold text-white">
                      {unreadNotifications > 99 ? '99+' : unreadNotifications}
                    </span>
                  )}
                </button>
              </>
            )}

            {auth ? (
              <div className="relative hidden md:block" ref={profileRef}>
                <button
                  onClick={() => setProfileOpen((o) => !o)}
                  className="flex items-center gap-2 rounded-full border border-ink-200 bg-white py-1 pl-1 pr-2 shadow-sm dark:border-ink-700 dark:bg-ink-900"
                  aria-haspopup="menu"
                  aria-expanded={profileOpen}
                  aria-label="Account menu"
                >
                  <Avatar src={auth.avatar} name={auth.fullName} className="h-7 w-7 rounded-full object-cover" />
                  <ChevronDown className="h-3.5 w-3.5 text-ink-400" />
                </button>
                {profileOpen && (
                  <div role="menu" className="absolute right-0 top-full mt-2 w-60 overflow-hidden rounded-xl border border-ink-100 bg-white py-1 shadow-card-hover dark:border-ink-700 dark:bg-ink-900">
                    <div className="border-b border-ink-50 px-4 py-3 dark:border-ink-800">
                      <p className="truncate text-sm font-semibold text-ink-900 dark:text-ink-100">{auth.fullName}</p>
                      <p className="truncate text-xs text-ink-400">{auth.email}</p>
                    </div>
                    {items.map((it) => (
                      <MenuItem key={it.to} icon={<it.icon className="h-4 w-4" />} label={it.label} onClick={() => navigate(it.to)} />
                    ))}
                    <div className="my-1 border-t border-ink-50 dark:border-ink-800" />
                    <MenuItem icon={<LogOut className="h-4 w-4" />} label="Log out" onClick={logout} />
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden items-center gap-2 md:flex">
                <button onClick={() => navigate('/login')} className="btn-ghost text-sm">Log in</button>
                <button onClick={() => navigate('/login?role=owner&mode=signup')} className="btn-primary text-xs">List your PG</button>
              </div>
            )}

            <button onClick={() => setMenuOpen(true)} className="btn-ghost h-9 w-9 !p-0 md:hidden" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-72 overflow-auto bg-white p-4 shadow-xl dark:bg-ink-950">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-display text-lg font-bold">Menu</span>
              <button onClick={() => setMenuOpen(false)} className="btn-ghost h-8 w-8 !p-0" aria-label="Close menu"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex flex-col gap-1">
              <MobileLink icon={<SearchIcon className="h-4 w-4" />} label="Explore PGs" onClick={() => navigate('/search')} />
              <MobileLink icon={<User className="h-4 w-4" />} label="Drisya Expert" onClick={() => navigate('/expert')} />
              <MobileLink icon={<ShieldCheck className="h-4 w-4" />} label="Trust & Safety" onClick={() => navigate('/trust')} />
              <div className="my-2 border-t border-ink-100 dark:border-ink-800" />
              {auth ? (
                <>
                  {items.map((it) => <MobileLink key={it.to} icon={<it.icon className="h-4 w-4" />} label={it.label} onClick={() => navigate(it.to)} />)}
                  <MobileLink icon={<LogOut className="h-4 w-4" />} label="Log out" onClick={logout} />
                </>
              ) : (
                <>
                  <MobileLink icon={<User className="h-4 w-4" />} label="Log in" onClick={() => navigate('/login')} />
                  <MobileLink icon={<User className="h-4 w-4" />} label="Sign up" onClick={() => navigate('/login?mode=signup')} />
                  <MobileLink icon={<Building2 className="h-4 w-4" />} label="List your PG" onClick={() => navigate('/login?role=owner&mode=signup')} />
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function MenuItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button role="menuitem" onClick={onClick} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-ink-700 transition hover:bg-ink-50 dark:text-ink-200 dark:hover:bg-ink-800">
      {icon}{label}
    </button>
  );
}

function MobileLink({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-ink-700 transition hover:bg-ink-50 dark:text-ink-200 dark:hover:bg-ink-800">
      {icon}{label}
    </button>
  );
}
