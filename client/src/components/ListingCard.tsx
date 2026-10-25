import { useState } from 'react';
import { Heart, MapPin, BedDouble, Users, ChevronLeft, ChevronRight, ShieldCheck, Zap, Star } from 'lucide-react';
import type { PropertyListing } from '../types';
import { useApp } from '../context/AppContext';
import { SafeImage } from './ui';
import { formatINR } from '../lib/format';
import { AMENITY_LABELS } from '../data/amenityIcons';

const genderLabel: Record<string, string> = { male: 'Men', female: 'Women', coed: 'Co-ed' };
const occupancyLabel: Record<string, string> = { single: 'Single room', double: 'Double sharing', triple: 'Triple sharing', dorm: 'Dorm' };

export function ListingCard({ listing, index = 0 }: { listing: PropertyListing; index?: number }) {
  const { navigate, wishlist, toggleWishlist } = useApp();
  const [photoIdx, setPhotoIdx] = useState(0);
  const [popped, setPopped] = useState(false);
  const saved = wishlist.includes(listing.id);
  const photos = listing.photos;
  const unavailable = listing.status !== 'active';
  const full = listing.roomsAvailable < 1;
  const open = (action = '') => navigate(`/listing/${listing.id}${action}`);

  const step = (e: React.MouseEvent, dir: 1 | -1) => {
    e.stopPropagation();
    setPhotoIdx((i) => (i + dir + photos.length) % photos.length);
  };

  return (
    <article
      className="card-interactive group flex h-full cursor-pointer flex-col overflow-hidden animate-fade-in"
      style={{ animationDelay: `${Math.min(index, 10) * 50}ms` }}
      onClick={() => open()}
      onKeyDown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) open(); }}
      tabIndex={0}
      aria-label={listing.title}
    >
      <div className="relative">
        <div className="aspect-[4/3] w-full overflow-hidden bg-ink-100 dark:bg-ink-800">
          <SafeImage src={photos[photoIdx]} alt={listing.title} width={480} className={`h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105 ${unavailable ? 'grayscale' : ''}`} />
        </div>

        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {unavailable && <span className="badge bg-ink-900/85 text-white">Not available</span>}
          {listing.featured && <span className="badge bg-warning text-ink-900">Featured</span>}
          {listing.verified && <span className="badge bg-white/95 text-brand-700 shadow-soft"><ShieldCheck className="h-3.5 w-3.5" /> Verified</span>}
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); setPopped(true); toggleWishlist(listing.id); }}
          onAnimationEnd={() => setPopped(false)}
          className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 shadow-soft transition hover:scale-110 dark:bg-ink-900/90"
          aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
          aria-pressed={saved}
        >
          <Heart className={`h-5 w-5 transition ${popped ? 'animate-pop' : ''} ${saved ? 'fill-danger text-danger' : 'text-ink-700 dark:text-ink-200'}`} />
        </button>

        {photos.length > 1 && (
          <>
            <button onClick={(e) => step(e, -1)} aria-label="Previous photo" className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 opacity-0 shadow-soft transition group-hover:opacity-100 focus-visible:opacity-100 dark:bg-ink-900/90">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button onClick={(e) => step(e, 1)} aria-label="Next photo" className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 opacity-0 shadow-soft transition group-hover:opacity-100 focus-visible:opacity-100 dark:bg-ink-900/90">
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1">
              {photos.slice(0, 8).map((_, i) => <span key={i} className={`h-1.5 rounded-full transition-all ${i === photoIdx ? 'w-4 bg-white' : 'w-1.5 bg-white/60'}`} />)}
            </div>
          </>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 text-base font-semibold text-ink-900 transition group-hover:text-brand-700 dark:text-white">{listing.title}</h3>
          {listing.reviewCount > 0 ? (
            <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-ink-900 dark:text-white">
              <Star className="h-4 w-4 fill-warning text-warning" /> {listing.rating.toFixed(1)} <span className="font-normal text-ink-500">({listing.reviewCount})</span>
            </span>
          ) : <span className="badge shrink-0 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">New</span>}
        </div>
        <p className="mt-1 flex items-center gap-1 text-sm text-ink-500 dark:text-ink-300">
          <MapPin className="h-3.5 w-3.5 shrink-0" /> <span className="line-clamp-1">{[listing.locality, listing.city].filter(Boolean).join(', ')}</span>
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
          <span className="badge bg-ink-50 font-medium text-ink-700 dark:bg-ink-800 dark:text-ink-200"><BedDouble className="h-3.5 w-3.5" /> {occupancyLabel[listing.occupancy]}</span>
          <span className="badge bg-ink-50 font-medium text-ink-700 dark:bg-ink-800 dark:text-ink-200"><Users className="h-3.5 w-3.5" /> {genderLabel[listing.genderPreference]}</span>
          {listing.amenities.slice(0, 2).map((a) => (
            <span key={a} className="badge bg-ink-50 font-medium text-ink-700 dark:bg-ink-800 dark:text-ink-200">{AMENITY_LABELS[a] || a}</span>
          ))}
          {listing.amenities.length > 2 && <span className="badge bg-ink-50 font-medium text-ink-500 dark:bg-ink-800">+{listing.amenities.length - 2}</span>}
        </div>

        <div className="mt-auto pt-4">
          <div className="flex items-end justify-between gap-2">
            <p>
              <span className="text-xl font-bold text-ink-900 dark:text-white">{formatINR(listing.price)}</span>
              <span className="text-sm text-ink-500"> /month</span>
            </p>
            {listing.instantBook && !full ? (
              <span className="badge bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"><Zap className="h-3 w-3" /> Instant Book</span>
            ) : full && !unavailable ? <span className="badge bg-ink-100 text-ink-600">Full</span> : listing.roomsAvailable > 0 && !unavailable ? (
              <span className="text-xs font-medium text-success">{listing.roomsAvailable} room{listing.roomsAvailable > 1 ? 's' : ''} free</span>
            ) : null}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={(e) => { e.stopPropagation(); open(); }} className="btn-outline !px-3 !py-2 text-sm">View details</button>
            <button onClick={(e) => { e.stopPropagation(); open('?action=book'); }} disabled={unavailable || full} className="btn-primary !px-3 !py-2 text-sm">Book now</button>
          </div>
        </div>
      </div>
    </article>
  );
}
