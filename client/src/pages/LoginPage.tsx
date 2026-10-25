import { useEffect, useState } from 'react';
import { ArrowRight, User, Building2, Eye, EyeOff, MailCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { register, login as apiLogin, updateProfile } from '../lib/api';
import { ErrorText } from '../components/ui';
import { isEmail, passwordProblem, routeParams } from '../lib/format';

type Mode = 'login' | 'signup' | 'welcome';

export function LoginPage() {
  const { route, navigate, loginWithToken, auth, refreshAuth } = useApp();
  const params = routeParams(route);
  const [role, setRole] = useState<'tenant' | 'owner'>(params.get('role') === 'owner' ? 'owner' : 'tenant');
  const [mode, setMode] = useState<Mode>(params.get('mode') === 'signup' ? 'signup' : 'login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const next = params.get('next');

  // Already logged in? Go where you were heading.
  useEffect(() => {
    if (auth && mode === 'login') navigate(next || (auth.role === 'tenant' ? '/dashboard' : auth.role === 'admin' ? '/admin' : '/owner'));
  }, [auth, mode, navigate, next]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    if (!isEmail(email)) return setError('Please enter a valid email address');
    if (mode === 'signup') {
      if (!fullName.trim()) return setError('Please enter your full name');
      const pw = passwordProblem(password);
      if (pw) return setError(pw);
      if (!acceptTerms) return setError('Please accept the Terms of Service and Privacy Policy');
    } else if (!password) {
      return setError('Please enter your password');
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const res = await apiLogin(email.trim(), password);
        await loginWithToken(res.token);
      } else {
        const res = await register({ fullName: fullName.trim(), email: email.trim(), password, role, acceptTerms, phone: phone.trim() || undefined });
        await loginWithToken(res.token);
        setMode('welcome');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'welcome') return <Welcome role={role} onDone={(updates) => {
    const go = () => navigate(role === 'owner' ? '/owner' : next || '/search');
    if (!updates) return go();
    updateProfile(updates).then(refreshAuth).catch(() => {}).finally(go);
  }} email={email} />;

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-page px-4 py-12">
      <div className="w-full max-w-md">
        <form onSubmit={submit} className="card p-8" noValidate>
          <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white">{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
          <p className="mt-1.5 text-sm text-ink-500 dark:text-ink-400">{mode === 'login' ? 'Log in to manage visits, bookings and messages.' : 'It takes less than a minute.'}</p>

          {mode === 'signup' && (
            <div className="mt-6 grid grid-cols-2 gap-2" role="radiogroup" aria-label="I want to">
              {([['tenant', 'Find a PG', User], ['owner', 'List my PG', Building2]] as const).map(([value, label, Icon]) => (
                <button key={value} type="button" role="radio" aria-checked={role === value} onClick={() => setRole(value)}
                  className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-medium transition ${role === value ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300' : 'border-ink-200 text-ink-600 dark:border-ink-700 dark:text-ink-300'}`}>
                  <Icon className="h-4 w-4" /> {label}
                </button>
              ))}
            </div>
          )}

          <div className="mt-5 space-y-3">
            {mode === 'signup' && (
              <input className="input w-full" placeholder="Full name" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} aria-label="Full name" />
            )}
            <input className="input w-full" placeholder="Email address" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email address" />
            {mode === 'signup' && (
              <input className="input w-full" placeholder="Mobile number (optional)" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} aria-label="Mobile number" />
            )}
            <div className="relative">
              <input className="input w-full pr-10" type={showPw ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                placeholder={mode === 'login' ? 'Password' : 'Password (8+ characters, letters and numbers)'} value={password} onChange={(e) => setPassword(e.target.value)} aria-label="Password" />
              <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400" aria-label={showPw ? 'Hide password' : 'Show password'}>
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {mode === 'login' && (
            <div className="mt-2 text-right">
              <button type="button" onClick={() => navigate('/forgot-password')} className="text-xs font-medium text-brand-600 hover:underline">Forgot password?</button>
            </div>
          )}

          {mode === 'signup' && (
            <label className="mt-4 flex items-start gap-2 text-xs text-ink-600 dark:text-ink-300">
              <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} className="mt-0.5 h-4 w-4 accent-brand-500" />
              <span>I agree to the <a href="#/terms" target="_blank" className="font-medium text-brand-600 underline">Terms of Service</a> and <a href="#/privacy" target="_blank" className="font-medium text-brand-600 underline">Privacy Policy</a>, and I'm at least 18 years old.</span>
            </label>
          )}

          <div className="mt-4"><ErrorText>{error}</ErrorText></div>

          <button type="submit" disabled={loading} className="btn-primary mt-5 w-full">
            {loading ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'} {!loading && <ArrowRight className="h-4 w-4" />}
          </button>

          <p className="mt-5 text-center text-sm text-ink-500 dark:text-ink-400">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button type="button" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }} className="font-semibold text-brand-600 hover:underline">
              {mode === 'login' ? 'Sign up' : 'Log in'}
            </button>
          </p>
          {mode === 'login' && <button type="button" onClick={() => navigate('/search')} className="mt-3 w-full text-center text-xs text-ink-500 hover:text-brand-500">or keep browsing without an account →</button>}
        </form>
      </div>
    </div>
  );
}

// Short, optional onboarding. Everything entered here is actually saved to the profile.
function Welcome({ role, email, onDone }: { role: 'tenant' | 'owner'; email: string; onDone: (updates?: Record<string, any>) => void }) {
  const [city, setCity] = useState('');
  const [gender, setGender] = useState('');
  const [college, setCollege] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const save = () => {
    const u: Record<string, any> = {};
    if (city.trim()) u.city = city.trim();
    if (gender) u.gender = gender;
    if (college.trim()) u.college = college.trim();
    if (Number(budgetMax) > 0) u.budgetMax = Number(budgetMax);
    onDone(Object.keys(u).length ? u : undefined);
  };
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="card w-full max-w-lg p-8">
        <div className="flex items-start gap-3 rounded-xl bg-teal-50 p-4 text-sm text-teal-800 dark:bg-teal-900/20 dark:text-teal-300">
          <MailCheck className="h-5 w-5 shrink-0" />
          <span>We sent a confirmation link to <strong>{email}</strong>. Please confirm your email — it's needed before you can request a booking.</span>
        </div>
        <h2 className="mt-6 font-display text-xl font-bold text-ink-900 dark:text-white">{role === 'owner' ? 'A little about you' : 'Help us find the right PG'}</h2>
        <p className="mt-1 text-sm text-ink-500">Optional — you can change this any time in Account settings.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <input className="input" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} aria-label="City" />
          <select className="input" value={gender} onChange={(e) => setGender(e.target.value)} aria-label="Gender">
            <option value="">Gender (optional)</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option>
          </select>
          {role === 'tenant' && (
            <>
              <input className="input" placeholder="College or workplace" value={college} onChange={(e) => setCollege(e.target.value)} aria-label="College or workplace" />
              <input className="input" type="number" min={0} placeholder="Max budget ₹/month" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} aria-label="Maximum budget" />
            </>
          )}
        </div>
        <div className="mt-6 flex gap-3">
          <button onClick={() => onDone()} className="btn-outline flex-1">Skip</button>
          <button onClick={save} className="btn-primary flex-1">{role === 'owner' ? 'Continue to list my PG' : 'Start searching'}</button>
        </div>
      </div>
    </div>
  );
}
