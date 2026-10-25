import { useState } from 'react';
import { Search, MapPin, Users, Wallet } from 'lucide-react';
import { useApp } from '../context/AppContext';

// Free-text search across city, locality, title and description, with city suggestions.
export function SearchBar({ compact = false }: { compact?: boolean }) {
  const { navigate, cities } = useApp();
  const [q, setQ] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [gender, setGender] = useState('');

  const search = () => {
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (maxPrice) params.set('maxPrice', maxPrice);
    if (gender) params.set('gender', gender);
    navigate(`/search${params.toString() ? `?${params}` : ''}`);
  };

  const onKey = (e: React.KeyboardEvent) => e.key === 'Enter' && search();

  if (compact) {
    return (
      <div className="flex items-center gap-2 rounded-full border border-ink-200 bg-ink-50 px-4 py-1.5 transition focus-within:border-brand-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-brand-500/15 dark:border-ink-700 dark:bg-ink-900">
        <Search className="h-4 w-4 text-ink-400" />
        <input
          aria-label="Search PGs"
          placeholder="City, locality or college"
          className="w-full bg-transparent text-sm outline-none placeholder:text-ink-400"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKey}
        />
        <button onClick={search} className="btn-primary !min-h-0 rounded-full px-4 py-1.5 text-xs">Search</button>
      </div>
    );
  }

  return (
    <div className="grid w-full grid-cols-1 gap-1 rounded-2xl border border-ink-200 bg-white p-2 shadow-card-hover sm:grid-cols-2 lg:grid-cols-5 lg:divide-x lg:divide-ink-100 dark:border-ink-700 dark:bg-ink-900 dark:divide-ink-800">
      <label className="relative block rounded-xl transition focus-within:bg-brand-50/70 dark:focus-within:bg-ink-800 lg:col-span-2">
        <span className="absolute left-11 top-2 text-[10px] font-semibold uppercase tracking-wide text-ink-400">Where</span>
        <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-500" />
        <input
          list="city-suggestions"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKey}
          placeholder="City, locality or college"
          className="w-full rounded-xl bg-transparent pb-2.5 pl-11 pr-4 pt-6 text-sm text-ink-900 outline-none placeholder:text-ink-400 outline-none hover:bg-ink-50/70 dark:text-ink-100 dark:hover:bg-ink-800"
        />
        <datalist id="city-suggestions">
          {cities.map((c) => <option key={c.id} value={c.name}>{`${c.listingCount} PGs`}</option>)}
        </datalist>
      </label>

      <label className="relative block rounded-xl transition focus-within:bg-brand-50/70 dark:focus-within:bg-ink-800">
        <span className="absolute left-11 top-2 text-[10px] font-semibold uppercase tracking-wide text-ink-400">Max budget</span>
        <Wallet className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <select value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="w-full appearance-none rounded-xl bg-transparent pb-2.5 pl-11 pr-4 pt-6 text-sm text-ink-900 outline-none hover:bg-ink-50 dark:bg-ink-900 dark:text-ink-100 dark:hover:bg-ink-800">
          <option value="">Any budget</option>
          <option value="5000">Up to ₹5,000</option>
          <option value="8000">Up to ₹8,000</option>
          <option value="12000">Up to ₹12,000</option>
          <option value="20000">Up to ₹20,000</option>
        </select>
      </label>

      <label className="relative block rounded-xl transition focus-within:bg-brand-50/70 dark:focus-within:bg-ink-800">
        <span className="absolute left-11 top-2 text-[10px] font-semibold uppercase tracking-wide text-ink-400">For</span>
        <Users className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <select value={gender} onChange={(e) => setGender(e.target.value)} className="w-full appearance-none rounded-xl bg-transparent pb-2.5 pl-11 pr-4 pt-6 text-sm text-ink-900 outline-none hover:bg-ink-50 dark:bg-ink-900 dark:text-ink-100 dark:hover:bg-ink-800">
          <option value="">Anyone</option>
          <option value="male">Men</option>
          <option value="female">Women</option>
          <option value="coed">Co-ed</option>
        </select>
      </label>

      <button onClick={search} className="btn-primary h-[52px] w-full rounded-xl text-base lg:ml-1">
        <Search className="h-5 w-5" /> Search
      </button>
    </div>
  );
}
