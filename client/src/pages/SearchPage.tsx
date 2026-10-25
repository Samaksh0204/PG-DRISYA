import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Map as MapIcon, List, SlidersHorizontal, X, MapPin, ShieldCheck, Zap, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ListingCard } from '../components/ListingCard';
import { AMENITIES } from '../data/amenities';
import { searchListings } from '../lib/api';
import { useDebounce } from '../hooks/useDebounce';
import { routeParams } from '../lib/format';
import { Spinner } from '../components/ui';
import type { PropertyListing } from '../types';

// The map library is only downloaded when someone opens the map view.
const ListingsMap = lazy(() => import('../components/MapView').then((m) => ({ default: m.ListingsMap })));

const SORT_OPTIONS = [
  { value: '', label: 'Recommended' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Top rated' },
  { value: 'newest', label: 'Newest' },
];
const PAGE_SIZE = 24;

interface Filters {
  q: string;
  minPrice: string;
  maxPrice: string;
  gender: string;
  occupancy: string;
  amenities: string[];
  verified: boolean;
  instantBook: boolean;
  featured: boolean;
  sort: string;
}

const EMPTY: Filters = { q: '', minPrice: '', maxPrice: '', gender: '', occupancy: '', amenities: [], verified: false, instantBook: false, featured: false, sort: '' };

function filtersFromRoute(route: string): Filters {
  const p = routeParams(route);
  return {
    ...EMPTY,
    q: p.get('q') || p.get('city') || '',
    maxPrice: p.get('maxPrice') || p.get('budget') || '',
    minPrice: p.get('minPrice') || '',
    gender: p.get('gender') || '',
    occupancy: p.get('occupancy') || '',
    verified: p.get('verified') === 'true',
    instantBook: p.get('instantBook') === 'true',
    featured: p.get('featured') === 'true',
    sort: p.get('sort') || '',
    amenities: (p.get('amenities') || '').split(',').filter(Boolean),
  };
}

export function SearchPage() {
  const { route, navigate } = useApp();
  const [f, setF] = useState<Filters>(() => filtersFromRoute(route));
  const [listings, setListings] = useState<PropertyListing[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [view, setView] = useState<'list' | 'map'>('list');
  const [showFilters, setShowFilters] = useState(false);

  // Follow links like /search?city=Indore from elsewhere on the site.
  useEffect(() => { setF(filtersFromRoute(route)); }, [route]);

  const dq = useDebounce(f.q, 350);
  const dMin = useDebounce(f.minPrice, 400);
  const dMax = useDebounce(f.maxPrice, 400);

  const params = useMemo(() => ({
    search: dq || undefined,
    minPrice: dMin || undefined,
    maxPrice: dMax || undefined,
    gender: f.gender || undefined,
    occupancy: f.occupancy || undefined,
    amenities: f.amenities.length ? f.amenities.join(',') : undefined,
    verified: f.verified ? 'true' : undefined,
    instantBook: f.instantBook ? 'true' : undefined,
    featured: f.featured ? 'true' : undefined,
    sort: f.sort || undefined,
  }), [dq, dMin, dMax, f.gender, f.occupancy, f.amenities, f.verified, f.instantBook, f.featured, f.sort]);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError('');
    // Map view shows up to 100 pins at once; list view pages through 24 at a time.
    searchListings({ ...params, page: 1, limit: view === 'map' ? 100 : PAGE_SIZE })
      .then((res) => {
        if (!live) return;
        setListings(res.listings);
        setTotal(res.total);
        setPage(1);
        setPages(res.pages);
      })
      .catch(() => live && setError('Could not load listings. Please try again.'))
      .finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [params, retry, view]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const res = await searchListings({ ...params, page: page + 1, limit: PAGE_SIZE });
      setListings((prev) => [...prev, ...res.listings.filter((l) => !prev.some((p) => p.id === l.id))]);
      setPage(res.page);
      setPages(res.pages);
    } catch {
      setError('Could not load more listings.');
    } finally {
      setLoadingMore(false);
    }
  };

  const set = <K extends keyof Filters>(key: K, value: Filters[K]) => setF((prev) => ({ ...prev, [key]: value }));
  const toggleAmenity = (key: string) => set('amenities', f.amenities.includes(key) ? f.amenities.filter((a) => a !== key) : [...f.amenities, key]);
  const clearFilters = () => { setF(EMPTY); navigate('/search'); };
  const activeCount = [f.q, f.gender, f.occupancy, f.minPrice, f.maxPrice, f.verified, f.instantBook, f.featured, ...f.amenities].filter(Boolean).length;

  const chip = (active: boolean) => `chip ${active ? 'chip-active' : ''}`;

  return (
    <div className="min-h-screen bg-ink-50 dark:bg-ink-950">
      <div className="sticky top-16 z-20 border-b border-ink-100 bg-white/90 backdrop-blur-xl dark:border-ink-800 dark:bg-ink-900/90">
        <div className="container-page flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="flex flex-1 items-center gap-3">
            <input
              aria-label="Search"
              value={f.q}
              onChange={(e) => set('q', e.target.value)}
              placeholder="City, locality, college…"
              className="input max-w-xs flex-1"
            />
            <button onClick={() => setShowFilters(true)} className="inline-flex items-center gap-2 rounded-xl border border-ink-200 px-4 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50 dark:border-ink-700 dark:text-ink-300 dark:hover:bg-ink-800 lg:hidden">
              <SlidersHorizontal className="h-4 w-4" /> Filters
              {activeCount > 0 && <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white">{activeCount}</span>}
            </button>
            {activeCount > 0 && <button onClick={clearFilters} className="text-xs font-medium text-brand-600 underline">Clear all</button>}
          </div>
          <div className="flex items-center gap-3">
            <select aria-label="Sort" value={f.sort} onChange={(e) => set('sort', e.target.value)} className="rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-ink-700 outline-none dark:border-ink-700 dark:bg-ink-900 dark:text-ink-300">
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <div className="flex rounded-xl border border-ink-200 dark:border-ink-700">
              <button aria-label="List view" aria-pressed={view === 'list'} onClick={() => setView('list')} className={`rounded-l-xl px-3 py-2 ${view === 'list' ? 'bg-ink-900 text-white dark:bg-ink-100 dark:text-ink-900' : 'text-ink-500 hover:bg-ink-50 dark:hover:bg-ink-800'}`}><List className="h-4 w-4" /></button>
              <button aria-label="Map view" aria-pressed={view === 'map'} onClick={() => setView('map')} className={`rounded-r-xl px-3 py-2 ${view === 'map' ? 'bg-ink-900 text-white dark:bg-ink-100 dark:text-ink-900' : 'text-ink-500 hover:bg-ink-50 dark:hover:bg-ink-800'}`}><MapIcon className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
      </div>

      <div className="container-page flex gap-6 py-6">
        <aside className={`${showFilters ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} fixed inset-y-0 left-0 z-50 w-80 overflow-y-auto border-r border-ink-100 bg-white p-6 transition-transform lg:static lg:z-auto lg:block lg:w-72 lg:flex-shrink-0 lg:self-start lg:rounded-2xl lg:border dark:border-ink-800 dark:bg-ink-900`} aria-label="Filters">
          <div className="mb-6 flex items-center justify-between lg:hidden">
            <h3 className="text-lg font-semibold">Filters</h3>
            <button onClick={() => setShowFilters(false)} className="rounded-lg p-1 hover:bg-ink-100 dark:hover:bg-ink-800" aria-label="Close filters"><X className="h-5 w-5" /></button>
          </div>

          <FilterGroup label="Monthly rent (₹)">
            <div className="flex items-center gap-2">
              <input aria-label="Minimum rent" type="number" min={0} value={f.minPrice} onChange={(e) => set('minPrice', e.target.value)} placeholder="Min" className="input w-full" />
              <span className="text-ink-400">–</span>
              <input aria-label="Maximum rent" type="number" min={0} value={f.maxPrice} onChange={(e) => set('maxPrice', e.target.value)} placeholder="Max" className="input w-full" />
            </div>
          </FilterGroup>

          <FilterGroup label="For">
            <div className="flex flex-wrap gap-2">
              {[['', 'Anyone'], ['male', 'Men'], ['female', 'Women'], ['coed', 'Co-ed']].map(([v, l]) => (
                <button key={v} onClick={() => set('gender', v)} className={chip(f.gender === v)}>{l}</button>
              ))}
            </div>
          </FilterGroup>

          <FilterGroup label="Room type">
            <div className="flex flex-wrap gap-2">
              {[['', 'Any'], ['single', 'Single'], ['double', 'Double'], ['triple', 'Triple'], ['dorm', 'Dorm']].map(([v, l]) => (
                <button key={v} onClick={() => set('occupancy', v)} className={chip(f.occupancy === v)}>{l}</button>
              ))}
            </div>
          </FilterGroup>

          <FilterGroup label="Amenities">
            <div className="flex flex-wrap gap-2">
              {AMENITIES.map((a) => <button key={a.key} onClick={() => toggleAmenity(a.key)} className={`${chip(f.amenities.includes(a.key))} !text-xs`}>{a.label}</button>)}
            </div>
          </FilterGroup>

          <div className="space-y-3">
            <Toggle checked={f.verified} onChange={(v) => set('verified', v)} icon={<ShieldCheck className="h-4 w-4 text-teal-600" />} label="Drisya Verified only" />
            <Toggle checked={f.instantBook} onChange={(v) => set('instantBook', v)} icon={<Zap className="h-4 w-4 text-brand-500" />} label="Instant Book" />
          </div>
          <button onClick={() => setShowFilters(false)} className="btn-primary mt-6 w-full lg:hidden">Show {total} PGs</button>
        </aside>
        {showFilters && <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setShowFilters(false)} />}

        <main className="min-w-0 flex-1">
          <p className="mb-4 text-sm text-ink-500 dark:text-ink-400" aria-live="polite">
            {loading ? 'Searching…' : `${total} PG${total === 1 ? '' : 's'} found`}
            {f.q && !loading && <> for <span className="font-medium text-ink-800 dark:text-ink-200">"{f.q}"</span></>}
          </p>

          {error && (
            <div className="mb-6 flex items-center gap-3 rounded-2xl border border-danger/20 bg-danger/5 px-5 py-4 dark:border-red-800 dark:bg-red-950/40">
              <AlertCircle className="h-5 w-5 shrink-0 text-danger" />
              <p className="flex-1 text-sm text-danger dark:text-red-300">{error}</p>
              <button onClick={() => setRetry((k) => k + 1)} className="rounded-lg bg-danger px-4 py-1.5 text-xs font-semibold text-white hover:bg-danger/90">Retry</button>
            </div>
          )}

          {view === 'map' ? (
            <Suspense fallback={<div className="flex h-[70vh] items-center justify-center"><Spinner className="h-8 w-8 text-brand-500" /></div>}>
              <ListingsMap listings={listings} onSelect={(id) => navigate(`/listing/${id}`)} />
            </Suspense>
          ) : loading ? (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => <div key={i}><div className="skeleton aspect-[4/3] rounded-2xl" /><div className="skeleton mt-3 h-4 w-3/4 rounded" /></div>)}
            </div>
          ) : listings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <MapPin className="mb-4 h-16 w-16 text-ink-200 dark:text-ink-700" />
              <h3 className="mb-2 text-lg font-semibold text-ink-900 dark:text-ink-100">No PGs match your search</h3>
              <p className="mb-4 max-w-sm text-sm text-ink-500 dark:text-ink-400">Try removing a filter, or ask Drisya Expert to find one for you.</p>
              <div className="flex gap-3">
                <button onClick={clearFilters} className="btn-outline">Clear filters</button>
                <button onClick={() => navigate('/expert')} className="btn-primary">Ask an expert</button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">{listings.map((l, i) => <ListingCard key={l.id} listing={l} index={i} />)}</div>
              {page < pages && (
                <div className="mt-10 text-center">
                  <button onClick={loadMore} disabled={loadingMore} className="btn-outline">{loadingMore ? 'Loading…' : `Show more (${total - listings.length} left)`}</button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">{label}</p>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange, icon, label }: { checked: boolean; onChange: (v: boolean) => void; icon: React.ReactNode; label: string }) {
  return (
    <label className={`flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 transition ${checked ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30' : 'border-ink-200 bg-white hover:border-brand-300 dark:border-ink-700 dark:bg-ink-900'}`}>
      <span className="flex items-center gap-2 text-sm font-medium text-ink-700 dark:text-ink-300">{icon} {label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-brand-500" />
    </label>
  );
}
