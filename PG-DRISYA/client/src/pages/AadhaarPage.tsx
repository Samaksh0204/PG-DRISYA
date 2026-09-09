import { useState } from 'react';
import { ShieldCheck, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { verifyAadhaar } from '../lib/api';

export function AadhaarPage() {
  const { auth, navigate, refreshAuth } = useApp();
  const [aadhaar, setAadhaar] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verified, setVerified] = useState(auth?.aadhaarVerified || false);

  if (!auth) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <ShieldCheck className="h-12 w-12 text-ink-300" />
        <h2 className="mt-4 font-display text-xl font-bold text-ink-900 dark:text-white">Sign in to verify your Aadhaar</h2>
        <button onClick={() => navigate('/login')} className="btn-primary mt-4">Sign in</button>
      </div>
    );
  }

  if (verified) {
    return (
      <div className="container-page py-8">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-900/30">
            <CheckCircle2 className="h-10 w-10 text-teal-600" />
          </div>
          <h1 className="mt-6 font-display text-2xl font-bold text-ink-900 dark:text-white">Aadhaar Verified</h1>
          <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">Your identity has been verified. You now have access to enhanced trust features.</p>
          <button onClick={() => navigate('/dashboard')} className="btn-primary mt-6">Back to dashboard</button>
        </div>
      </div>
    );
  }

  const handleVerify = async () => {
    const cleaned = aadhaar.replace(/\s/g, '');
    if (!/^\d{12}$/.test(cleaned)) {
      setError('Please enter a valid 12-digit Aadhaar number');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await verifyAadhaar(cleaned);
      await refreshAuth();
      setVerified(true);
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const formatAadhaar = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 12);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  return (
    <div className="container-page py-8">
      <div className="mx-auto max-w-md">
        <button onClick={() => navigate('/profile/edit')} className="mb-4 flex items-center gap-2 text-sm text-ink-500 hover:text-coral-500">
          <ArrowLeft className="h-4 w-4" /> Back to profile
        </button>

        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 dark:bg-teal-900/30">
          <ShieldCheck className="h-8 w-8 text-teal-600" />
        </div>
        <h1 className="mt-4 text-center font-display text-2xl font-bold text-ink-900 dark:text-white">Aadhaar Verification</h1>
        <p className="mt-2 text-center text-sm text-ink-500 dark:text-ink-400">
          Verify your identity with your 12-digit Aadhaar number to unlock the Verified badge on your profile.
        </p>

        <div className="mt-8 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-500">Aadhaar Number</label>
            <input
              className="input text-center text-lg tracking-[0.3em]"
              value={aadhaar}
              onChange={(e) => setAadhaar(formatAadhaar(e.target.value))}
              placeholder="XXXX XXXX XXXX"
              maxLength={14}
              inputMode="numeric"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{error}</p>
          )}

          <button onClick={handleVerify} disabled={loading} className="btn-primary w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Verify Aadhaar
          </button>

          <p className="text-center text-[11px] text-ink-400">
            This is a simplified verification. Your Aadhaar number is stored securely and never shared.
          </p>
        </div>
      </div>
    </div>
  );
}
