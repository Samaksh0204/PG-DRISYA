import { useEffect, useState, useRef } from 'react';
import { Home, Search as SearchIcon, Heart, MessageCircle, User, Menu, X, Moon, Sun, ShieldCheck, LayoutDashboard, ChevronDown, Building2, Bell, UserCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SearchBar } from './SearchBar';

export function Header() {
  const { route, navigate, auth, logout, darkMode, toggleDarkMode, wishlist, unreadNotifications } = useApp();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const loginRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
      if (loginRef.current && !loginRef.current.contains(event.target as Node)) {
        setLoginOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLoginOpen(false);
        setProfileOpen(false);
        setMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const isHome = route === '/';
  const isSearch = route.startsWith('/search');

  const navLink = (to: string, label: string) => (
    <button
      onClick={() => navigate(to)}
      className={`text-sm font-medium transition-all duration-200 ${
        route === to
          ? 'text-coral-500 font-semibold border-b-2 border-coral-500 pb-1'
          : 'text-ink-700 hover:text-coral-500 dark:text-ink-200'
      }`}
    >
      {label}
    </button>
  );

  return (
    <header
      className={`sticky top-0 z-40 border-b transition-all duration-300 ${
        scrolled || !isHome
          ? 'border-ink-100 bg-white/90 backdrop-blur-md dark:border-ink-800 dark:bg-ink-950/90'
          : 'border-transparent bg-white/80 backdrop-blur-sm dark:bg-ink-950/80'
      }`}
    >
      <div className="container-page">
        <div className="flex h-16 items-center justify-between gap-4">
          <button onClick={() => navigate('/')} className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-coral-500 text-white shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <span className="font-display text-xl font-bold tracking-tight text-ink-900 dark:text-white">
              Drisya
            </span>
          </button>

          {!isSearch && (
            <div className="hidden flex-1 max-w-2xl lg:block">
              <div className="mx-8">
                <SearchBar compact />
              </div>
            </div>
          )}

          <nav className="hidden items-center gap-6 md:flex">
            {navLink('/', 'Home')}
            {navLink('/search', 'Explore')}
            {navLink('/pricing', 'Pricing')}
            {navLink('/expert', 'Drisya Expert')}
            {navLink('/trust', 'Trust & Safety')}
          </nav>

          <div className="flex items-center gap-2 transition-transform duration-200 hover:scale-105">
            <button
              onClick={toggleDarkMode}
              className="btn-ghost h-9 w-9 !p-0"
              aria-label="Toggle dark mode"
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* Notification bell — visible when logged in */}
            {auth && (
              <button
                onClick={() => navigate('/notifications')}
                className="btn-ghost relative h-9 w-9 !p-0"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadNotifications > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-coral-500 px-1 text-[10px] font-bold text-white">
                    {unreadNotifications > 99 ? '99+' : unreadNotifications}
                  </span>
                )}
              </button>
            )}

            {auth ? (
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setProfileOpen((o) => !o)}
                  className="flex items-center gap-2 rounded-full border border-ink-200 bg-white py-1 pl-1 pr-2 shadow-sm dark:border-ink-700 dark:bg-ink-900"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-coral-100 text-xs font-bold text-coral-700 dark:bg-coral-900/40 dark:text-coral-300">
                    {auth.name?.charAt(0).toUpperCase()}
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-ink-400" />
                </button>
                {profileOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-xl border border-ink-100 bg-white py-1 shadow-card-hover transition-all duration-200 animate-in fade-in zoom-in-95 dark:border-ink-700 dark:bg-ink-900">
                    <div className="border-b border-ink-50 px-4 py-3 dark:border-ink-800">
                      <p className="text-sm font-semibold text-ink-900 dark:text-ink-100">{auth.name}</p>
                      <p className="text-xs text-ink-400">{auth.email}</p>
                    </div>
                    <MenuItem icon={<LayoutDashboard className="h-4 w-4" />} label={auth.role === 'owner' ? 'Owner Dashboard' : 'My Dashboard'} onClick={() => { navigate(auth.role === 'owner' ? '/owner' : '/dashboard'); setProfileOpen(false); }} />
                    <MenuItem icon={<UserCircle className="h-4 w-4" />} label="Edit Profile" onClick={() => { navigate('/profile/edit'); setProfileOpen(false); }} />
                    <MenuItem icon={<MessageCircle className="h-4 w-4" />} label="Messages" onClick={() => { navigate('/messages'); setProfileOpen(false); }} />
                    <MenuItem icon={<Heart className="h-4 w-4" />} label={`Wishlist (${wishlist.length})`} onClick={() => { navigate('/dashboard'); setProfileOpen(false); }} />
                    <MenuItem icon={<Bell className="h-4 w-4" />} label={`Notifications${unreadNotifications > 0 ? ` (${unreadNotifications})` : ''}`} onClick={() => { navigate('/notifications'); setProfileOpen(false); }} />
                    {auth.role !== 'owner' && (
                      <MenuItem icon={<Building2 className="h-4 w-4" />} label="Switch to Owner" onClick={() => { navigate('/owner'); setProfileOpen(false); }} />
                    )}
                    <div className="my-1 border-t border-ink-50 dark:border-ink-800" />
                    <MenuItem icon={<X className="h-4 w-4" />} label="Log out" onClick={() => { logout(); setProfileOpen(false); }} />
                  </div>
                )}
              </div>
            ) : (
              <div className="relative hidden md:block" ref={loginRef}>
                <button
                  onClick={() => setLoginOpen((o) => !o)}
                  className="flex items-center gap-2 rounded-full border border-ink-200 px-3 py-2 text-sm font-medium shadow-sm transition hover:shadow-md dark:border-ink-700"
                >
                  <Menu className="h-4 w-4" />
                  <User className="h-4 w-4" />
                </button>
                {loginOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-xl border border-ink-100 bg-white py-1 shadow-card-hover transition-all duration-200 animate-in fade-in zoom-in-95 dark:border-ink-700 dark:bg-ink-900">
                    <MenuItem icon={<User className="h-4 w-4" />} label="Log in as Tenant" onClick={() => { navigate('/login?role=tenant'); setLoginOpen(false); }} />
                    <MenuItem icon={<Building2 className="h-4 w-4" />} label="Log in as Owner" onClick={() => { navigate('/login?role=owner'); setLoginOpen(false); }} />
                    <div className="my-1 border-t border-ink-50 dark:border-ink-800" />
                    <MenuItem icon={<Home className="h-4 w-4" />} label="Continue as Guest" onClick={() => { navigate('/search'); setLoginOpen(false); }} />
                  </div>
                )}
              </div>
            )}

            {!auth && (
              <button onClick={() => navigate('/login?role=owner')} className="btn-primary hidden text-xs sm:inline-flex">
                List your property
              </button>
            )}

            <button onClick={() => setMenuOpen(true)} className="btn-ghost h-9 w-9 !p-0 md:hidden">
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
              <button onClick={() => setMenuOpen(false)} className="btn-ghost h-8 w-8 !p-0">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-col gap-1">
              <MobileLink icon={<SearchIcon className="h-4 w-4" />} label="Explore" onClick={() => { navigate('/search'); setMenuOpen(false); }} />
              <MobileLink icon={<Heart className="h-4 w-4" />} label="Pricing" onClick={() => { navigate('/pricing'); setMenuOpen(false); }} />
              <MobileLink icon={<ShieldCheck className="h-4 w-4" />} label="Drisya Expert" onClick={() => { navigate('/expert'); setMenuOpen(false); }} />
              <MobileLink icon={<ShieldCheck className="h-4 w-4" />} label="Trust & Safety" onClick={() => { navigate('/trust'); setMenuOpen(false); }} />
              <div className="my-2 border-t border-ink-100 dark:border-ink-800" />
              {!auth && (
                <>
                  <MobileLink icon={<User className="h-4 w-4" />} label="Log in as Tenant" onClick={() => { navigate('/login?role=tenant'); setMenuOpen(false); }} />
                  <MobileLink icon={<Building2 className="h-4 w-4" />} label="Log in as Owner" onClick={() => { navigate('/login?role=owner'); setMenuOpen(false); }} />
                </>
              )}
              {auth && (
                <>
                  <MobileLink icon={<LayoutDashboard className="h-4 w-4" />} label={auth.role === 'owner' ? 'Owner Dashboard' : 'My Dashboard'} onClick={() => { navigate(auth.role === 'owner' ? '/owner' : '/dashboard'); setMenuOpen(false); }} />
                  <MobileLink icon={<Bell className="h-4 w-4" />} label={`Notifications${unreadNotifications > 0 ? ` (${unreadNotifications})` : ''}`} onClick={() => { navigate('/notifications'); setMenuOpen(false); }} />
                  <MobileLink icon={<MessageCircle className="h-4 w-4" />} label="Messages" onClick={() => { navigate('/messages'); setMenuOpen(false); }} />
                  <MobileLink icon={<UserCircle className="h-4 w-4" />} label="Edit Profile" onClick={() => { navigate('/profile/edit'); setMenuOpen(false); }} />
                  <MobileLink icon={<X className="h-4 w-4" />} label="Log out" onClick={() => { logout(); setMenuOpen(false); }} />
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
    <button onClick={onClick} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-ink-700 transition hover:bg-ink-50 dark:text-ink-200 dark:hover:bg-ink-800">
      {icon}
      {label}
    </button>
  );
}

function MobileLink({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-ink-700 transition hover:bg-ink-50 dark:text-ink-200 dark:hover:bg-ink-800">
      {icon}
      {label}
    </button>
  );
}
