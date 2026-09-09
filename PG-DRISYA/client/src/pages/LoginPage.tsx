import { useState } from 'react';
import { Mail, Phone, ShieldCheck, ArrowRight, User, Building2, CheckCircle2, ChevronLeft, GraduationCap, Briefcase, CreditCard, Upload, MapPin, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { register, login as apiLogin } from '../lib/api';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export function LoginPage() {
  useDocumentTitle('Sign In');
  const { route, navigate, loginFromToken } = useApp();
  const params = new URLSearchParams(route.split('?')[1] || '');
  const initialRole = params.get('role') === 'owner' ? 'owner' : 'tenant';

  const [role, setRole] = useState<'tenant' | 'owner'>(initialRole);
  const [mode, setMode] = useState<'login' | 'signup' | 'onboarding'>('login');
  const [method, setMethod] = useState<'email' | 'phone'>('email');
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [onboardingData, setOnboardingData] = useState<Record<string, string>>({});

  const handleAuth = async () => {
    setError(null);
    setLoading(true);
    try {
      if (mode === 'login') {
        const { token } = await apiLogin(email, password);
        await loginFromToken(token);
        navigate(role === 'owner' ? '/owner' : '/dashboard');
      } else if (mode === 'signup') {
        if (!fullName.trim()) { setError('Please enter your full name'); setLoading(false); return; }
        if (password.length < 6) { setError('Password must be at least 6 characters'); setLoading(false); return; }
        const { token } = await register({ fullName, email, password, role });
        await loginFromToken(token);
        setMode('onboarding');
        setStep(0);
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const completeOnboarding = async () => {
    navigate(role === 'owner' ? '/owner' : '/dashboard');
  };

  if (mode === 'onboarding') {
    return (
      <OnboardingWizard
        role={role}
        step={step}
        setStep={setStep}
        onComplete={completeOnboarding}
        onBack={() => setMode('signup')}
        data={onboardingData}
        setData={setOnboardingData}
        loading={loading}
        error={error}
      />
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gradient-to-b from-coral-50/40 to-white px-4 py-12 dark:from-coral-950/10 dark:to-ink-950">
      <div className="w-full max-w-md">
        <div className="card p-8">
          <div className="mb-6 flex rounded-full bg-ink-100 p-1 dark:bg-ink-800">
            <button
              onClick={() => setRole('tenant')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 text-sm font-medium transition ${
                role === 'tenant' ? 'bg-white text-coral-600 shadow-sm dark:bg-ink-900 dark:text-coral-400' : 'text-ink-500'
              }`}
            >
              <User className="h-4 w-4" /> Tenant
            </button>
            <button
              onClick={() => setRole('owner')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 text-sm font-medium transition ${
                role === 'owner' ? 'bg-white text-coral-600 shadow-sm dark:bg-ink-900 dark:text-coral-400' : 'text-ink-500'
              }`}
            >
              <Building2 className="h-4 w-4" /> Owner
            </button>
          </div>

          <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white">
            {mode === 'login' ? `Welcome back, ${role === 'owner' ? 'Owner' : 'Tenant'}` : `Join Drisya as a${role === 'owner' ? 'n Owner' : ' Tenant'}`}
          </h1>
          <p className="mt-1.5 text-sm text-ink-500 dark:text-ink-400">
            {mode === 'login' ? 'Log in to access your dashboard' : role === 'owner' ? 'List your verified property and connect with quality tenants' : 'Find your verified, safe space to call home'}
          </p>

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          <div className="mt-6 flex gap-2">
            <button onClick={() => setMethod('email')} className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${method === 'email' ? 'border-coral-500 bg-coral-50 text-coral-700 dark:bg-coral-900/30 dark:text-coral-300' : 'border-ink-200 text-ink-500 dark:border-ink-700'}`}>
              <Mail className="mr-1.5 inline h-4 w-4" /> Email
            </button>
            <button onClick={() => setMethod('phone')} className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${method === 'phone' ? 'border-coral-500 bg-coral-50 text-coral-700 dark:bg-coral-900/30 dark:text-coral-300' : 'border-ink-200 text-ink-500 dark:border-ink-700'}`}>
              <Phone className="mr-1.5 inline h-4 w-4" /> Phone OTP
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {method === 'email' ? (
              <>
                {mode === 'signup' && (
                  <input className="input" placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                )}
                <input className="input" placeholder="Email address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                <input className="input" type="password" placeholder={mode === 'login' ? 'Password' : 'Create a password (min 6 chars)'} value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAuth()} />
              </>
            ) : (
              <>
                <input className="input" placeholder="+91 98xxx xxxxx" />
                <div className="flex gap-2">
                  <input className="input" placeholder="Enter OTP" maxLength={6} />
                  <button className="btn-outline whitespace-nowrap text-xs">Send OTP</button>
                </div>
                <p className="text-xs text-ink-400">Phone OTP is a demo — use email sign-up for a working account.</p>
              </>
            )}
          </div>

          <button onClick={handleAuth} disabled={loading} className="btn-primary mt-5 w-full">
            {loading ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Create account'} {!loading && <ArrowRight className="h-4 w-4" />}
          </button>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-ink-100 dark:bg-ink-800" />
            <span className="text-xs text-ink-400">or continue with</span>
            <div className="h-px flex-1 bg-ink-100 dark:bg-ink-800" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button className="btn-outline text-sm">
              <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Google
            </button>
            <button className="btn-outline text-sm">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
              Apple
            </button>
          </div>

          {mode === 'login' && role === 'tenant' && (
            <button onClick={() => navigate('/search')} className="mt-5 w-full text-center text-sm text-ink-500 hover:text-coral-500 dark:text-ink-400">
              or continue browsing as guest →
            </button>
          )}

          <p className="mt-5 text-center text-sm text-ink-500 dark:text-ink-400">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); }} className="font-semibold text-coral-500 hover:underline">
              {mode === 'login' ? 'Sign up' : 'Log in'}
            </button>
          </p>
        </div>

        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-ink-400">
          <ShieldCheck className="h-4 w-4 text-teal-600" />
          Protected by 2FA & rate-limited login. Your data is encrypted.
        </div>
      </div>
    </div>
  );
}

function OnboardingWizard({ role, step, setStep, onComplete, onBack, data, setData, loading, error }: {
  role: 'tenant' | 'owner';
  step: number;
  setStep: (s: number) => void;
  onComplete: () => void;
  onBack: () => void;
  data: Record<string, string>;
  setData: (d: Record<string, string>) => void;
  loading: boolean;
  error: string | null;
}) {
  const tenantSteps = ['Profile', 'Preferences', 'Verification'];
  const ownerSteps = ['Property Details', 'Business Info', 'Verification'];
  const steps = role === 'owner' ? ownerSteps : tenantSteps;
  const isLast = step === steps.length - 1;

  const set = (key: string, value: string) => setData({ ...data, [key]: value });

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gradient-to-b from-coral-50/40 to-white px-4 py-12 dark:from-coral-950/10 dark:to-ink-950">
      <div className="w-full max-w-lg">
        <div className="card p-8">
          <div className="mb-6">
            <div className="mb-2 flex items-center justify-between">
              <button onClick={() => (step === 0 ? onBack() : setStep(step - 1))} className="flex items-center gap-1 text-sm text-ink-500 hover:text-coral-500">
                <ChevronLeft className="h-4 w-4" /> Back
              </button>
              <span className="text-xs text-ink-400">Step {step + 1} of {steps.length}</span>
            </div>
            <div className="flex gap-2">
              {steps.map((s, i) => (
                <div key={s} className="flex-1">
                  <div className={`h-1.5 rounded-full transition-all ${i <= step ? 'bg-coral-500' : 'bg-ink-100 dark:bg-ink-800'}`} />
                  <p className={`mt-1.5 text-xs font-medium ${i <= step ? 'text-coral-600 dark:text-coral-400' : 'text-ink-400'}`}>{s}</p>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          {role === 'tenant' && step === 0 && (
            <div className="space-y-4">
              <h2 className="font-display text-xl font-bold text-ink-900 dark:text-white">Tell us about yourself</h2>
              <div className="grid grid-cols-2 gap-3">
                <input className="input" placeholder="Full name" onChange={(e) => set('full_name', e.target.value)} />
                <select className="input" onChange={(e) => set('gender', e.target.value)}><option value="">Gender</option><option>Female</option><option>Male</option><option>Other</option></select>
              </div>
              <select className="input" onChange={(e) => set('occupation', e.target.value)}><option value="">I am a...</option><option>Student</option><option>Working professional</option></select>
              <input className="input" placeholder="College / Employer name" onChange={(e) => set('college_or_employer', e.target.value)} />
            </div>
          )}

          {role === 'tenant' && step === 1 && (
            <div className="space-y-4">
              <h2 className="font-display text-xl font-bold text-ink-900 dark:text-white">Your preferences</h2>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-200">Budget range</label>
                <div className="flex items-center gap-3">
                  <input className="input" placeholder="₹ Min" type="number" onChange={(e) => set('budget_min', e.target.value)} />
                  <span className="text-ink-400">—</span>
                  <input className="input" placeholder="₹ Max" type="number" onChange={(e) => set('budget_max', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-200">Preferred locality</label>
                <input className="input" placeholder="e.g. Shivaji Nagar, Pune" onChange={(e) => set('preferred_locality', e.target.value)} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-200">Move-in date</label>
                <input className="input" type="date" onChange={(e) => set('move_in_date', e.target.value)} />
              </div>
            </div>
          )}

          {role === 'tenant' && step === 2 && (
            <div className="space-y-4">
              <h2 className="font-display text-xl font-bold text-ink-900 dark:text-white">Get your Verified Tenant badge</h2>
              <p className="text-sm text-ink-500 dark:text-ink-400">Verify your identity to unlock instant booking and faster owner responses. Optional but recommended.</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon: CreditCard, label: 'Aadhaar' },
                  { icon: CreditCard, label: 'PAN Card' },
                  { icon: GraduationCap, label: 'College ID' },
                ].map((d) => (
                  <button key={d.label} className="flex flex-col items-center gap-2 rounded-xl border border-ink-200 p-4 text-center hover:border-coral-400 dark:border-ink-700">
                    <d.icon className="h-6 w-6 text-coral-500" />
                    <span className="text-xs font-medium text-ink-700 dark:text-ink-200">{d.label}</span>
                    <Upload className="h-3.5 w-3.5 text-ink-400" />
                  </button>
                ))}
              </div>
              <div className="rounded-xl bg-teal-50 p-3 text-xs text-teal-700 dark:bg-teal-900/20 dark:text-teal-300">
                <CheckCircle2 className="mb-1 inline h-4 w-4" /> Verification takes 24-48 hours. You can browse and message owners while we review.
              </div>
            </div>
          )}

          {role === 'owner' && step === 0 && (
            <div className="space-y-4">
              <h2 className="font-display text-xl font-bold text-ink-900 dark:text-white">Property details</h2>
              <input className="input" placeholder="Property title" onChange={(e) => set('title', e.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <select className="input" onChange={(e) => set('property_type', e.target.value)}><option>Property type</option><option>PG</option><option>Hostel</option><option>Shared Flat</option></select>
                <select className="input" onChange={(e) => set('occupancy', e.target.value)}><option>Occupancy</option><option>Single</option><option>Double</option><option>Triple</option><option>Dorm</option></select>
              </div>
              <input className="input" placeholder="Full address" onChange={(e) => set('address', e.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <input className="input" placeholder="Monthly rent ₹" type="number" onChange={(e) => set('price', e.target.value)} />
                <input className="input" placeholder="Deposit ₹" type="number" onChange={(e) => set('deposit', e.target.value)} />
              </div>
            </div>
          )}

          {role === 'owner' && step === 1 && (
            <div className="space-y-4">
              <h2 className="font-display text-xl font-bold text-ink-900 dark:text-white">Business information</h2>
              <select className="input" onChange={(e) => set('business_type', e.target.value)}><option>Business type</option><option>Individual</option><option>Partnership</option><option>Pvt Ltd</option></select>
              <input className="input" placeholder="GST number (optional)" onChange={(e) => set('gst', e.target.value)} />
              <input className="input" placeholder="Bank account for payouts" onChange={(e) => set('bank_account', e.target.value)} />
              <input className="input" placeholder="IFSC code" onChange={(e) => set('ifsc', e.target.value)} />
            </div>
          )}

          {role === 'owner' && step === 2 && (
            <div className="space-y-4">
              <h2 className="font-display text-xl font-bold text-ink-900 dark:text-white">Mandatory verification</h2>
              <p className="text-sm text-ink-500 dark:text-ink-400">Your listing goes live only after we verify your identity and property ownership. This protects tenants and builds trust.</p>
              <div className="space-y-3">
                <UploadCard icon={CreditCard} title="Government ID" desc="Aadhaar / PAN / Voter ID" />
                <UploadCard icon={Briefcase} title="Property ownership document" desc="Registry / Sale deed / Rental agreement" />
                <UploadCard icon={MapPin} title="Property photos" desc="Minimum 5 photos, watermarked by Drisya" />
              </div>
              <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                <ShieldCheck className="mb-1 inline h-4 w-4" /> Review takes 24-72 hours. Track status in your dashboard. Your listing goes live once approved.
              </div>
            </div>
          )}

          <div className="mt-6 flex gap-3">
            {!isLast ? (
              <button onClick={() => setStep(step + 1)} className="btn-primary w-full">
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button onClick={onComplete} disabled={loading} className="btn-primary w-full">
                {loading ? 'Saving...' : role === 'owner' ? 'Submit for verification' : 'Complete setup'} {!loading && <CheckCircle2 className="h-4 w-4" />}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function UploadCard({ icon: Icon, title, desc }: { icon: React.ComponentType<{ className?: string }>; title: string; desc: string }) {
  return (
    <button className="flex w-full items-center gap-3 rounded-xl border border-dashed border-ink-200 p-4 text-left transition hover:border-coral-400 hover:bg-coral-50/50 dark:border-ink-700 dark:hover:bg-coral-900/10">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-coral-50 text-coral-500 dark:bg-coral-900/30">
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-ink-900 dark:text-ink-100">{title}</p>
        <p className="text-xs text-ink-400">{desc}</p>
      </div>
      <Upload className="h-4 w-4 text-ink-400" />
    </button>
  );
}
