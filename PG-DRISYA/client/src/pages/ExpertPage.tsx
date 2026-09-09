import { useState } from 'react';
import { Sparkles, Phone, MessageCircle, Clock, CheckCircle2, ArrowRight, Star, Headphones, MapPin, Calendar, Users } from 'lucide-react';
import { useApp } from '../context/AppContext';

export function ExpertPage() {
  const { navigate } = useApp();
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-ink-900 to-ink-800 py-16 text-white dark:from-ink-950 dark:to-ink-900">
        <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-coral-500/20 blur-3xl" />
        <div className="container-page relative">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-coral-500/20 px-4 py-1.5 text-xs font-semibold text-coral-300">
              <Sparkles className="h-3.5 w-3.5" /> Drisya Expert Concierge
            </span>
            <h1 className="mt-5 font-display text-4xl font-extrabold text-balance sm:text-5xl">
              Too busy to search? <span className="text-coral-400">Let our experts find your PG.</span>
            </h1>
            <p className="mt-4 max-w-xl text-base text-ink-300">
              A premium, high-touch human-assisted search service. Tell us your needs — budget, location, move-in date — and our local experts shortlist verified properties, schedule visits, and handle the negotiation. All within your SLA.
            </p>
            <div className="mt-6 flex flex-wrap gap-4">
              <button onClick={() => document.getElementById('request-form')?.scrollIntoView({ behavior: 'smooth' })} className="btn bg-coral-500 px-6 py-3 text-sm font-semibold hover:bg-coral-600">
                Request expert help <ArrowRight className="h-4 w-4" />
              </button>
              <button className="btn border border-white/20 px-6 py-3 text-sm font-medium hover:bg-white/10">
                <Phone className="h-4 w-4" /> Book a call
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="container-page py-12">
        <h2 className="mb-8 text-center font-display text-2xl font-bold text-ink-900 dark:text-white">How it works</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          {[
            { icon: MessageCircle, title: 'Share your needs', desc: 'Fill the request form with budget, location, move-in date, and preferences.' },
            { icon: Users, title: 'Expert is assigned', desc: 'A local Drisya Expert is matched to you within 2 hours. They know the area.' },
            { icon: MapPin, title: 'Curated shortlist', desc: 'Your expert sends 3-5 verified property options that match your criteria.' },
            { icon: Calendar, title: 'Visits & negotiation', desc: 'We schedule visits, accompany you, and negotiate the best terms with owners.' },
          ].map((s, i) => (
            <div key={s.title} className="card p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-coral-50 text-coral-600 dark:bg-coral-900/30 dark:text-coral-300">
                <s.icon className="h-6 w-6" />
              </div>
              <span className="mt-3 block font-display text-2xl font-bold text-ink-100 dark:text-ink-800">{i + 1}</span>
              <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">{s.title}</h3>
              <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-ink-50/50 py-12 dark:bg-ink-900/30">
        <div className="container-page">
          <h2 className="mb-8 text-center font-display text-2xl font-bold text-ink-900 dark:text-white">Concierge plans</h2>
          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-3">
            {[
              { name: 'Basic', price: 499, features: ['3 curated shortlists', 'Within 48 hours', 'WhatsApp support', 'Visit scheduling'] },
              { name: 'Standard', price: 1499, features: ['5 curated shortlists', 'Within 24 hours', 'Phone + WhatsApp support', 'Accompanied visits', 'Negotiation support'], popular: true },
              { name: 'Premium', price: 2999, features: ['Unlimited shortlists', 'Within 12 hours', 'Dedicated expert', 'All visits accompanied', 'Full negotiation', 'Move-in assistance'] },
            ].map((p) => (
              <div key={p.name} className={`card relative p-6 ${p.popular ? 'ring-2 ring-coral-500' : ''}`}>
                {p.popular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-coral-500 px-3 py-1 text-xs font-bold text-white">Best value</span>}
                <h3 className="font-display text-lg font-bold text-ink-900 dark:text-white">{p.name}</h3>
                <p className="mt-2"><span className="font-display text-3xl font-bold text-ink-900 dark:text-white">₹{p.price.toLocaleString('en-IN')}</span></p>
                <ul className="mt-4 space-y-2">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-ink-600 dark:text-ink-300">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-teal-600" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Request form */}
      <section id="request-form" className="container-page py-16">
        <div className="mx-auto max-w-xl">
          <h2 className="mb-2 text-center font-display text-2xl font-bold text-ink-900 dark:text-white">Request expert help</h2>
          <p className="mb-6 text-center text-sm text-ink-500 dark:text-ink-400">Fill this out and an expert will reach out within 2 hours.</p>
          {submitted ? (
            <div className="card flex flex-col items-center p-10 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-300">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="mt-4 font-display text-xl font-bold text-ink-900 dark:text-white">Request received!</h3>
              <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">Your Drisya Expert will contact you within 2 hours. Check your phone for a confirmation.</p>
              <button onClick={() => navigate('/')} className="btn-primary mt-6">Back to home</button>
            </div>
          ) : (
            <div className="card p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <input className="input" placeholder="Full name" />
                  <input className="input" placeholder="Phone number" defaultValue="+91 " />
                </div>
                <input className="input" placeholder="Email address" />
                <div className="grid grid-cols-2 gap-3">
                  <input className="input" placeholder="Preferred city" defaultValue="Indore" />
                  <input className="input" placeholder="Preferred locality" defaultValue="Mahalaxmi Nagar" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-ink-500">Budget (₹/month)</label>
                    <input className="input" type="number" placeholder="8000" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-ink-500">Move-in date</label>
                    <input className="input" type="date" />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-ink-500">Gender preference</label>
                  <div className="flex gap-2">
                    {['Male', 'Female', 'Co-ed'].map((g) => (
                      <button key={g} className="chip border border-ink-200 text-xs text-ink-600 dark:border-ink-700 dark:text-ink-300">{g}</button>
                    ))}
                  </div>
                </div>
                <textarea className="input min-h-[80px] resize-none" placeholder="Anything else we should know? (college proximity, specific amenities, etc.)" />
                <button onClick={() => setSubmitted(true)} className="btn-primary w-full">
                  Submit request <ArrowRight className="h-4 w-4" />
                </button>
                <p className="flex items-center justify-center gap-1.5 text-xs text-ink-400">
                  <Clock className="h-3.5 w-3.5" /> Average response time: 1.5 hours
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Testimonial */}
      <section className="container-page pb-16">
        <div className="mx-auto max-w-2xl rounded-3xl bg-gradient-to-br from-coral-50 to-teal-50 p-8 dark:from-coral-950/20 dark:to-teal-950/20">
          <div className="flex gap-1">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />)}</div>
          <p className="mt-3 text-lg font-medium text-ink-800 dark:text-ink-200">"I was completely lost searching for a PG in a new city. The Drisya Expert found me a verified place near my college within my budget in 3 days. Worth every rupee."</p>
          <div className="mt-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-coral-500 text-white"><Headphones className="h-5 w-5" /></div>
            <div>
              <p className="text-sm font-semibold text-ink-900 dark:text-ink-100">Rinkesh Paliwal</p>
              <p className="text-xs text-ink-400">Btech Student, Indore</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
