import { useState } from 'react';
import { Heart, MapPin, BedDouble, Users, ChevronLeft, ChevronRight, ShieldCheck, Crown, Zap } from 'lucide-react';
import type { PropertyListing } from '../types';
import { useApp } from '../context/AppContext';
import { VerifiedBadge, FeaturedBadge, InstantBookBadge, RatingBadge } from './Badges';

const genderLabel: Record<string, string> = { male: 'Male', female: 'Female', coed: 'Co-ed' };
const occupancyLabel: Record<string, string> = { single: 'Single', double: 'Double', triple: 'Triple', dorm: 'Dorm' };

export function ListingCard({ listing, index = 0 }: { listing: PropertyListing; index?: number }) {
  const { navigate, wishlist, toggleWishlist } = useApp();
  const [photoIdx, setPhotoIdx] = useState(0);
  const saved = wishlist.includes(listing.id);

  const next = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotoIdx((i) => (i + 1) % listing.photos.length);
  };
  const prev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotoIdx((i) => (i - 1 + listing.photos.length) % listing.photos.length);
  };

  return (
    <div
      className="group cursor-pointer animate-fade-in"
      style={{ animationDelay: `${index * 50}ms` }}
      onClick={() => navigate(`/listing/${listing.id}`)}
    >
      <div className="relative overflow-hidden rounded-2xl">
        <div className="aspect-[4/3] w-full overflow-hidden bg-ink-100 dark:bg-ink-800">
          <img
            src={listing.photos[photoIdx]}
            alt={listing.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>

        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {listing.featured && <FeaturedBadge />}
          {listing.verified && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-xs font-semibold text-teal-700 backdrop-blur-sm dark:bg-ink-900/80 dark:text-teal-300">
              <ShieldCheck className="h-3.5 w-3.5" />
              Verified
            </span>
          )}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleWishlist(listing.id);
          }}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm transition hover:scale-110 dark:bg-ink-900/80"
          aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
        >
          <Heart className={`h-5 w-5 transition ${saved ? 'fill-coral-500 text-coral-500' : 'text-ink-700 dark:text-ink-200'}`} />
        </button>

        {listing.photos.length > 1 && (
          <>
            <button onClick={prev} className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 opacity-0 backdrop-blur-sm transition group-hover:opacity-100 dark:bg-ink-900/80">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button onClick={next} className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 opacity-0 backdrop-blur-sm transition group-hover:opacity-100 dark:bg-ink-900/80">
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1">
              {listing.photos.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${i === photoIdx ? 'w-4 bg-white' : 'w-1.5 bg-white/50'}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="mt-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-ink-900 dark:text-ink-100">
              {listing.title}
            </h3>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-500 dark:text-ink-400">
              <MapPin className="h-3 w-3" />
              {listing.locality}, {listing.city}
            </p>
          </div>
          {listing.rating > 0 && <RatingBadge rating={listing.rating} count={listing.reviewCount} />}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-500 dark:text-ink-400">
          <span className="inline-flex items-center gap-1 rounded-md bg-ink-50 px-2 py-1 dark:bg-ink-800">
            <Users className="h-3 w-3" /> {genderLabel[listing.genderPreference]}
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-ink-50 px-2 py-1 dark:bg-ink-800">
            <BedDouble className="h-3 w-3" /> {occupancyLabel[listing.occupancy]}
          </span>
          {listing.instantBook && (
            <span className="inline-flex items-center gap-1 rounded-md bg-coral-50 px-2 py-1 font-medium text-coral-700 dark:bg-coral-900/30 dark:text-coral-300">
              <Zap className="h-3 w-3" /> Instant
            </span>
          )}
        </div>

        <div className="mt-2 flex items-end justify-between">
          <div>
            <span className="text-base font-bold text-ink-900 dark:text-ink-100">{listing.price.toLocaleString('en-IN')}</span>
            <span className="text-xs text-ink-500 dark:text-ink-400"> /month</span>
          </div>
          <span className="text-xs text-ink-400">{listing.distanceFromLandmark}</span>
        </div>
      </div>
    </div>
  );
}
