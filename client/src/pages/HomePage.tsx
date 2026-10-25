import { useEffect, useState } from 'react';
import { ShieldCheck, Users, Banknote, Star, ArrowRight, MessageSquare, Calendar, Search, MapPin, TrendingUp, Flag, KeyRound } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SearchBar } from '../components/SearchBar';
import { ListingCard } from '../components/ListingCard';
import { SafeImage } from '../components/ui';
import { Reveal, CountUp } from '../components/Reveal';
import { fetchListings, fetchStats } from '../lib/api';
import type { PropertyListing, SiteStats } from '../types';

function TrustCard({ icon: Icon, title, desc }: { icon: React.ElementType; title: string; desc: string }) {
  return (
    <div className="card-interactive group h-full p-6">
      <div className="mb-4 inline-flex rounded-xl bg-brand-50 p-3 text-brand-600 transition group-hover:bg-brand-500 group-hover:text-white dark:bg-brand-900/30 dark:text-brand-400"><Icon className="h-6 w-6" /></div>
      <h3 className="mb-2 text-lg font-semibold text-ink-900 dark:text-ink-100">{title}</h3>
      <p className="text-sm leading-relaxed text-ink-600 dark:text-ink-300">{desc}</p>
    </div>
  );
}

function SkeletonGrid({ n, cols }: { n: number; cols: string }) {
  return (
    <div className={`grid gap-6 ${cols}`}>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i}>
          <div className="skeleton aspect-[4/3] rounded-2xl" />
          <div className="skeleton mt-3 h-4 w-3/4 rounded" />
          <div className="skeleton mt-2 h-3 w-1/2 rounded" />
        </div>
      ))}
    </div>
  );
}

export function HomePage() {
  const { navigate, cities } = useApp();
  const [featured, setFeatured] = useState<PropertyListing[]>([]);
  const [trending, setTrending] = useState<PropertyListing[]>([]);
  const [stats, setStats] = useState<SiteStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    Promise.all([fetchListings({ featured: 'true', limit: '6' }), fetchListings({ sort: 'views', limit: '4' }), fetchStats().catch(() => null)])
      .then(([f, t, s]) => {
        if (!mounted) return;
        setFeatured(f);
        setTrending(t);
        setStats(s);
      })
      .catch(() => mounted && setError('Could not load listings right now.'))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  const statItems = stats
    ? [
        { value: <CountUp value={stats.activeListings} />, label: 'PGs listed' },
        { value: <CountUp value={stats.cities} />, label: stats.cities === 1 ? 'City' : 'Cities' },
        { value: <CountUp value={stats.verifiedListings} />, label: 'Drisya Verified' },
        ...(stats.reviews >= 5 ? [{ value: <>{stats.avgRating}★</>, label: `from ${stats.reviews} stay reviews` }] : []),
      ]
    : [];

  return (
    <div className="min-h-screen">
      <section className="relative overflow-hidden border-b border-ink-200 bg-white pb-16 pt-14 dark:border-ink-800 dark:bg-ink-950 sm:pb-20 sm:pt-20">
        <div aria-hidden className="pointer-events-none absolute -right-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-brand-50 dark:bg-brand-900/20" />
        <div aria-hidden className="pointer-events-none absolute -bottom-40 -left-24 h-80 w-80 rounded-full bg-ink-50 dark:bg-ink-900" />
        <div className="container-page relative">
          <div className="mx-auto mb-8 max-w-3xl text-center animate-fade-in">
            <span className="badge mb-4 border border-brand-200 bg-brand-50 px-3 py-1 text-brand-800 dark:border-brand-800 dark:bg-brand-900/30 dark:text-brand-200">
              <ShieldCheck className="h-3.5 w-3.5" /> No brokerage · Listings reviewed by our team
            </span>
            <h1 className="text-balance text-4xl font-extrabold tracking-tight text-ink-900 dark:text-white sm:text-5xl lg:text-6xl">
              Find your <span className="text-brand-600 dark:text-brand-400">home away from home</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-ink-600 dark:text-ink-300">
              Comfortable PGs and hostels for students and working professionals. Message owners directly, visit before you pay, and book with confidence.
            </p>
          </div>
          <div className="mx-auto max-w-5xl animate-fade-in [animation-delay:120ms]"><SearchBar /></div>
          {statItems.length > 0 && stats!.activeListings > 0 && (
            <dl className="mx-auto mt-8 flex max-w-3xl flex-wrap justify-center gap-3">
              {statItems.map((st) => (
                <div key={st.label} className="min-w-[96px] flex-1 basis-[96px] rounded-xl border border-ink-200 bg-white px-3 py-3 text-center shadow-soft transition hover:-translate-y-0.5 hover:border-brand-200 dark:border-ink-800 dark:bg-ink-900 sm:max-w-[180px]">
                  <div className="flex flex-col-reverse">
                    <dt className="text-xs text-ink-500 dark:text-ink-300">{st.label}</dt>
                    <dd className="text-2xl font-bold text-ink-900 dark:text-white">{st.value}</dd>
                  </div>
                </div>
              ))}
            </dl>
          )}
        </div>
      </section>

      <section className="container-page mt-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Reveal><TrustCard icon={Users} title="No brokerage" desc="Talk to owners directly. Drisya never charges tenants a commission." /></Reveal>
          <Reveal delay={80}><TrustCard icon={ShieldCheck} title="Reviewed listings" desc="Every new listing is checked by our team before it goes live. Look for the Verified badge on PGs we've inspected in person." /></Reveal>
          <Reveal delay={160}><TrustCard icon={Star} title="Real reviews only" desc="Only tenants who visited or stayed can leave a review, so ratings can't be faked." /></Reveal>
          <Reveal delay={240}><TrustCard icon={Banknote} title="Clear pricing" desc="Rent and deposit are shown upfront. You pay the owner at move-in, after you've seen the place." /></Reveal>
        </div>
      </section>

      <section className="container-page py-16">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-brand-600"><Star className="h-4 w-4" /> Featured</div>
            <h2 className="text-2xl font-bold text-ink-900 dark:text-white sm:text-3xl">Handpicked PGs</h2>
          </div>
          <button onClick={() => navigate('/search?featured=true')} className="hidden items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700 sm:flex">View all <ArrowRight className="h-4 w-4" /></button>
        </div>
        {loading ? (
          <SkeletonGrid n={6} cols="sm:grid-cols-2 lg:grid-cols-3" />
        ) : error ? (
          <p className="rounded-xl border border-danger/20 bg-danger/5 p-4 text-sm text-danger">{error}</p>
        ) : featured.length ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{featured.map((l, i) => <ListingCard key={l.id} listing={l} index={i} />)}</div>
        ) : (
          <div className="card border-dashed p-10 text-center">
            <p className="text-ink-600 dark:text-ink-300">Listings are coming soon in your city.</p>
            <button className="btn-primary mt-4" onClick={() => navigate('/search')}>Browse all PGs</button>
          </div>
        )}
      </section>

      {trending.length > 0 && (
        <section className="border-y border-ink-200 bg-white py-16 dark:border-ink-800 dark:bg-ink-900/40">
          <div className="container-page">
            <div className="mb-8 flex items-end justify-between">
              <div>
                <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-brand-600"><TrendingUp className="h-4 w-4" /> Popular</div>
                <h2 className="text-2xl font-bold text-ink-900 dark:text-white sm:text-3xl">Most viewed</h2>
              </div>
              <button onClick={() => navigate('/search?sort=views')} className="hidden items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700 sm:flex">Explore all <ArrowRight className="h-4 w-4" /></button>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{trending.map((l, i) => <ListingCard key={l.id} listing={l} index={i} />)}</div>
          </div>
        </section>
      )}

      {cities.length > 0 && (
        <section className="container-page py-16">
          <div className="mb-8">
            <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-brand-600"><MapPin className="h-4 w-4" /> Explore</div>
            <h2 className="text-2xl font-bold text-ink-900 dark:text-white sm:text-3xl">Cities on Drisya</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {cities.map((city) => (
              <button key={city.id} onClick={() => navigate(`/search?city=${encodeURIComponent(city.name)}`)} className="group relative overflow-hidden rounded-2xl text-left shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-card-hover focus-visible:ring-2 focus-visible:ring-brand-500">
                <SafeImage
                  src={city.image}
                  alt={city.name}
                  width={400}
                  className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  fallback={
                    <div aria-hidden className="relative flex aspect-[4/3] w-full items-start justify-end overflow-hidden bg-gradient-to-br from-ink-900 via-ink-800 to-brand-700 p-4 transition-transform duration-500 group-hover:scale-105">
                      <span className="select-none text-7xl font-extrabold leading-none text-white/10">{city.name.slice(0, 2).toUpperCase()}</span>
                      <MapPin className="absolute left-4 top-4 h-6 w-6 text-brand-300" />
                    </div>
                  }
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink-950/80 via-ink-950/20 to-transparent" />
                <div className="absolute bottom-0 left-0 p-4">
                  <h3 className="text-lg font-bold text-white">{city.name}</h3>
                  <p className="flex items-center gap-1 text-sm text-white/85">{city.listingCount} PG{city.listingCount === 1 ? '' : 's'} <ArrowRight className="h-3.5 w-3.5 -translate-x-1 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100" /></p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="border-y border-ink-200 bg-white py-16 dark:border-ink-800 dark:bg-ink-900/40">
        <div className="container-page">
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-bold text-ink-900 dark:text-white sm:text-3xl">How Drisya works</h2>
          </div>
          <div className="grid gap-8 sm:grid-cols-4">
            {[
              { icon: Search, title: 'Search', desc: 'Filter by city, budget, gender, room type and amenities — or browse on the map.' },
              { icon: MessageSquare, title: 'Message & visit', desc: 'Ask the owner questions and book a visit slot that suits you.' },
              { icon: Calendar, title: 'Request to book', desc: 'Pick your move-in date. The owner confirms, or it is confirmed instantly for Instant Book PGs.' },
              { icon: KeyRound, title: 'Move in & review', desc: 'Pay the owner at move-in under a written agreement, then leave an honest review.' },
            ].map(({ icon: Icon, title, desc }, i) => (
              <Reveal key={title} delay={i * 100} className="text-center">
                <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400"><Icon className="h-6 w-6" /></div>
                <div className="mb-1 text-xs font-bold tracking-widest text-brand-500">0{i + 1}</div>
                <h3 className="mb-2 text-lg font-semibold text-ink-900 dark:text-ink-100">{title}</h3>
                <p className="text-sm text-ink-600 dark:text-ink-300">{desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page py-16">
        <Reveal><div className="grid items-center gap-8 rounded-3xl border border-brand-100 bg-brand-50 p-8 dark:border-brand-900 dark:bg-brand-950/30 lg:grid-cols-2 lg:p-12">
          <div>
            <h2 className="text-2xl font-bold text-ink-900 dark:text-white sm:text-3xl">Stay safe while you search</h2>
            <ul className="mt-6 space-y-3 text-sm text-ink-700 dark:text-ink-300">
              {[
                'Always visit the PG before paying anything.',
                'Pay rent and deposit only against a written rent agreement and receipt.',
                "Never share OTPs or bank passwords with anyone — Drisya will never ask for them.",
                'Report fake listings or suspicious requests from any listing or chat.',
              ].map((t) => <li key={t} className="flex gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" /> {t}</li>)}
            </ul>
            <button onClick={() => navigate('/trust')} className="btn-outline mt-6"><Flag className="h-4 w-4" /> Trust & Safety</button>
          </div>
          <div className="rounded-2xl bg-ink-900 p-8 text-center text-white shadow-card-hover">
            <h3 className="text-2xl font-bold text-white">Own a PG or hostel?</h3>
            <p className="mx-auto mt-2 max-w-sm text-ink-300">List it free, get booking requests from tenants with confirmed emails, and manage visits in one place.</p>
            <button onClick={() => navigate('/owner')} className="btn-primary mt-6">List your PG <ArrowRight className="h-4 w-4" /></button>
          </div>
        </div></Reveal>
      </section>
    </div>
  );
}
