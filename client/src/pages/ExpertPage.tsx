import { useState } from 'react';
import { Headphones, ListChecks, CalendarCheck, Send, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { submitInquiry } from '../lib/api';
import { ErrorText } from '../components/ui';
import { isEmail } from '../lib/format';

export function ExpertPage() {
  const { auth, navigate } = useApp();
  const [form, setForm] = useState({ name: auth?.fullName || '', email: auth?.email || '', phone: auth?.phone || '', city: auth?.city || '', locality: '', budget: '', moveInDate: '', message: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState('');
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return setError('Please enter your name');
    if (!form.email.trim() && form.phone.replace(/\D/g, '').length < 10) return setError('Please give an email or a 10-digit phone number');
    if (form.email.trim() && !isEmail(form.email)) return setError('Please enter a valid email');
    setBusy(true);
    setError('');
    try {
      setDone((await submitInquiry({ ...form, budget: form.budget ? Number(form.budget) : undefined })).message);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen">
      <section className="bg-ink-900 py-16 text-white">
        <div className="container-page max-w-4xl">
          <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">Drisya Expert</h1>
          <p className="mt-3 max-w-2xl text-ink-200">Moving to a new city and short on time? Tell us what you need and a local Drisya team member will shortlist PGs and help you set up visits. Free while we're launching.</p>
        </div>
      </section>
      <div className="container-page grid max-w-5xl gap-10 py-12 lg:grid-cols-2">
        <div className="space-y-6">
          {[
            [Headphones, 'Tell us your needs', 'Budget, area, college or office, food and move-in date.'],
            [ListChecks, 'Get a shortlist', 'We send you suitable PGs from Drisya, usually within one working day.'],
            [CalendarCheck, 'Visit and decide', 'Book visits in the app and decide in your own time. No brokerage.'],
          ].map(([Icon, title, desc]) => {
            const I = Icon as React.ElementType;
            return (
              <div key={title as string} className="flex gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/30"><I className="h-5 w-5" /></div>
                <div><h3 className="font-semibold text-ink-900 dark:text-ink-100">{title as string}</h3><p className="text-sm text-ink-600 dark:text-ink-400">{desc as string}</p></div>
              </div>
            );
          })}
        </div>

        <div className="card p-6">
          {done ? (
            <div className="py-10 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-teal-500" />
              <h2 className="mt-3 text-lg font-semibold">Request received</h2>
              <p className="mt-1 text-sm text-ink-600 dark:text-ink-300">{done}</p>
              <button onClick={() => navigate('/search')} className="btn-primary mt-6">Browse PGs meanwhile</button>
            </div>
          ) : (
            <form onSubmit={submit} noValidate className="space-y-3">
              <h2 className="text-lg font-semibold">Request help</h2>
              <input className="input w-full" placeholder="Your name" value={form.name} onChange={(e) => set('name', e.target.value)} aria-label="Your name" />
              <div className="grid gap-3 sm:grid-cols-2">
                <input className="input" type="email" placeholder="Email" value={form.email} onChange={(e) => set('email', e.target.value)} aria-label="Email" />
                <input className="input" type="tel" placeholder="Phone" value={form.phone} onChange={(e) => set('phone', e.target.value)} aria-label="Phone" />
                <input className="input" placeholder="City" value={form.city} onChange={(e) => set('city', e.target.value)} aria-label="City" />
                <input className="input" placeholder="Preferred area / college" value={form.locality} onChange={(e) => set('locality', e.target.value)} aria-label="Preferred area" />
                <input className="input" type="number" min={0} placeholder="Budget ₹/month" value={form.budget} onChange={(e) => set('budget', e.target.value)} aria-label="Budget" />
                <input className="input" type="date" value={form.moveInDate} onChange={(e) => set('moveInDate', e.target.value)} aria-label="Move-in date" />
              </div>
              <textarea className="input min-h-[80px] w-full resize-none" maxLength={2000} placeholder="Anything else? (food, AC, gender, distance…)" value={form.message} onChange={(e) => set('message', e.target.value)} aria-label="Details" />
              <ErrorText>{error}</ErrorText>
              <button type="submit" disabled={busy} className="btn-primary w-full"><Send className="h-4 w-4" /> {busy ? 'Sending…' : 'Send request'}</button>
              <p className="text-xs text-ink-500">We'll only use these details to help with your search. See our <a href="#/privacy" className="underline">Privacy Policy</a>.</p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
