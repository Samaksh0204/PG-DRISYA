import { useEffect, useRef, useState } from 'react';
import { Save, Camera, KeyRound, Download, Trash2, MailCheck, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { updateProfile, changePassword, resendVerification, exportMyData, deleteAccount, uploadImages, setToken } from '../lib/api';
import { Avatar, ErrorText, SuccessText, SignInRequired, PageLoader, Modal } from '../components/ui';
import { passwordProblem } from '../lib/format';

export function EditProfilePage() {
  const { auth, authLoading } = useApp();
  if (authLoading) return <PageLoader />;
  if (!auth) return <SignInRequired message="Log in to manage your account." />;
  return (
    <div className="container-page py-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white">Account settings</h1>
          <p className="mt-1 text-sm text-ink-500">Your profile, login and privacy.</p>
        </div>
        <ProfileSection />
        <EmailSection />
        <PasswordSection />
        <PrivacySection />
      </div>
    </div>
  );
}

function Card({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <section className="card p-6">
      <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-ink-900 dark:text-ink-100"><Icon className="h-4 w-4 text-brand-500" /> {title}</h2>
      {children}
    </section>
  );
}

function ProfileSection() {
  const { auth, setAuthUser, toast } = useApp();
  // Start from the saved profile so saving never blanks fields you didn't touch.
  const [form, setForm] = useState({
    fullName: auth!.fullName, phone: auth!.phone, city: auth!.city, gender: auth!.gender, college: auth!.college,
    bio: auth!.bio, preferredLocality: auth!.preferredLocality, budgetMax: auth!.budgetMax ? String(auth!.budgetMax) : '',
  });
  const [avatar, setAvatar] = useState(auth!.avatar);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const uploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const [url] = await uploadImages([file]);
      const { user } = await updateProfile({ avatar: url });
      setAvatar(user.avatar);
      setAuthUser(user);
      toast('Photo updated');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!form.fullName.trim()) return setError('Name cannot be empty');
    setSaving(true);
    setError('');
    try {
      const { user } = await updateProfile({
        fullName: form.fullName.trim(), phone: form.phone.trim(), city: form.city.trim(), gender: form.gender,
        college: form.college.trim(), bio: form.bio.trim(), preferredLocality: form.preferredLocality.trim(),
        budgetMax: Number(form.budgetMax) || 0,
      });
      setAuthUser(user);
      toast('Profile saved');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="Profile" icon={Camera}>
      <div className="mb-5 flex items-center gap-4">
        <Avatar src={avatar} name={auth!.fullName} className="h-16 w-16 rounded-full object-cover" />
        <div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={uploadAvatar} />
          <button onClick={() => fileRef.current?.click()} disabled={uploading} className="btn-outline text-xs">{uploading ? 'Uploading…' : 'Change photo'}</button>
          {auth!.verified && <p className="mt-1 flex items-center gap-1 text-xs text-teal-600"><ShieldCheck className="h-3.5 w-3.5" /> Identity verified by Drisya</p>}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Full name" value={form.fullName} onChange={(v) => set('fullName', v)} />
        <Input label="Mobile number" value={form.phone} onChange={(v) => set('phone', v)} placeholder="+91 98765 43210" />
        <Input label="City" value={form.city} onChange={(v) => set('city', v)} />
        <label className="block text-xs font-medium text-ink-600 dark:text-ink-300">Gender
          <select className="input mt-1 w-full" value={form.gender} onChange={(e) => set('gender', e.target.value)}>
            <option value="">Prefer not to say</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option>
          </select>
        </label>
        {auth!.role === 'tenant' && <>
          <Input label="College / workplace" value={form.college} onChange={(v) => set('college', v)} />
          <Input label="Preferred locality" value={form.preferredLocality} onChange={(v) => set('preferredLocality', v)} />
          <Input label="Max budget (₹/month)" type="number" value={form.budgetMax} onChange={(v) => set('budgetMax', v)} />
        </>}
        <label className="block text-xs font-medium text-ink-600 dark:text-ink-300 sm:col-span-2">About you (shown on your public profile)
          <textarea className="input mt-1 min-h-[80px] w-full resize-none" maxLength={1000} value={form.bio} onChange={(e) => set('bio', e.target.value)} />
        </label>
      </div>
      <p className="mt-2 text-xs text-ink-500">Your phone number is only shared with an owner/tenant after a visit or booking is confirmed.</p>
      <div className="mt-4"><ErrorText>{error}</ErrorText></div>
      <button onClick={save} disabled={saving} className="btn-primary mt-4"><Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save profile'}</button>
    </Card>
  );
}

function EmailSection() {
  const { auth, toast } = useApp();
  const [busy, setBusy] = useState(false);
  return (
    <Card title="Email" icon={MailCheck}>
      <p className="text-sm text-ink-700 dark:text-ink-200">{auth!.email}</p>
      {auth!.emailVerified ? (
        <p className="mt-1 text-xs text-teal-600">Confirmed</p>
      ) : (
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <span className="text-xs text-amber-700">Not confirmed yet — needed to request bookings.</span>
          <button disabled={busy} onClick={async () => { setBusy(true); try { toast((await resendVerification()).message); } catch (e) { toast((e as Error).message, 'error'); } finally { setBusy(false); } }} className="btn-outline text-xs">Resend confirmation email</button>
        </div>
      )}
      <p className="mt-2 text-xs text-ink-500">To change your email address, contact support.</p>
    </Card>
  );
}

function PasswordSection() {
  const { toast } = useApp();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setError(''); setDone('');
    const p = passwordProblem(next);
    if (p) return setError(p);
    setBusy(true);
    try {
      const res = await changePassword(current, next);
      setToken(res.token); // stay logged in here; other devices are logged out
      setCurrent(''); setNext('');
      setDone('Password changed. Other devices have been logged out.');
      toast('Password changed');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card title="Password" icon={KeyRound}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Current password" type="password" value={current} onChange={setCurrent} autoComplete="current-password" />
        <Input label="New password" type="password" value={next} onChange={setNext} autoComplete="new-password" />
      </div>
      <div className="mt-3 space-y-2"><ErrorText>{error}</ErrorText><SuccessText>{done}</SuccessText></div>
      <button onClick={submit} disabled={busy || !current || !next} className="btn-outline mt-4">{busy ? 'Saving…' : 'Change password'}</button>
    </Card>
  );
}

function PrivacySection() {
  const { logout, toast } = useApp();
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (!confirming) { setPassword(''); setError(''); } }, [confirming]);

  const download = async () => {
    try {
      const blob = await exportMyData();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'pgdrisya-my-data.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  };

  const remove = async () => {
    setBusy(true);
    setError('');
    try {
      await deleteAccount(password);
      toast('Your account has been deleted');
      logout();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <Card title="Privacy & data" icon={Download}>
      <div className="flex flex-wrap gap-3">
        <button onClick={download} className="btn-outline text-sm"><Download className="h-4 w-4" /> Download my data</button>
        <button onClick={() => setConfirming(true)} className="btn-outline text-sm !border-danger/20 !text-danger hover:!bg-danger/5"><Trash2 className="h-4 w-4" /> Delete my account</button>
      </div>
      <p className="mt-3 text-xs text-ink-500">Deleting removes your profile, wishlist and notifications, takes down your listings and cancels open visits and bookings. Reviews you wrote stay visible as "Former member".</p>
      {confirming && (
        <Modal title="Delete your account?" onClose={() => setConfirming(false)}>
          <p className="text-sm text-ink-600 dark:text-ink-300">This is permanent and can't be undone. Enter your password to confirm.</p>
          <input type="password" className="input mt-4 w-full" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" aria-label="Password" autoComplete="current-password" />
          <div className="mt-3"><ErrorText>{error}</ErrorText></div>
          <div className="mt-4 flex gap-3">
            <button onClick={() => setConfirming(false)} className="btn-outline flex-1">Keep account</button>
            <button onClick={remove} disabled={!password || busy} className="btn-primary flex-1 !bg-danger hover:!bg-danger/90">{busy ? 'Deleting…' : 'Delete forever'}</button>
          </div>
        </Modal>
      )}
    </Card>
  );
}

function Input({ label, value, onChange, type = 'text', placeholder, autoComplete }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; autoComplete?: string }) {
  return (
    <label className="block text-xs font-medium text-ink-600 dark:text-ink-300">
      {label}
      <input className="input mt-1 w-full" type={type} value={value} placeholder={placeholder} autoComplete={autoComplete} onChange={(e) => onChange(e.target.value)} min={type === 'number' ? 0 : undefined} />
    </label>
  );
}
