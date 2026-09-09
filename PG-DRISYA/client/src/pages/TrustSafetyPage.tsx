import { ShieldCheck, CreditCard, Building2, AlertTriangle, Phone, MessageCircle, Lock, Eye, FileCheck, Users, ArrowRight, Clock, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

export function TrustSafetyPage() {
  const { navigate } = useApp();

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-teal-50/60 to-white dark:from-teal-950/10 dark:to-ink-950">
        <div className="container-page py-16 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-500 text-white shadow-lg">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="mx-auto mt-5 max-w-2xl font-display text-4xl font-extrabold text-ink-900 text-balance dark:text-white sm:text-5xl">
            Trust & Safety Center
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-ink-600 dark:text-ink-300">
            Safety isn't a feature — it's our foundation. Here's how we verify every listing, protect every user, and handle issues when they arise.
          </p>
        </div>
      </section>

      {/* Verification process */}
      <section className="container-page py-12">
        <h2 className="mb-8 text-center font-display text-2xl font-bold text-ink-900 dark:text-white">Our verification process</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Step icon={CreditCard} num="1" title="Government ID" desc="Owners submit Aadhaar, PAN, or Voter ID. Tenants optionally verify for a Verified badge." />
          <Step icon={Building2} num="2" title="Property documents" desc="Owners upload registry, sale deed, or rental agreement proving they're authorized to list." />
          <Step icon={FileCheck} num="3" title="Manual review" desc="Our team reviews every submission within 24-72 hours using documented SOPs." />
          <Step icon={CheckCircle2} num="4" title="Verified badge" desc="Approved listings show the verified shield. Rejected submissions get a reason and can resubmit." />
        </div>
      </section>

      {/* Safety features */}
      <section className="bg-ink-50/50 py-12 dark:bg-ink-900/30">
        <div className="container-page">
          <h2 className="mb-8 text-center font-display text-2xl font-bold text-ink-900 dark:text-white">Built-in safety features</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <SafetyCard icon={Lock} title="Secure messaging" desc="All communication happens on-platform. We never share your phone or email until you choose to." />
            <SafetyCard icon={Eye} title="Photo verification" desc="Listing photos are watermarked and platform-hosted to prevent stock-photo fraud." />
            <SafetyCard icon={Users} title="Two-way reviews" desc="Tenants and owners rate each other after verified stays. Bad actors get flagged automatically." />
            <SafetyCard icon={AlertTriangle} title="Report & block" desc="Report fake listings, harassment, or payment issues. Our moderation team responds within SLA." />
            <SafetyCard icon={ShieldCheck} title="No off-platform payments" desc="We warn you whenever someone tries to move payment off Drisya. Never pay outside the platform." />
            <SafetyCard icon={Clock} title="Visit scheduling" desc="Book visits through the app with reminders. Your safety contact knows where you are." />
          </div>
        </div>
      </section>

      {/* Report flow */}
      <section className="container-page py-12">
        <div className="mx-auto max-w-3xl rounded-3xl border border-ink-100 p-8 dark:border-ink-800">
          <h2 className="font-display text-2xl font-bold text-ink-900 dark:text-white">Report a problem</h2>
          <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">See a fake listing, suspicious behavior, or payment issue? Report it — we investigate every report.</p>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              { type: 'Fake listing', desc: 'Property doesn\'t exist or photos are stolen' },
              { type: 'Harassment', desc: 'Inappropriate messages or behavior' },
              { type: 'Payment issue', desc: 'Off-platform payment requests or fraud' },
              { type: 'Verification fraud', desc: 'Suspected fake documents or identity' },
            ].map((r) => (
              <button key={r.type} className="flex items-center gap-3 rounded-xl border border-ink-100 p-4 text-left transition hover:border-coral-400 hover:bg-coral-50/50 dark:border-ink-800 dark:hover:bg-coral-900/10">
                <AlertTriangle className="h-5 w-5 text-coral-500" />
                <div>
                  <p className="text-sm font-semibold text-ink-900 dark:text-ink-100">{r.type}</p>
                  <p className="text-xs text-ink-400">{r.desc}</p>
                </div>
              </button>
            ))}
          </div>
          <button className="btn-primary mt-6">File a report <ArrowRight className="h-4 w-4" /></button>
        </div>
      </section>

      {/* Emergency contacts */}
      <section className="container-page pb-16">
        <div className="rounded-3xl bg-coral-500 p-8 text-white">
          <h2 className="font-display text-xl font-bold">Emergency contacts</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Contact icon={Phone} label="Drisya Helpline" value="1800-DRISYA (24x7)" />
            <Contact icon={MessageCircle} label="WhatsApp Support" value="+91 98xxx xxx00" />
            <Contact icon={ShieldCheck} label="Women's Helpline" value="1091 (Govt. of India)" />
          </div>
        </div>
      </section>
    </div>
  );
}

function Step({ icon: Icon, num, title, desc }: { icon: React.ComponentType<{ className?: string }>; num: string; title: string; desc: string }) {
  return (
    <div className="card p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-300">
          <Icon className="h-5 w-5" />
        </div>
        <span className="font-display text-2xl font-bold text-ink-200 dark:text-ink-700">{num}</span>
      </div>
      <h3 className="mt-3 text-sm font-semibold text-ink-900 dark:text-ink-100">{title}</h3>
      <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">{desc}</p>
    </div>
  );
}

function SafetyCard({ icon: Icon, title, desc }: { icon: React.ComponentType<{ className?: string }>; title: string; desc: string }) {
  return (
    <div className="card p-6">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-coral-50 text-coral-600 dark:bg-coral-900/30 dark:text-coral-300">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-3 text-sm font-semibold text-ink-900 dark:text-ink-100">{title}</h3>
      <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">{desc}</p>
    </div>
  );
}

function Contact({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/10 p-4">
      <Icon className="h-5 w-5 text-coral-100" />
      <p className="mt-2 text-xs text-coral-100">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}
