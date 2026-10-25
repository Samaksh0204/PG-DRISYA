import { useState } from 'react';
import { ShieldCheck, Info } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { verifyAadhaar } from '../lib/api';
import { ErrorText } from '../components/ui';
import { siteConfig } from '../lib/config';

// Online ID verification is OFF in production. Collecting Aadhaar numbers requires
// UIDAI authorisation or a DigiLocker / licensed KYC provider. The simulated form below
// is only shown when VITE_AADHAAR_SIMULATION=true (and the server has AADHAAR_SIMULATION=true).
export function AadhaarPage() {
  const { auth, refreshAuth, navigate } = useApp();
  const [num, setNum] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!siteConfig.aadhaarSimulation) {
    return (
      <div className="container-page flex min-h-[60vh] items-center justify-center py-12">
        <div className="card max-w-md p-8 text-center">
          <Info className="mx-auto h-10 w-10 text-brand-500" />
          <h1 className="mt-3 text-xl font-bold">Online ID verification is coming soon</h1>
          <p className="mt-2 text-sm text-ink-600 dark:text-ink-300">For now, our team verifies hosts manually. Never share your Aadhaar number with anyone on chat.</p>
          <button onClick={() => navigate('/trust')} className="btn-primary mt-6">How we keep Drisya safe</button>
        </div>
      </div>
    );
  }

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
    <div className="container-page flex min-h-[60vh] items-center justify-center py-12">
      <div className="card max-w-md p-8">
        <ShieldCheck className="h-10 w-10 text-brand-500" />
        <h1 className="mt-3 text-xl font-bold">ID check (demo mode)</h1>
        <p className="mt-1 text-xs text-amber-700">Simulated — no real verification takes place. Do not enable in production.</p>
        {auth?.aadhaarVerified ? <p className="mt-4 text-sm text-teal-700">Done (ending {auth && '····'}).</p> : (
          <>
            <input className="input mt-4 w-full" inputMode="numeric" maxLength={14} placeholder="12-digit number" value={num} onChange={(e) => setNum(e.target.value)} aria-label="Aadhaar number" />
            <div className="mt-3"><ErrorText>{error}</ErrorText></div>
            <button onClick={submit} disabled={busy} className="btn-primary mt-4 w-full">{busy ? 'Checking…' : 'Check'}</button>
          </>
        )}
      </div>
    </div>
  );
}
