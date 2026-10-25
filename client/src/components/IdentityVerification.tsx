import { useCallback, useEffect, useState } from 'react';
import { BadgeCheck, Clock, ExternalLink, Fingerprint, RefreshCw, ShieldAlert, ShieldOff } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ApiError, cancelIdentityVerification, fetchIdentityStatus, startIdentityVerification } from '../lib/api';
import { ErrorText, Spinner } from './ui';
import { formatDate } from '../lib/format';
import type { IdentityState } from '../types';

// Small badge shown on profiles/host cards — only when the server says the user is verified.
export function IdentityBadge({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 font-semibold text-brand-700 dark:bg-brand-900/30 dark:text-brand-300 ${size === 'md' ? 'text-sm' : 'text-xs'}`}>
      <Fingerprint className="h-3.5 w-3.5" /> ID verified
    </span>
  );
}

const REASONS: Record<string, string> = {
  provider_error: 'The verification service had a problem.',
  user_cancelled: 'You cancelled it.',
  superseded: 'A newer attempt replaced it.',
};

// Identity verification happens on an authorised provider's own pages. This card
// starts a session, sends the user there, and shows the status the server reports.
export function IdentityVerificationCard() {
  const { refreshAuth, toast } = useApp();
  const [state, setState] = useState<IdentityState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const s = await fetchIdentityStatus();
      setState((prev) => {
        if (prev && prev.status !== s.status) refreshAuth();
        return s;
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [refreshAuth]);

  useEffect(() => {
    load();
    // Coming back from the provider's tab/window: pick up the result.
    const onFocus = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('focus', onFocus);
    };
  }, [load]);

  // While pending, check every 10s (the provider's webhook can take a moment).
  useEffect(() => {
    if (state?.status !== 'pending') return;
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [state?.status, load]);

  const start = async () => {
    setBusy(true);
    setError('');
    try {
      const { redirectUrl } = await startIdentityVerification();
      window.open(redirectUrl, '_blank', 'noopener,noreferrer');
      await load();
    } catch (e) {
      if (e instanceof ApiError && e.status === 503) await load();
      else setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    setBusy(true);
    try {
      setState(await cancelIdentityVerification());
      toast('Verification cancelled', 'info');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="flex items-center gap-2 text-sm text-ink-500"><Spinner className="h-4 w-4" /> Checking status…</div>;
  if (!state) {
    return (
      <div>
        <ErrorText>{error || 'Could not load your verification status.'}</ErrorText>
        <button onClick={load} className="btn-outline mt-3"><RefreshCw className="h-4 w-4" /> Try again</button>
      </div>
    );
  }

  const last = state.latestAttempt;
  const view = {
    verified: { icon: BadgeCheck, tone: 'text-brand-700 bg-brand-50 dark:bg-brand-900/30 dark:text-brand-300', title: 'Verified', body: `Your identity was verified${state.verifiedAt ? ` on ${formatDate(state.verifiedAt)}` : ''}. An "ID verified" badge shows on your profile.` },
    pending: { icon: Clock, tone: 'text-amber-700 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-300', title: 'Pending', body: "Finish the steps on the verification provider's page. This page updates automatically." },
    rejected: { icon: ShieldAlert, tone: 'text-danger bg-danger/5', title: 'Not approved', body: 'The provider could not verify your identity. You can try again.' },
    unverified: state.available
      ? { icon: Fingerprint, tone: 'text-ink-700 bg-ink-100 dark:bg-ink-800 dark:text-ink-200', title: 'Not verified', body: 'Verify with Aadhaar through our authorised partner. You give consent on their page; we never see or store your Aadhaar number.' }
      : { icon: ShieldOff, tone: 'text-ink-700 bg-ink-100 dark:bg-ink-800 dark:text-ink-200', title: 'Verification unavailable', body: "Online ID verification isn't available yet. Our team verifies hosts manually for now. Never share your Aadhaar number in chat." },
  }[state.status];
  const Icon = view.icon;

  return (
    <div aria-live="polite">
      <div className={`flex items-start gap-3 rounded-xl p-4 ${view.tone}`}>
        <Icon className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="text-sm font-semibold">{view.title}</p>
          <p className="mt-0.5 text-sm opacity-90">{view.body}</p>
          {last && ['failed', 'expired', 'cancelled'].includes(last.status) && state.status !== 'verified' && (
            <p className="mt-1 text-xs opacity-80">Last attempt {last.status}. {REASONS[last.reason] || ''}</p>
          )}
        </div>
      </div>
      <ErrorText>{error}</ErrorText>
      <div className="mt-4 flex flex-wrap gap-3">
        {state.available && (state.status === 'unverified' || state.status === 'rejected') && (
          <button onClick={start} disabled={busy} className="btn-primary">{busy ? <Spinner className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />} {state.status === 'rejected' ? 'Try again' : 'Verify my identity'}</button>
        )}
        {state.status === 'pending' && (
          <>
            {state.available && <button onClick={start} disabled={busy} className="btn-primary"><ExternalLink className="h-4 w-4" /> Continue verification</button>}
            <button onClick={load} disabled={busy} className="btn-outline"><RefreshCw className="h-4 w-4" /> Check status</button>
            <button onClick={cancel} disabled={busy} className="btn-ghost">Cancel</button>
          </>
        )}
      </div>
      <p className="mt-3 text-xs text-ink-500">This is separate from confirming your email and from the "Verified" badge our team gives listings after an inspection.</p>
    </div>
  );
}
