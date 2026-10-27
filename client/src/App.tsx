import { Suspense, lazy, useEffect, type ComponentType } from 'react';
import { Compass } from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { ErrorBoundary, PageLoader, ServerWakingBanner, Toaster } from './components/ui';
import { HomePage } from './pages/HomePage';
// Pages other than the homepage load on demand, so the first visit downloads less.
const page = <T extends Record<string, unknown>>(load: () => Promise<T>, name: keyof T) =>
  lazy(() => load().then((m) => ({ default: m[name] as unknown as ComponentType })));
const loaders = {
  search: () => import('./pages/SearchPage'),
  listing: () => import('./pages/ListingDetailPage'),
  login: () => import('./pages/LoginPage'),
  auth: () => import('./pages/AuthFlowPages'),
  tenant: () => import('./pages/TenantDashboardPage'),
  owner: () => import('./pages/OwnerDashboardPage'),
  pricing: () => import('./pages/PricingPage'),
  trust: () => import('./pages/TrustSafetyPage'),
  expert: () => import('./pages/ExpertPage'),
  messages: () => import('./pages/MessagesPage'),
  notifications: () => import('./pages/NotificationsPage'),
  editProfile: () => import('./pages/EditProfilePage'),
  aadhaar: () => import('./pages/AadhaarPage'),
  admin: () => import('./pages/AdminPage'),
  host: () => import('./pages/HostProfilePage'),
  legal: () => import('./pages/LegalPages'),
};
const SearchPage = page(loaders.search, 'SearchPage');
const ListingDetailPage = page(loaders.listing, 'ListingDetailPage');
const LoginPage = page(loaders.login, 'LoginPage');
const ForgotPasswordPage = page(loaders.auth, 'ForgotPasswordPage');
const ResetPasswordPage = page(loaders.auth, 'ResetPasswordPage');
const VerifyEmailPage = page(loaders.auth, 'VerifyEmailPage');
const TenantDashboardPage = page(loaders.tenant, 'TenantDashboardPage');
const OwnerDashboardPage = page(loaders.owner, 'OwnerDashboardPage');
const PricingPage = page(loaders.pricing, 'PricingPage');
const TrustSafetyPage = page(loaders.trust, 'TrustSafetyPage');
const ExpertPage = page(loaders.expert, 'ExpertPage');
const MessagesPage = page(loaders.messages, 'MessagesPage');
const NotificationsPage = page(loaders.notifications, 'NotificationsPage');
const EditProfilePage = page(loaders.editProfile, 'EditProfilePage');
const AadhaarPage = page(loaders.aadhaar, 'AadhaarPage');
const AdminPage = page(loaders.admin, 'AdminPage');
const HostProfilePage = page(loaders.host, 'HostProfilePage');
const PrivacyPage = page(loaders.legal, 'PrivacyPage');
const TermsPage = page(loaders.legal, 'TermsPage');
const HelpPage = page(loaders.legal, 'HelpPage');

// After the first page has loaded, fetch the most-visited pages in the background
// so opening them later is instant.
function usePrefetchCommonPages() {
  useEffect(() => {
    const run = () => { loaders.search(); loaders.listing(); loaders.login(); };
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(run);
    else setTimeout(run, 2000);
  }, []);
}

function NotFoundPage() {
  const { navigate } = useApp();
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-500"><Compass className="h-8 w-8" /></div>
      <h1 className="mt-4 font-display text-3xl font-bold text-ink-900 dark:text-white">Page not found</h1>
      <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">The page you're looking for doesn't exist or has moved.</p>
      <button onClick={() => navigate('/')} className="btn-primary mt-6">Back to home</button>
    </div>
  );
}

const ROUTES: Record<string, { page: ComponentType; title: string }> = {
  '/': { page: HomePage, title: 'PG Drisya — PGs & hostels with no brokerage' },
  '/search': { page: SearchPage, title: 'Search PGs' },
  '/login': { page: LoginPage, title: 'Log in' },
  '/forgot-password': { page: ForgotPasswordPage, title: 'Reset password' },
  '/reset-password': { page: ResetPasswordPage, title: 'Choose a new password' },
  '/verify-email': { page: VerifyEmailPage, title: 'Confirm email' },
  '/dashboard': { page: TenantDashboardPage, title: 'My trips' },
  '/owner': { page: OwnerDashboardPage, title: 'Host dashboard' },
  '/admin': { page: AdminPage, title: 'Admin' },
  '/pricing': { page: PricingPage, title: 'Pricing' },
  '/trust': { page: TrustSafetyPage, title: 'Trust & Safety' },
  '/expert': { page: ExpertPage, title: 'Drisya Expert' },
  '/messages': { page: MessagesPage, title: 'Messages' },
  '/notifications': { page: NotificationsPage, title: 'Notifications' },
  '/profile/edit': { page: EditProfilePage, title: 'Account settings' },
  '/aadhaar': { page: AadhaarPage, title: 'ID verification' },
  '/privacy': { page: PrivacyPage, title: 'Privacy Policy' },
  '/terms': { page: TermsPage, title: 'Terms of Service' },
  '/help': { page: HelpPage, title: 'Help centre' },
};

export function resolveRoute(path: string): { Page: ComponentType; title: string } {
  if (path.startsWith('/listing/')) return { Page: ListingDetailPage, title: 'PG details' };
  if (path.startsWith('/user/')) return { Page: HostProfilePage, title: 'Profile' };
  const r = ROUTES[path];
  return r ? { Page: r.page, title: r.title } : { Page: NotFoundPage, title: 'Not found' };
}

function Shell() {
  const { route } = useApp();
  const path = route.split('?')[0] || '/';
  const { Page, title } = resolveRoute(path);
  usePrefetchCommonPages();
  useEffect(() => { document.title = path === '/' ? title : `${title} · PG Drisya`; }, [path, title]);

  return (
    <div className="flex min-h-screen flex-col bg-page">
      <a href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }} className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-[70] focus:rounded focus:bg-white focus:px-3 focus:py-2">Skip to content</a>
      <Header />
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        <ErrorBoundary key={path}>
          <Suspense fallback={<PageLoader />}>
            <Page />
          </Suspense>
        </ErrorBoundary>
      </main>
      {path !== '/messages' && <Footer />}
      <Toaster />
      <ServerWakingBanner />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
