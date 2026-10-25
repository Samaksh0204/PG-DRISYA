import { ShieldCheck, Search, Star, Lock, Flag, MessageCircle, Phone, Banknote, Eye, UserCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { siteConfig } from '../lib/config';

// Everything on this page describes features that actually exist in the product.
export function TrustSafetyPage() {
  const { navigate } = useApp();
  const items = [
    { icon: Search, title: 'Every new listing is reviewed', desc: 'Our team checks each listing before it goes live and rejects ones with missing or misleading information.' },
    { icon: ShieldCheck, title: 'Verified badge = inspected', desc: 'Only listings our team has inspected in person get the Verified badge. Hosts cannot add it themselves.' },
    { icon: Star, title: 'Reviews you can trust', desc: 'Only tenants with a completed visit or a stay can review, one review per person per PG. Hosts can reply publicly.' },
    { icon: Phone, title: 'Contact details stay private', desc: 'Host phone numbers and email addresses are never shown. Tenants and hosts talk through Drisya messages, so there is always a record.' },
    { icon: UserCheck, title: 'Confirmed emails', desc: 'Tenants must confirm their email before sending a booking request.' },
    { icon: Lock, title: 'Account security', desc: 'Passwords are hashed, logins are rate-limited, and changing your password signs you out everywhere else.' },
  ];
  return (
    <div className="container-page py-12">
      <div className="mx-auto max-w-4xl">
        <h1 className="font-display text-3xl font-bold text-ink-900 dark:text-white">Trust & Safety</h1>
        <p className="mt-2 max-w-2xl text-ink-600 dark:text-ink-300">How we keep Drisya safe, and how you can protect yourself.</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {items.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card p-5">
              <Icon className="h-6 w-6 text-brand-500" />
              <h2 className="mt-3 font-semibold text-ink-900 dark:text-ink-100">{title}</h2>
              <p className="mt-1 text-sm text-ink-600 dark:text-ink-400">{desc}</p>
            </div>
          ))}
        </div>

        <section className="mt-10 rounded-2xl bg-teal-50 p-6 dark:bg-teal-950/30">
          <h2 className="text-lg font-semibold text-ink-900 dark:text-ink-100">Protect yourself</h2>
          <ul className="mt-3 space-y-2 text-sm text-ink-700 dark:text-ink-300">
            {[
              [Eye, 'Always visit the PG in person before paying anything.'],
              [Banknote, 'Pay rent and deposit only against a written rent agreement, and get a receipt.'],
              [Flag, 'Never pay a "token" or advance to hold a room you haven\'t seen. Report anyone who asks.'],
              [Lock, 'Never share OTPs, bank passwords or card details. Drisya will never ask for them.'],
              [MessageCircle, 'Keep conversations on Drisya messages so there is a record if something goes wrong.'],
            ].map(([Icon, text]) => {
              const I = Icon as React.ElementType;
              return <li key={text as string} className="flex gap-2"><I className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" /> {text as string}</li>;
            })}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-ink-900 dark:text-ink-100">Report a problem</h2>
          <p className="mt-2 text-sm text-ink-600 dark:text-ink-300">
            Use the <strong>Report</strong> link on any listing, review or profile. Reports go straight to our team, and we'll update you in your notifications. Listings or accounts can be paused while we investigate.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button onClick={() => navigate('/search')} className="btn-outline">Find the listing to report</button>
            {siteConfig.supportEmail && <a href={`mailto:${siteConfig.supportEmail}?subject=Safety%20report`} className="btn-primary">Email our team</a>}
          </div>
          <p className="mt-4 text-xs text-ink-500">In an emergency, call 112.</p>
        </section>
      </div>
    </div>
  );
}
