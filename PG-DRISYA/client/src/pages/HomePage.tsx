import { useEffect, useState } from 'react';
import { ShieldCheck, Users, Banknote, Star, ArrowRight, Sparkles, MessageSquare, Calendar, Heart, Search, MapPin, TrendingUp, Quote } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SearchBar } from '../components/SearchBar';
import { ListingCard } from '../components/ListingCard';
import { VerifiedBadge } from '../components/Badges';
import { testimonials } from '../data/mockData';
import { fetchListings } from '../lib/api';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import type { PropertyListing } from '../types';

function TrustCard({ icon: Icon, title, desc }: { icon: React.ElementType; title: string; desc: string }) {
  return (
    <div className="group rounded-2xl border border-ink-100 bg-white p-6 transition-all hover:border-coral-200 hover:shadow-card-hover dark:border-ink-800 dark:bg-ink-900 dark:hover:border-coral-800">
      <div className="mb-4 inline-flex rounded-xl bg-coral-50 p-3 text-coral-600 transition-colors group-hover:bg-coral-100 dark:bg-coral-900/30 dark:text-coral-400">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-ink-900 dark:text-ink-100">{title}</h3>
      <p className="text-sm leading-relaxed text-ink-500 dark:text-ink-400">{desc}</p>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-3xl font-bold text-white sm:text-4xl">{value}</div>
      <div className="mt-1 text-sm text-white/70">{label}</div>
    </div>
  );
}

export function HomePage() {
  useDocumentTitle(undefined, 'Find verified PG accommodations and hostels across India. Compare prices, amenities, and reviews on Drisya.');
  const { navigate, cities } = useApp();
  const [featured, setFeatured] = useState<PropertyListing[]>([]);
  const [trending, setTrending] = useState<PropertyListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [featuredData, trendingData] = await Promise.all([
          fetchListings({ featured: 'true' }),
          fetchListings({ sort: 'views' }),
        ]);
        if (!mounted) return;
        setFeatured(featuredData.slice(0, 6));
        setTrending(trendingData.slice(0, 4));
      } catch (err) {
        console.error('Failed to load listings:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="min-h-screen">
     {/* Hero */}
<section className="relative overflow-hidden bg-gradient-to-br from-ink-900 via-ink-800 to-coral-900 pt-28 pb-20 sm:pt-36">
  <div className="absolute inset-0 opacity-10">
    <div className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-coral-500 blur-[128px]" />
    <div className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-teal-500 blur-[128px]" />
  </div>

  <div className="relative mx-auto max-w-7xl px-4">
    <div className="mb-6 text-center">
      <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm text-white/80 backdrop-blur-sm">
        <Sparkles className="h-4 w-4 text-coral-400" />
        India's one of the most trusted PG platform
      </div>

      <h1 className="mb-3 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
        Find your
        <span className="text-coral-400"> Home Away From Home </span>
      </h1>

      <p className="mx-auto max-w-2xl text-lg leading-relaxed text-white/60">
        Verified listings, virtual tours, and instant bookings.
        No brokers, no fake photos, no hassle.
      </p>
    </div>

    <div className="mx-auto max-w-5xl">
      <SearchBar />
    </div>

    <div className="mt-5 flex flex-wrap justify-center gap-6 text-sm text-white/50">
      <span className="flex items-center gap-1">
        <Search className="h-3.5 w-3.5" />
        10+ verified PGs
      </span>

      <span className="flex items-center gap-1">
        <Heart className="h-3.5 w-3.5" />
        20+ happy tenants
      </span>

      <span className="flex items-center gap-1">
        <MapPin className="h-3.5 w-3.5" />
        4 cities and growing
      </span>
    </div>
  </div>
</section>

      {/* Trust Indicators */}
      <section className="mx-auto -mt-0 max-w-7xl px-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <TrustCard icon={ShieldCheck} title="Verified Listings" desc="Every property is physically inspected. We verify amenities, photos, and owner identity." />
          <TrustCard icon={Users} title="Zero Brokerage" desc="Connect directly with owners. No middlemen, no hidden charges, no commission." />
          <TrustCard icon={Banknote} title="Transparent Pricing" desc="What you see is what you pay. All charges are listed upfront with no surprises." />
          <TrustCard icon={Calendar} title="Instant Booking" desc="Book your PG instantly with secure online payments and instant confirmation." />
        </div>
      </section>

      {/* Stats Band */}
      <section className="mt-16 bg-gradient-to-r from-coral-600 to-coral-500 py-12">
        <div className="mx-auto flex max-w-5xl flex-wrap justify-around gap-8 px-4">
          <Stat value="10+" label="Verified PGs" />
          <Stat value="20+" label="Happy Tenants" />
          <Stat value="4" label="Cities" />
          <Stat value="4.9" label="Avg Rating" />
        </div>
      </section>

      {/* Featured Listings */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-coral-600">
              <Star className="h-4 w-4" /> Featured
            </div>
            <h2 className="text-2xl font-bold text-ink-900 dark:text-ink-100 sm:text-3xl">
              Handpicked PGs for you
            </h2>
          </div>
          <button
            onClick={() => navigate('/search?featured=true')}
            className="hidden items-center gap-1 text-sm font-semibold text-coral-600 transition hover:text-coral-700 sm:flex"
          >
            View all <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[4/3] rounded-2xl bg-ink-100 dark:bg-ink-800" />
                <div className="mt-3 space-y-2">
                  <div className="h-4 w-3/4 rounded bg-ink-100 dark:bg-ink-800" />
                  <div className="h-3 w-1/2 rounded bg-ink-100 dark:bg-ink-800" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((listing, i) => (
              <ListingCard key={listing.id} listing={listing} index={i} />
            ))}
          </div>
        )}
      </section>

      {/* Trending Listings */}
      <section className="bg-ink-50 py-16 dark:bg-ink-950">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-coral-600">
                <TrendingUp className="h-4 w-4" /> Trending
              </div>
              <h2 className="text-2xl font-bold text-ink-900 dark:text-ink-100 sm:text-3xl">
                Most viewed this week
              </h2>
            </div>
            <button
              onClick={() => navigate('/search')}
              className="hidden items-center gap-1 text-sm font-semibold text-coral-600 transition hover:text-coral-700 sm:flex"
            >
              Explore all <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          {!loading && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {trending.map((listing, i) => (
                <ListingCard key={listing.id} listing={listing} index={i} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Explore Cities */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="mb-8">
          <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-coral-600">
            <MapPin className="h-4 w-4" /> Explore
          </div>
          <h2 className="text-2xl font-bold text-ink-900 dark:text-ink-100 sm:text-3xl">
            Popular cities
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {cities.map((city) => (
            <button
              key={city.id}
              onClick={() => navigate(`/search?city=${city.name}`)}
              className="group relative overflow-hidden rounded-2xl"
            >
              <div className="aspect-[4/3] w-full overflow-hidden">
                <img
                  src={city.image}
                  alt={city.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 p-4">
                <h3 className="text-lg font-bold text-white">{city.name}</h3>
                <p className="text-sm text-white/70">{city.listingCount} PGs</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-ink-50 py-16 dark:bg-ink-950">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-bold text-ink-900 dark:text-ink-100 sm:text-3xl">
              How Drisya works
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-ink-500 dark:text-ink-400">
              Find and book your PG in three simple steps
            </p>
          </div>
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              { icon: Search, step: '01', title: 'Search & Filter', desc: 'Browse verified PGs by city, budget, gender, and amenities.' },
              { icon: MessageSquare, step: '02', title: 'Connect & Visit', desc: 'Chat with owners, schedule visits, or take virtual tours.' },
              { icon: Calendar, step: '03', title: 'Book & Move In', desc: 'Book online instantly and move in on your preferred date.' },
            ].map(({ icon: StepIcon, step, title, desc }) => (
              <div key={step} className="relative text-center">
                <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-coral-50 text-coral-600 dark:bg-coral-900/30 dark:text-coral-400">
                  <StepIcon className="h-7 w-7" />
                </div>
                <div className="mb-2 text-xs font-bold tracking-widest text-coral-500">{step}</div>
                <h3 className="mb-2 text-lg font-semibold text-ink-900 dark:text-ink-100">{title}</h3>
                <p className="text-sm text-ink-500 dark:text-ink-400">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="mb-8 text-center">
          <div className="mb-1 flex items-center justify-center gap-2 text-sm font-semibold text-coral-600">
            <Quote className="h-4 w-4" /> Testimonials
          </div>
          <h2 className="text-2xl font-bold text-ink-900 dark:text-ink-100 sm:text-3xl">
            What our tenants say
          </h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t) => (
            <div
              key={t.id}
              className="rounded-2xl border border-ink-100 bg-white p-6 transition-all hover:shadow-card-hover dark:border-ink-800 dark:bg-ink-900"
            >
              <div className="mb-4 flex items-center gap-1">
                {[...Array(t.rating)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="mb-4 text-sm leading-relaxed text-ink-600 dark:text-ink-300">
                "{t.text}"
              </p>
              <div className="flex items-center gap-3">
                <img
                  src={t.avatar}
                  alt={t.name}
                  className="h-10 w-10 rounded-full object-cover"
                />
                <div>
                  <div className="text-sm font-semibold text-ink-900 dark:text-ink-100">{t.name}</div>
                  <div className="text-xs text-ink-500 dark:text-ink-400">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Verified Badge Section */}
      <section className="bg-teal-50 py-16 dark:bg-teal-950/30">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex flex-col items-center gap-8 lg:flex-row">
            <div className="flex-1">
              <VerifiedBadge size="md" />
              <h2 className="mt-4 text-2xl font-bold text-ink-900 dark:text-ink-100 sm:text-3xl">
                The Drisya Verified promise
              </h2>
              <p className="mt-2 max-w-lg text-ink-500 dark:text-ink-400">
                Every verified listing has been personally inspected by our team. We check photos, amenities, safety, and hygiene so you don't have to.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  'Photos match reality — inspected on-site',
                  'Owner identity and documents verified',
                  'Amenities physically checked',
                  'Safety and hygiene standards met',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-ink-700 dark:text-ink-300">
                    <ShieldCheck className="h-4 w-4 flex-shrink-0 text-teal-600" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex-shrink-0">
              <div className="relative">
                <div className="h-64 w-80 rounded-2xl bg-gradient-to-br from-teal-100 to-teal-200 dark:from-teal-900/50 dark:to-teal-800/50" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <ShieldCheck className="h-24 w-24 text-teal-500/30" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="rounded-3xl bg-gradient-to-br from-coral-600 to-coral-500 p-8 text-center sm:p-12">
          <Sparkles className="mx-auto mb-4 h-8 w-8 text-white/80" />
          <h2 className="mb-2 text-2xl font-bold text-white sm:text-3xl">
            Ready to find your new home?
          </h2>
          <p className="mx-auto mb-6 max-w-lg text-white/70">
            Join 50+ tenants who found their perfect PG through Drisya.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={() => navigate('/search')}
              className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-coral-600 transition hover:bg-white/90"
            >
              Browse PGs
            </button>
            <button
              onClick={() => navigate('/login?role=owner')}
              className="rounded-xl border border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              List your property
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
