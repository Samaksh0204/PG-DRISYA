import { useEffect, useRef, useState } from 'react';
import { Search, MapPin, Calendar, Users, ChevronDown } from 'lucide-react';
import { useApp } from '../context/AppContext';

export function SearchBar({ compact = false }: { compact?: boolean }) {
  const { navigate, cities } = useApp();
  const [city, setCity] = useState('');
  const [budget, setBudget] = useState('');
  const [gender, setGender] = useState('');
  const [date, setDate] = useState('');
  const [cityOpen, setCityOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setCityOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const search = () => {
    const params = new URLSearchParams();
    if (city) params.set('city', city);
    if (budget) params.set('budget', budget);
    if (gender) params.set('gender', gender);
    if (date) params.set('date', date);
    navigate(`/search?${params.toString()}`);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 rounded-full border border-ink-200 bg-white px-4 py-2.5 shadow-soft dark:border-ink-700 dark:bg-ink-900">
        <Search className="h-4 w-4 text-ink-400" />
        <input
          placeholder="Search by city, college, or locality"
          className="w-full bg-transparent text-sm outline-none placeholder-ink-400"
          onKeyDown={(e) => e.key === 'Enter' && search()}
          onChange={(e) => setCity(e.target.value)}
        />
        <button onClick={search} className="btn-primary px-4 py-1.5 text-xs">
          Search
        </button>
      </div>
    );
  }

  return (
    <div ref={ref} className="grid w-full grid-cols-1 gap-2 rounded-2xl bg-white p-2 shadow-card-hover sm:grid-cols-2 lg:grid-cols-5 dark:bg-ink-900">
      <div className="relative lg:col-span-2">
        <label className="absolute left-4 top-2 text-[10px] font-semibold uppercase tracking-wide text-ink-400">
          Location
        </label>
        <button
          onClick={() => setCityOpen((o) => !o)}
          className="flex w-full items-center gap-2 rounded-xl px-4 pb-2.5 pt-6 text-left text-sm hover:bg-ink-50 dark:hover:bg-ink-800"
        >
          <MapPin className="h-4 w-4 text-coral-500" />
          <span className={city ? 'text-ink-900 dark:text-ink-100' : 'text-ink-400'}>
            {city || 'Search by city, college, or locality'}
          </span>
        </button>
        {cityOpen && (
          <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-auto rounded-xl border border-ink-100 bg-white py-2 shadow-card-hover dark:border-ink-700 dark:bg-ink-900">
            {cities.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setCity(c.name);
                  setCityOpen(false);
                }}
                className="flex w-full items-center justify-between px-4 py-2 text-left text-sm hover:bg-ink-50 dark:hover:bg-ink-800"
              >
                <span className="font-medium text-ink-900 dark:text-ink-100">{c.name}</span>
                <span className="text-xs text-ink-400">{c.listingCount} listings</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative">
        <label className="absolute left-4 top-2 text-[10px] font-semibold uppercase tracking-wide text-ink-400">
          Budget
        </label>
        <select
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          className="w-full appearance-none rounded-xl px-4 pb-2.5 pt-6 text-sm text-ink-900 outline-none hover:bg-ink-50 dark:bg-ink-900 dark:text-ink-100 dark:hover:bg-ink-800"
        >
          <option value="">Any budget</option>
          <option value="5000">Under 5,000</option>
          <option value="8000">5,000-8,000</option>
          <option value="12000">8,000-12,000</option>
          <option value="15000">12,000+</option>
        </select>
        <ChevronDown className="pointer-events-none absolute right-4 top-6 h-4 w-4 text-ink-400" />
      </div>

      <div className="relative">
        <label className="absolute left-4 top-2 text-[10px] font-semibold uppercase tracking-wide text-ink-400">
          Gender
        </label>
        <select
          value={gender}
          onChange={(e) => setGender(e.target.value)}
          className="w-full appearance-none rounded-xl px-4 pb-2.5 pt-6 text-sm text-ink-900 outline-none hover:bg-ink-50 dark:bg-ink-900 dark:text-ink-100 dark:hover:bg-ink-800"
        >
          <option value="">Any</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="coed">Co-ed</option>
        </select>
        <Users className="pointer-events-none absolute right-4 top-6 h-4 w-4 text-ink-400" />
      </div>

      <div className="relative">
        <label className="absolute left-4 top-2 text-[10px] font-semibold uppercase tracking-wide text-ink-400">
          Move-in
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full rounded-xl px-4 pb-2.5 pt-6 text-sm text-ink-900 outline-none hover:bg-ink-50 dark:bg-ink-900 dark:text-ink-100 dark:hover:bg-ink-800"
        />
        <Calendar className="pointer-events-none absolute right-4 top-6 h-4 w-4 text-ink-400" />
      </div>

      <button
        onClick={search}
        className="btn-primary col-span-1 mt-1 h-[52px] w-full rounded-xl text-base sm:col-span-2 lg:col-span-1 lg:col-start-5"
      >
        <Search className="h-5 w-5" />
        Search
      </button>
    </div>
  );
}
