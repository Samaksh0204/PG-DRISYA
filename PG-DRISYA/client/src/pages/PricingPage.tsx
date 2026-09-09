import { Check, Crown, Zap, TrendingUp, Star, ArrowRight, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';

const plans = [
  {
    name: 'Free',
    price: 0,
    period: 'forever',
    icon: ShieldCheck,
    color: 'ink',
    features: ['1 active listing', 'Basic listing page', 'Inquiry management', 'Standard ranking', 'Community support'],
    cta: 'Start free',
  },
  {
    name: 'Starter',
    price: 499,
    period: 'month',
    icon: Zap,
    color: 'teal',
    features: ['3 active listings', 'Verified badge priority', 'Analytics dashboard', 'Featured tag on 1 listing', 'Email support', 'Visit scheduling'],
    cta: 'Choose Starter',
    popular: false,
  },
  {
    name: 'Growth',
    price: 1499,
    period: 'month',
    icon: TrendingUp,
    color: 'coral',
    features: ['10 active listings', 'Featured boost on 3 listings', 'Advanced analytics & conversion', 'Instant Book enabled', 'Priority support', 'Custom inquiry templates', 'Photo reviews'],
    cta: 'Choose Growth',
    popular: true,
  },
  {
    name: 'Elite',
    price: 2999,
    period: 'month',
    icon: Crown,
    color: 'amber',
    features: ['Unlimited listings', 'Top ranking boost on all listings', 'Full analytics suite', 'Dedicated account manager', 'API access', 'Bulk listing tools', 'Premium support SLA', 'Branded listing pages'],
    cta: 'Choose Elite',
  },
];

export function PricingPage() {
  const { navigate } = useApp();

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-coral-50/60 to-white dark:from-coral-950/10 dark:to-ink-950">
        <div className="container-page py-16 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-4 py-1.5 text-xs font-semibold text-teal-700 dark:border-teal-800 dark:bg-teal-900/20 dark:text-teal-300">
            <Crown className="h-3.5 w-3.5" /> Owner subscription plans
          </span>
          <h1 className="mx-auto mt-5 max-w-2xl font-display text-4xl font-extrabold text-ink-900 text-balance dark:text-white sm:text-5xl">
            Boost your visibility. <span className="text-coral-500">Never compromise trust.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-ink-600 dark:text-ink-300">
            Premium plans give your listings a ranking boost and advanced analytics — but search relevance always comes first. Quality listings rise on their own merit.
          </p>
        </div>
      </section>

      {/* Plans */}
      <section className="container-page py-12">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`card relative p-6 ${plan.popular ? 'ring-2 ring-coral-500' : ''}`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-coral-500 px-3 py-1 text-xs font-bold text-white">
                  Most popular
                </span>
              )}
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                plan.color === 'coral' ? 'bg-coral-50 text-coral-600 dark:bg-coral-900/30 dark:text-coral-300' :
                plan.color === 'teal' ? 'bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-300' :
                plan.color === 'amber' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300' :
                'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300'
              }`}>
                <plan.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-display text-xl font-bold text-ink-900 dark:text-white">{plan.name}</h3>
              <div className="mt-2">
                <span className="font-display text-3xl font-bold text-ink-900 dark:text-white">₹{plan.price.toLocaleString('en-IN')}</span>
                <span className="text-sm text-ink-400"> /{plan.period}</span>
              </div>
              <button
                onClick={() => navigate('/login?role=owner')}
                className={`mt-5 w-full ${plan.popular ? 'btn-primary' : 'btn-outline'}`}
              >
                {plan.cta}
              </button>
              <ul className="mt-5 space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-ink-600 dark:text-ink-300">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Ranking transparency */}
      <section className="container-page py-12">
        <div className="rounded-3xl bg-ink-900 p-8 text-white dark:bg-ink-950 sm:p-12">
          <h2 className="font-display text-2xl font-bold">How our ranking works — transparently</h2>
          <p className="mt-2 max-w-2xl text-ink-300">Premium listings get a boost, but we blend multiple signals so the best results always surface.</p>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-5">
            {[
              { label: 'Verification status', weight: '30%' },
              { label: 'Review score', weight: '25%' },
              { label: 'Owner response rate', weight: '20%' },
              { label: 'Listing recency', weight: '15%' },
              { label: 'Subscription tier', weight: '10%' },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-white/5 p-4">
                <p className="font-display text-2xl font-bold text-coral-400">{s.weight}</p>
                <p className="mt-1 text-xs text-ink-300">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="container-page py-12">
        <h2 className="mb-6 text-center font-display text-2xl font-bold text-ink-900 dark:text-white">Frequently asked questions</h2>
        <div className="mx-auto max-w-2xl space-y-3">
          {[
            { q: 'Can I cancel anytime?', a: 'Yes. Your subscription runs month-to-month. Cancel from your dashboard and you keep access until the end of the billing period.' },
            { q: 'Do premium listings always rank first?', a: 'No. Premium listings get a boost, but our algorithm blends verification, reviews, and response rate. A high-quality free listing can outrank a mediocre premium one.' },
            { q: 'What happens to my listings if I downgrade?', a: 'Your listings stay live but lose the Featured tag and Instant Book. Analytics revert to basic. Nothing is deleted.' },
            { q: 'Is there a free trial?', a: 'The Free plan is permanently free for 1 listing. Paid plans offer a 14-day trial with no card required.' },
          ].map((f) => (
            <div key={f.q} className="card p-5">
              <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">{f.q}</h3>
              <p className="mt-1.5 text-sm text-ink-500 dark:text-ink-400">{f.a}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
