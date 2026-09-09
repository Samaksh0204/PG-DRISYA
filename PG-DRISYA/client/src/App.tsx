import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { SearchPage } from './pages/SearchPage';
import { ListingDetailPage } from './pages/ListingDetailPage';
import { LoginPage } from './pages/LoginPage';
import { TenantDashboardPage } from './pages/TenantDashboardPage';
import { OwnerDashboardPage } from './pages/OwnerDashboardPage';
import { PricingPage } from './pages/PricingPage';
import { TrustSafetyPage } from './pages/TrustSafetyPage';
import { ExpertPage } from './pages/ExpertPage';
import { MessagesPage } from './pages/MessagesPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { EditProfilePage } from './pages/EditProfilePage';
import { AadhaarPage } from './pages/AadhaarPage';
import { Compass } from 'lucide-react';

function NotFoundPage() {
  const { navigate } = useApp();
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-coral-50 text-coral-500">
        <Compass className="h-8 w-8" />
      </div>
      <h1 className="mt-4 font-display text-3xl font-bold text-ink-900 dark:text-white">Page not found</h1>
      <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">The page you're looking for doesn't exist or has moved.</p>
      <button onClick={() => navigate('/')} className="btn-primary mt-6">Back to home</button>
    </div>
  );
}

function Router() {
  const { route } = useApp();
  const path = route.split('?')[0];

  if (path === '/' || path === '') return <HomePage />;
  if (path === '/search') return <SearchPage />;
  if (path.startsWith('/listing/')) return <ListingDetailPage />;
  if (path === '/login') return <LoginPage />;
  if (path === '/dashboard') return <TenantDashboardPage />;
  if (path === '/owner') return <OwnerDashboardPage />;
  if (path === '/pricing') return <PricingPage />;
  if (path === '/trust') return <TrustSafetyPage />;
  if (path === '/expert') return <ExpertPage />;
  if (path === '/messages') return <MessagesPage />;
  if (path === '/notifications') return <NotificationsPage />;
  if (path === '/profile/edit') return <EditProfilePage />;
  if (path === '/aadhaar') return <AadhaarPage />;

  return <NotFoundPage />;
}

function Shell() {
  const { route } = useApp();
  const path = route.split('?')[0];
  const hideChrome = path === '/messages';

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-ink-950">
      <Header />
      <main className="flex-1">
        <Router />
      </main>
      {!hideChrome && <Footer />}
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}

export default App;
