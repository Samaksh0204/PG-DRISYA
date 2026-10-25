import { useState } from 'react';
import { Fingerprint, FlaskConical } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { verifyAadhaar } from '../lib/api';
import { ErrorText, PageLoader, SignInRequired } from '../components/ui';
import { IdentityVerificationCard } from '../components/IdentityVerification';
import { siteConfig } from '../lib/config';

// Identity verification runs on an authorised provider's pages (see server
// routes/identity.js). The old number-entry demo below is development-only: it shows
// only with VITE_AADHAAR_SIMULATION=true, and the server refuses it in production.
export function AadhaarPage() {
  const { auth, authLoading } = useApp();
  if (authLoading) return <PageLoader />;
  if (!auth) return <SignInRequired message="Log in to verify your identity." />;
  return (
    <div className="container-page py-12">
      <div className="mx-auto max-w-xl space-y-6">
        <div className="card p-6 sm:p-8">
          <h1 className="mb-1 flex items-center gap-2 text-xl font-bold text-ink-900 dark:text-white"><Fingerprint className="h-5 w-5 text-brand-500" /> Identity verification</h1>
          <p className="mb-5 text-sm text-ink-500">A verified identity helps hosts and tenants trust each other.</p>
          <IdentityVerificationCard />
        </div>
        {siteConfig.aadhaarSimulation && !auth.aadhaarVerified && <SimulationDemo />}
      </div>
    </div>
  );
}

function SimulationDemo() {
  const { refreshAuth } = useApp();
  const [num, setNum] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      await verifyAadhaar(num.replace(/\s/g, ''));
      await refreshAuth();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="card border-dashed p-6">
      <p className="flex items-center gap-2 text-sm font-semibold text-amber-700"><FlaskConical className="h-4 w-4" /> Development demo</p>
      <p className="mt-1 text-xs text-ink-500">Simulated — no real verification takes place. Disabled on production servers.</p>
      <input className="input mt-4 w-full" inputMode="numeric" maxLength={14} placeholder="12-digit test number" value={num} onChange={(e) => setNum(e.target.value)} aria-label="Test Aadhaar number" />
      <div className="mt-3"><ErrorText>{error}</ErrorText></div>
      <button onClick={submit} disabled={busy} className="btn-outline mt-4 w-full">{busy ? 'Checking…' : 'Run demo check'}</button>
    </div>
  );
}
