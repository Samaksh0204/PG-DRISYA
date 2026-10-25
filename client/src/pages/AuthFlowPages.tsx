import { useEffect, useRef, useState } from 'react';
import { KeyRound, MailCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { forgotPassword, resetPassword, verifyEmail } from '../lib/api';
import { ErrorText, SuccessText, Spinner } from '../components/ui';
import { isEmail, passwordProblem, routeParams } from '../lib/format';

function Shell({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="card w-full max-w-md p-8">
        <Icon className="h-10 w-10 text-brand-500" />
        <h1 className="mt-4 font-display text-2xl font-bold text-ink-900 dark:text-white">{title}</h1>
        {children}
      </div>
    </div>
  );
}

export function ForgotPasswordPage() {
  const { navigate } = useApp();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEmail(email)) return setError('Please enter a valid email address');
    setLoading(true);
    setError('');
    try {
      setDone((await forgotPassword(email.trim())).message);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <Shell icon={KeyRound} title="Reset your password">
      <p className="mt-1 text-sm text-ink-500">Enter your account email and we'll send you a link to choose a new password.</p>
      {done ? (
        <div className="mt-6 space-y-4"><SuccessText>{done} Check your spam folder too.</SuccessText><button onClick={() => navigate('/login')} className="btn-primary w-full">Back to log in</button></div>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-3" noValidate>
          <input className="input w-full" type="email" autoComplete="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email address" />
          <ErrorText>{error}</ErrorText>
          <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Sending…' : 'Send reset link'}</button>
          <button type="button" onClick={() => navigate('/login')} className="w-full text-center text-sm text-ink-500 hover:text-brand-500">Back to log in</button>
        </form>
      )}
    </Shell>
  );
}

export function ResetPasswordPage() {
  const { route, navigate } = useApp();
  const token = routeParams(route).get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = passwordProblem(password);
    if (problem) return setError(problem);
    if (password !== confirm) return setError('Passwords do not match');
    setLoading(true);
    setError('');
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };
  if (!token) {
    return <Shell icon={AlertCircle} title="Link not valid"><p className="mt-2 text-sm text-ink-500">This reset link is incomplete. Request a new one.</p><button onClick={() => navigate('/forgot-password')} className="btn-primary mt-6 w-full">Request new link</button></Shell>;
  }
  return (
    <Shell icon={KeyRound} title="Choose a new password">
      {done ? (
        <div className="mt-6 space-y-4"><SuccessText>Password updated. You've been logged out of other devices.</SuccessText><button onClick={() => navigate('/login')} className="btn-primary w-full">Log in</button></div>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-3" noValidate>
          <input className="input w-full" type="password" autoComplete="new-password" placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)} aria-label="New password" />
          <input className="input w-full" type="password" autoComplete="new-password" placeholder="Confirm new password" value={confirm} onChange={(e) => setConfirm(e.target.value)} aria-label="Confirm new password" />
          <p className="text-xs text-ink-500">At least 8 characters, with letters and numbers.</p>
          <ErrorText>{error}</ErrorText>
          <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Saving…' : 'Update password'}</button>
        </form>
      )}
    </Shell>
  );
}

export function VerifyEmailPage() {
  const { route, navigate, auth, refreshAuth } = useApp();
  const token = routeParams(route).get('token') || '';
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current) return; // StrictMode runs effects twice; the token is single-use
    ran.current = true;
    if (!token) { setState('error'); setMessage('This confirmation link is incomplete.'); return; }
    verifyEmail(token)
      .then(() => { setState('ok'); refreshAuth(); })
      .catch((err) => { setState('error'); setMessage(err.message); });
  }, [token, refreshAuth]);
  return (
    <Shell icon={state === 'ok' ? CheckCircle2 : state === 'error' ? AlertCircle : MailCheck} title={state === 'ok' ? 'Email confirmed' : state === 'error' ? "We couldn't confirm your email" : 'Confirming…'}>
      {state === 'loading' && <div className="mt-6 text-brand-500"><Spinner /></div>}
      {state === 'ok' && <><p className="mt-2 text-sm text-ink-500">Thanks! You can now request bookings.</p><button onClick={() => navigate(auth ? '/search' : '/login')} className="btn-primary mt-6 w-full">{auth ? 'Find a PG' : 'Log in'}</button></>}
      {state === 'error' && <><p className="mt-2 text-sm text-ink-500">{message} You can send a new link from Account settings.</p><button onClick={() => navigate(auth ? '/profile/edit' : '/login')} className="btn-primary mt-6 w-full">{auth ? 'Account settings' : 'Log in'}</button></>}
    </Shell>
  );
}
