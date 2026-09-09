import { useEffect, useMemo, useRef, useState } from 'react';
import { Map as MapIcon, List, SlidersHorizontal, X, MapPin, Crown, Info, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ListingCard } from '../components/ListingCard';
import { AMENITIES } from '../data/amenities';
import { fetchListings } from '../lib/api';
import { useDebounce } from '../hooks/useDebounce';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import type { GenderPreference, OccupancyType, PropertyListing } from '../types';

declare const L: any;

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'newest', label: 'Newest First' },
];

// ── City center coordinates for map defaults ─────
const CITY_CENTERS: Record<string, [number, number]> = {
  pune: [18.5204, 73.8567],
  indore: [22.7196, 75.8577],
  jaipur: [26.9124, 75.7873],
  mumbai: [19.076, 72.8777],
  bangalore: [12.9716, 77.5946],
  delhi: [28.6139, 77.209],
  hyderabad: [17.385, 78.4867],
  chennai: [13.0827, 80.2707],
};

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function MapView({ listings, navigate }: { listings: PropertyListing[]; navigate: (to: string) => void }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || typeof L === 'undefined') return;

    // Destroy existing map if any
    if (mapInstance.current) {
      mapInstance.current.remove();
      mapInstance.current = null;
    }

    // Determine center: use first listing with coords, else first matching city, else India center
    const withCoords = listings.filter((l) => l.lat && l.lng);
    let center: [number, number] = [20.5937, 78.9629]; // India center
    let zoom = 5;

    if (withCoords.length > 0) {
      center = [withCoords[0].lat, withCoords[0].lng];
      zoom = 12;
    } else if (listings.length > 0) {
      const cityKey = listings[0].city.toLowerCase();
      if (CITY_CENTERS[cityKey]) {
        center = CITY_CENTERS[cityKey];
        zoom = 12;
      }
    }

    const map = L.map(mapRef.current).setView(center, zoom);
    mapInstance.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // Custom coral marker icon
    const markerIcon = L.divIcon({
      className: 'custom-marker',
      html: `<div style="background:#ff4d3d;color:white;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;box-shadow:0 2px 8px rgba(0,0,0,0.3);border:2px solid white;">PG</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32],
    });

    const bounds: [number, number][] = [];

    withCoords.forEach((listing) => {
      const marker = L.marker([listing.lat, listing.lng], { icon: markerIcon }).addTo(map);
      bounds.push([listing.lat, listing.lng]);

      const photo = listing.photos[0] || '';
      const photoHtml = photo
        ? `<img src="${photo}" style="width:100%;height:100px;object-fit:cover;border-radius:8px 8px 0 0;" />`
        : '';

      marker.bindPopup(
        `<div style="width:200px;font-family:Inter,sans-serif;">
          ${photoHtml}
          <div style="padding:8px;">
            <div style="font-weight:600;font-size:13px;margin-bottom:4px;">${escHtml(listing.title)}</div>
            <div style="font-size:12px;color:#666;margin-bottom:4px;">${escHtml(listing.locality)}, ${escHtml(listing.city)}</div>
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span style="font-weight:700;color:#ff4d3d;">₹${listing.price.toLocaleString()}/mo</span>
              <span style="font-size:11px;">⭐ ${listing.rating}</span>
            </div>
            <button onclick="window.location.hash='/listing/${listing.id}'" style="width:100%;margin-top:8px;padding:6px;background:#ff4d3d;color:white;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;">View Details</button>
          </div>
        </div>`,
        { maxWidth: 220 }
      );
    });

    // Fit bounds if multiple markers
    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [40, 40] });
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [listings, navigate]);

  const withCoords = listings.filter((l) => l.lat && l.lng);

  return (
    <div className="relative">
      <div ref={mapRef} className="h-[70vh] rounded-2xl border border-ink-200 dark:border-ink-700" style={{ zIndex: 1 }} />
      {withCoords.length === 0 && listings.length > 0 && (
        <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/80 dark:bg-ink-900/80" style={{ zIndex: 2 }}>
          <div className="text-center">
            <MapPin className="mx-auto mb-3 h-12 w-12 text-ink-300 dark:text-ink-600" />
            <p className="text-ink-500 dark:text-ink-400">Listings found, but no location data available</p>
            <p className="mt-1 text-xs text-ink-400 dark:text-ink-500">Owners can add coordinates when creating listings.</p>
          </div>
        </div>
      )}
      {withCoords.length > 0 && (
        <div className="absolute bottom-4 left-4 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-ink-600 shadow-lg dark:bg-ink-800 dark:text-ink-300" style={{ zIndex: 2 }}>
          {withCoords.length} of {listings.length} PGs shown on map
        </div>
      )}
    </div>
  );
}

export function SearchPage() {
  useDocumentTitle('Search PGs', 'Search and compare verified PG accommodations with filters for city, price, amenities, and more.');
  const { route, navigate } = useApp();
  const [listings, setListings] = useState<PropertyListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fetchKey, setFetchKey] = useState(0);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [showFilters, setShowFilters] = useState(false);

  const [city, setCity] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [gender, setGender] = useState<GenderPreference | ''>('');
  const [occupancy, setOccupancy] = useState<OccupancyType | ''>('');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [instantBook, setInstantBook] = useState(false);
  const [sortBy, setSortBy] = useState('relevance');

  const debouncedCity = useDebounce(city, 300);
  const debouncedMinPrice = useDebounce(minPrice, 400);
  const debouncedMaxPrice = useDebounce(maxPrice, 400);

  useEffect(() => {
    const qs = route.includes('?') ? route.split('?')[1] : '';
    const params = new URLSearchParams(qs);
    if (params.get('city')) setCity(params.get('city')!);
    if (params.get('gender')) setGender(params.get('gender') as GenderPreference);
    if (params.get('budget')) setMaxPrice(params.get('budget')!);
    if (params.get('featured')) setVerifiedOnly(true);
  }, [route]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');

    (async () => {
      try {
        const params: Record<string, string> = {};
        if (debouncedCity) params.city = debouncedCity;
        if (gender) params.gender = gender;
        if (occupancy) params.occupancy = occupancy;
        if (verifiedOnly) params.verified = 'true';
        if (instantBook) params.instantBook = 'true';
        if (debouncedMinPrice) params.minPrice = debouncedMinPrice;
        if (debouncedMaxPrice) params.maxPrice = debouncedMaxPrice;

        const data = await fetchListings(params);
        if (mounted) setListings(data);
      } catch (err) {
        console.error('Failed to load listings:', err);
        if (mounted) setError('Could not load listings. Please try again.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [debouncedCity, gender, occupancy, verifiedOnly, instantBook, debouncedMinPrice, debouncedMaxPrice, fetchKey]);

  const filtered = useMemo(() => {
    let result = [...listings];
    if (selectedAmenities.length > 0) {
      result = result.filter((l) => selectedAmenities.every((a) => l.amenities.includes(a)));
    }
    switch (sortBy) {
      case 'price_low': result.sort((a, b) => a.price - b.price); break;
      case 'price_high': result.sort((a, b) => b.price - a.price); break;
      case 'rating': result.sort((a, b) => b.rating - a.rating); break;
      case 'newest': result.sort((a, b) => new Date(b.moveInDate).getTime() - new Date(a.moveInDate).getTime()); break;
    }
    return result;
  }, [listings, selectedAmenities, sortBy]);

  const toggleAmenity = (key: string) => {
    setSelectedAmenities((prev) => prev.includes(key) ? prev.filter((a) => a !== key) : [...prev, key]);
  };

  const clearFilters = () => {
    setCity(''); setMinPrice(''); setMaxPrice(''); setGender(''); setOccupancy('');
    setSelectedAmenities([]); setVerifiedOnly(false); setInstantBook(false); setSortBy('relevance');
  };

  const activeFilterCount = [city, gender, occupancy, minPrice, maxPrice, verifiedOnly ? 'y' : '', instantBook ? 'y' : '', ...selectedAmenities].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-ink-50 pt-20 dark:bg-ink-950">
      <div className="sticky top-16 z-20 border-b border-ink-100 bg-white/80 backdrop-blur-xl dark:border-ink-800 dark:bg-ink-900/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowFilters((s) => !s)} className="inline-flex items-center gap-2 rounded-xl border border-ink-200 px-4 py-2 text-sm font-medium text-ink-700 transition hover:bg-ink-50 dark:border-ink-700 dark:text-ink-300 dark:hover:bg-ink-800">
              <SlidersHorizontal className="h-4 w-4" /> Filters
              {activeFilterCount > 0 && <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-coral-500 text-[10px] font-bold text-white">{activeFilterCount}</span>}
            </button>
            {activeFilterCount > 0 && <button onClick={clearFilters} className="text-xs font-medium text-coral-600 underline decoration-coral-300 transition hover:text-coral-700">Clear all</button>}
          </div>
          <div className="flex items-center gap-3">
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-ink-700 outline-none dark:border-ink-700 dark:bg-ink-900 dark:text-ink-300">
              {SORT_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
            <div className="flex rounded-xl border border-ink-200 dark:border-ink-700">
              <button onClick={() => setViewMode('list')} className={`rounded-l-xl px-3 py-2 transition ${viewMode === 'list' ? 'bg-ink-900 text-white dark:bg-ink-100 dark:text-ink-900' : 'text-ink-500 hover:bg-ink-50 dark:hover:bg-ink-800'}`}><List className="h-4 w-4" /></button>
              <button onClick={() => setViewMode('map')} className={`rounded-r-xl px-3 py-2 transition ${viewMode === 'map' ? 'bg-ink-900 text-white dark:bg-ink-100 dark:text-ink-900' : 'text-ink-500 hover:bg-ink-50 dark:hover:bg-ink-800'}`}><MapIcon className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
        <aside className={`${showFilters ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} fixed inset-y-0 left-0 z-30 w-80 overflow-y-auto border-r border-ink-100 bg-white p-6 transition-transform lg:static lg:block lg:w-72 lg:flex-shrink-0 lg:rounded-2xl lg:border lg:shadow-soft dark:border-ink-800 dark:bg-ink-900`}>
          <div className="mb-6 flex items-center justify-between lg:hidden">
            <h3 className="text-lg font-semibold text-ink-900 dark:text-ink-100">Filters</h3>
            <button onClick={() => setShowFilters(false)} className="rounded-lg p-1 hover:bg-ink-100 dark:hover:bg-ink-800"><X className="h-5 w-5" /></button>
          </div>

          <div className="mb-6">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-ink-400">City</label>
            <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Pune" className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-coral-400 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-100" />
          </div>

          <div className="mb-6">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-ink-400">Price Range</label>
            <div className="flex items-center gap-2">
              <input type="number" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="Min" className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-coral-400 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-100" />
              <span className="text-ink-400">-</span>
              <input type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="Max" className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-coral-400 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-100" />
            </div>
          </div>

          <div className="mb-6">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-ink-400">Gender</label>
            <div className="flex flex-wrap gap-2">
              {([{ value: '' as const, label: 'All' }, { value: 'male' as GenderPreference, label: 'Male' }, { value: 'female' as GenderPreference, label: 'Female' }, { value: 'coed' as GenderPreference, label: 'Co-ed' }]).map((opt) => (
                <button key={opt.value} onClick={() => setGender(opt.value)} className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${gender === opt.value ? 'bg-coral-500 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300 dark:hover:bg-ink-700'}`}>{opt.label}</button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-ink-400">Room Type</label>
            <div className="flex flex-wrap gap-2">
              {([{ value: '' as const, label: 'All' }, { value: 'single' as OccupancyType, label: 'Single' }, { value: 'double' as OccupancyType, label: 'Double' }, { value: 'triple' as OccupancyType, label: 'Triple' }, { value: 'dorm' as OccupancyType, label: 'Dorm' }]).map((opt) => (
                <button key={opt.value} onClick={() => setOccupancy(opt.value)} className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${occupancy === opt.value ? 'bg-coral-500 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300 dark:hover:bg-ink-700'}`}>{opt.label}</button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-ink-400">Amenities</label>
            <div className="flex flex-wrap gap-2">
              {AMENITIES.map((amenity) => (
                <button key={amenity.key} onClick={() => toggleAmenity(amenity.key)} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${selectedAmenities.includes(amenity.key) ? 'bg-coral-500 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300 dark:hover:bg-ink-700'}`}>{amenity.label}</button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="flex cursor-pointer items-center justify-between rounded-xl bg-ink-50 px-4 py-3 dark:bg-ink-800">
              <span className="flex items-center gap-2 text-sm font-medium text-ink-700 dark:text-ink-300"><Crown className="h-4 w-4 text-amber-500" /> Verified only</span>
              <input type="checkbox" checked={verifiedOnly} onChange={(e) => setVerifiedOnly(e.target.checked)} className="h-4 w-4 rounded border-ink-300 text-coral-500 focus:ring-coral-400" />
            </label>
            <label className="flex cursor-pointer items-center justify-between rounded-xl bg-ink-50 px-4 py-3 dark:bg-ink-800">
              <span className="flex items-center gap-2 text-sm font-medium text-ink-700 dark:text-ink-300"><Info className="h-4 w-4 text-coral-500" /> Instant Book</span>
              <input type="checkbox" checked={instantBook} onChange={(e) => setInstantBook(e.target.checked)} className="h-4 w-4 rounded border-ink-300 text-coral-500 focus:ring-coral-400" />
            </label>
          </div>
        </aside>

        {showFilters && <div className="fixed inset-0 z-20 bg-black/40 lg:hidden" onClick={() => setShowFilters(false)} />}

        <main className="flex-1">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-ink-500 dark:text-ink-400">
              {loading ? 'Searching...' : `${filtered.length} PG${filtered.length !== 1 ? 's' : ''} found`}
              {city && <span className="ml-1">in <span className="font-medium text-ink-700 dark:text-ink-200">{city}</span></span>}
            </p>
          </div>

          {error && (
            <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 dark:border-red-800 dark:bg-red-950/40">
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500" />
              <p className="flex-1 text-sm text-red-700 dark:text-red-300">{error}</p>
              <button onClick={() => setFetchKey((k) => k + 1)} className="rounded-lg bg-red-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700">Retry</button>
            </div>
          )}

          {viewMode === 'map' ? (
            <MapView listings={filtered} navigate={navigate} />
          ) : loading ? (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-[4/3] rounded-2xl bg-ink-200 dark:bg-ink-800" />
                  <div className="mt-3 space-y-2"><div className="h-4 w-3/4 rounded bg-ink-200 dark:bg-ink-800" /><div className="h-3 w-1/2 rounded bg-ink-200 dark:bg-ink-800" /></div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <MapPin className="mb-4 h-16 w-16 text-ink-200 dark:text-ink-700" />
              <h3 className="mb-2 text-lg font-semibold text-ink-900 dark:text-ink-100">No PGs found</h3>
              <p className="mb-4 max-w-sm text-sm text-ink-500 dark:text-ink-400">Try adjusting your filters or searching in a different city.</p>
              <button onClick={clearFilters} className="btn-primary px-6 py-2.5 text-sm">Clear all filters</button>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((listing, i) => <ListingCard key={listing.id} listing={listing} index={i} />)}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
