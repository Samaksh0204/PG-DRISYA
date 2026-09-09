import { useEffect, useState } from 'react';
import {
  ChevronLeft, ChevronRight, MapPin, Share, Heart, ShieldCheck, Crown, Star,
  Wifi, Utensils, Snowflake, WashingMachine, Cctv, Zap, Car, Droplets,
  CookingPot, BookOpen, Dumbbell, Tv, Stethoscope, Sparkles, Thermometer, Shirt,
  Calendar, MessageCircle, Phone, Mail, ArrowLeft, CheckCircle2, Camera, Play, X, AlertCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { fetchListingDetail, fetchListings, sendMessage, scheduleVisit } from '../lib/api';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { ListingCard } from '../components/ListingCard';
import { VerifiedBadge, RatingBadge, ResponseRateBadge } from '../components/Badges';
import type { PropertyListing, Review, Owner } from '../types';

const AMENITY_ICONS: Record<string, React.ElementType> = {
  wifi: Wifi,
  mess: Utensils,
  ac: Snowflake,
  laundry: WashingMachine,
  cctv: Cctv,
  power: Zap,
  parking: Car,
  hotwater: Droplets,
  kitchen: CookingPot,
  study: BookOpen,
  gym: Dumbbell,
  tv: Tv,
  medical: Stethoscope,
  housekeeping: Sparkles,
  geyser: Thermometer,
  wardrobe: Shirt,
};

const AMENITY_LABELS: Record<string, string> = {
  wifi: 'Wi-Fi',
  mess: 'Mess / Meals',
  ac: 'Air Conditioning',
  laundry: 'Laundry',
  cctv: 'CCTV Security',
  power: 'Power Backup',
  parking: 'Parking',
  hotwater: '24x7 Hot Water',
  kitchen: 'Shared Kitchen',
  study: 'Study Desk',
  gym: 'Gym',
  tv: 'Common TV',
  medical: 'Medical Kit',
  housekeeping: 'Housekeeping',
  geyser: 'Geyser',
  wardrobe: 'Wardrobe',
};

const genderLabel: Record<string, string> = { male: 'Male Only', female: 'Female Only', coed: 'Co-ed' };
const occupancyLabel: Record<string, string> = { single: 'Single Occupancy', double: 'Double Sharing', triple: 'Triple Sharing', dorm: 'Dormitory' };

const TIME_SLOTS = [
  '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
  '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM',
];

export function ListingDetailPage() {
  const { route, navigate, wishlist, toggleWishlist, auth } = useApp();
  const listingId = route.split('/listing/')[1]?.split('?')[0] || '';

  const [listing, setListing] = useState<PropertyListing | null>(null);
  const [owner, setOwner] = useState<Owner | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [similar, setSimilar] = useState<PropertyListing[]>([]);
  const [loading, setLoading] = useState(true);
  useDocumentTitle(
    listing ? `${listing.title} — ₹${listing.price.toLocaleString()}/mo in ${listing.city}` : 'Loading...',
    listing ? `${listing.title} in ${listing.locality}, ${listing.city}. ${listing.occupancy} occupancy, ₹${listing.price.toLocaleString()}/month. ${listing.amenities.slice(0, 5).join(', ')}.` : undefined,
  );
  const [photoIdx, setPhotoIdx] = useState(0);
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [showAllAmenities, setShowAllAmenities] = useState(false);

  // Message modal state
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [messageSending, setMessageSending] = useState(false);
  const [messageSent, setMessageSent] = useState(false);

  // Visit modal state
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [visitBooking, setVisitBooking] = useState(false);
  const [visitBooked, setVisitBooked] = useState(false);

  const saved = listing ? wishlist.includes(listing.id) : false;

  useEffect(() => {
    if (!listingId) return;
    let mounted = true;
    setLoading(true);
    setPhotoIdx(0);
    setShowAllPhotos(false);

    (async () => {
      try {
        const detail = await fetchListingDetail(listingId);
        if (!mounted || !detail) {
          if (mounted) setLoading(false);
          return;
        }
        setListing(detail.property);
        setOwner(detail.owner);
        setReviews(detail.reviews);

        // Fetch similar listings in same city
        const similarData = await fetchListings({ city: detail.property.city });
        if (mounted) {
          setSimilar(similarData.filter((l) => l.id !== detail.property.id).slice(0, 4));
        }
      } catch (err) {
        console.error('Failed to load listing:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [listingId]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !listing) return;
    setMessageSending(true);
    try {
      await sendMessage({
        propertyId: listing.id,
        receiverId: listing.ownerId,
        text: messageText.trim(),
      });
      setMessageSent(true);
      setMessageText('');
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setMessageSending(false);
    }
  };

  const handleScheduleVisit = async () => {
    if (!selectedDate || !selectedSlot || !listing) return;
    setVisitBooking(true);
    try {
      await scheduleVisit({
        propertyId: listing.id,
        date: selectedDate,
        timeSlot: selectedSlot,
      });
      setVisitBooked(true);
    } catch (err) {
      console.error('Failed to schedule visit:', err);
    } finally {
      setVisitBooking(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: listing?.title,
          url: window.location.href,
        });
      } catch {
        // user cancelled
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const nextPhoto = () => {
    if (!listing) return;
    setPhotoIdx((i) => (i + 1) % listing.photos.length);
  };
  const prevPhoto = () => {
    if (!listing) return;
    setPhotoIdx((i) => (i - 1 + listing.photos.length) % listing.photos.length);
  };

  // Get upcoming dates for visit scheduling
  const getUpcomingDates = () => {
    const dates: string[] = [];
    const today = new Date();
    for (let i = 1; i <= 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white pt-20 dark:bg-ink-950">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="animate-pulse">
            <div className="mb-6 h-8 w-1/3 rounded bg-ink-100 dark:bg-ink-800" />
            <div className="aspect-[16/9] rounded-2xl bg-ink-100 dark:bg-ink-800" />
            <div className="mt-8 grid gap-8 lg:grid-cols-3">
              <div className="space-y-4 lg:col-span-2">
                <div className="h-6 w-2/3 rounded bg-ink-100 dark:bg-ink-800" />
                <div className="h-4 w-1/2 rounded bg-ink-100 dark:bg-ink-800" />
                <div className="h-32 rounded-xl bg-ink-100 dark:bg-ink-800" />
              </div>
              <div className="h-64 rounded-2xl bg-ink-100 dark:bg-ink-800" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white pt-20 dark:bg-ink-950">
        <AlertCircle className="mb-4 h-16 w-16 text-ink-300 dark:text-ink-600" />
        <h2 className="mb-2 text-xl font-semibold text-ink-900 dark:text-ink-100">Listing not found</h2>
        <p className="mb-6 text-ink-500 dark:text-ink-400">This listing may have been removed or doesn't exist.</p>
        <button onClick={() => navigate('/search')} className="btn-primary px-6 py-2.5">
          Browse PGs
        </button>
      </div>
    );
  }

  const displayedAmenities = showAllAmenities ? listing.amenities : listing.amenities.slice(0, 8);

  return (
    <div className="min-h-screen bg-white pt-20 dark:bg-ink-950">
      {/* Back Nav */}
      <div className="mx-auto max-w-7xl px-4 py-4">
        <button
          onClick={() => navigate('/search')}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 transition hover:text-ink-900 dark:text-ink-400 dark:hover:text-ink-100"
        >
          <ArrowLeft className="h-4 w-4" /> Back to search
        </button>
      </div>

      {/* Photo Gallery */}
      <div className="mx-auto max-w-7xl px-4">
        <div className="relative overflow-hidden rounded-2xl">
          {showAllPhotos ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {listing.photos.map((photo, i) => (
                <div
                  key={i}
                  className="aspect-[4/3] cursor-pointer overflow-hidden rounded-xl"
                  onClick={() => { setPhotoIdx(i); setShowAllPhotos(false); }}
                >
                  <img src={photo} alt={`${listing.title} - ${i + 1}`} className="h-full w-full object-cover transition-transform hover:scale-105" />
                </div>
              ))}
            </div>
          ) : (
            <div className="relative">
              <div className="aspect-[16/9] w-full overflow-hidden bg-ink-100 sm:aspect-[2.2/1] dark:bg-ink-800">
                <img
                  src={listing.photos[photoIdx]}
                  alt={listing.title}
                  className="h-full w-full object-cover"
                />
              </div>

              {/* Navigation arrows */}
              {listing.photos.length > 1 && (
                <>
                  <button
                    onClick={prevPhoto}
                    className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur-sm transition hover:bg-white dark:bg-ink-900/80"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={nextPhoto}
                    className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur-sm transition hover:bg-white dark:bg-ink-900/80"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}

              {/* Photo dots */}
              {listing.photos.length > 1 && (
                <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
                  {listing.photos.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPhotoIdx(i)}
                      className={`h-2 rounded-full transition-all ${i === photoIdx ? 'w-6 bg-white' : 'w-2 bg-white/50'}`}
                    />
                  ))}
                </div>
              )}

              {/* Top actions */}
              <div className="absolute right-4 top-4 flex gap-2">
                <button
                  onClick={handleShare}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm transition hover:bg-white dark:bg-ink-900/80"
                >
                  <Share className="h-5 w-5 text-ink-700 dark:text-ink-200" />
                </button>
                <button
                  onClick={() => toggleWishlist(listing.id)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm transition hover:bg-white dark:bg-ink-900/80"
                >
                  <Heart className={`h-5 w-5 ${saved ? 'fill-coral-500 text-coral-500' : 'text-ink-700 dark:text-ink-200'}`} />
                </button>
              </div>

              {/* Badges */}
              <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                {listing.verified && <VerifiedBadge size="md" />}
                {listing.featured && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 backdrop-blur-sm dark:bg-amber-900/30 dark:text-amber-300">
                    <Crown className="h-3.5 w-3.5" /> Featured
                  </span>
                )}
                {listing.virtualTour && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-ink-700 backdrop-blur-sm dark:bg-ink-900/80 dark:text-ink-200">
                    <Play className="h-3.5 w-3.5" /> Virtual Tour
                  </span>
                )}
              </div>

              {/* Show all photos */}
              {listing.photos.length > 1 && (
                <button
                  onClick={() => setShowAllPhotos(true)}
                  className="absolute bottom-4 right-4 inline-flex items-center gap-1.5 rounded-lg bg-white/90 px-3 py-2 text-xs font-medium backdrop-blur-sm transition hover:bg-white dark:bg-ink-900/80"
                >
                  <Camera className="h-3.5 w-3.5" /> Show all {listing.photos.length} photos
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Title & Location */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-ink-900 dark:text-ink-100 sm:text-3xl">
                {listing.title}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-ink-500 dark:text-ink-400">
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" /> {listing.locality}, {listing.city}
                </span>
                {listing.distanceFromLandmark && (
                  <span className="text-ink-400">· {listing.distanceFromLandmark}</span>
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                {listing.rating > 0 && <RatingBadge rating={listing.rating} count={listing.reviewCount} size="md" />}
                {listing.instantBook && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-coral-50 px-2.5 py-1 text-xs font-semibold text-coral-700 dark:bg-coral-900/30 dark:text-coral-300">
                    <Zap className="h-3.5 w-3.5" /> Instant Book
                  </span>
                )}
              </div>
            </div>

            {/* Key Details */}
            <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-ink-100 p-4 text-center dark:border-ink-800">
                <div className="text-xs font-medium text-ink-400">Gender</div>
                <div className="mt-1 text-sm font-semibold text-ink-900 dark:text-ink-100">{genderLabel[listing.genderPreference]}</div>
              </div>
              <div className="rounded-xl border border-ink-100 p-4 text-center dark:border-ink-800">
                <div className="text-xs font-medium text-ink-400">Room Type</div>
                <div className="mt-1 text-sm font-semibold text-ink-900 dark:text-ink-100">{occupancyLabel[listing.occupancy]}</div>
              </div>
              <div className="rounded-xl border border-ink-100 p-4 text-center dark:border-ink-800">
                <div className="text-xs font-medium text-ink-400">Deposit</div>
                <div className="mt-1 text-sm font-semibold text-ink-900 dark:text-ink-100">
                  {listing.deposit > 0 ? `₹${listing.deposit.toLocaleString('en-IN')}` : 'None'}
                </div>
              </div>
              <div className="rounded-xl border border-ink-100 p-4 text-center dark:border-ink-800">
                <div className="text-xs font-medium text-ink-400">Available</div>
                <div className="mt-1 text-sm font-semibold text-ink-900 dark:text-ink-100">
                  {listing.moveInDate ? new Date(listing.moveInDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : 'Immediate'}
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="mb-8">
              <h2 className="mb-3 text-lg font-semibold text-ink-900 dark:text-ink-100">About this PG</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-ink-600 dark:text-ink-300">
                {listing.description || 'No description provided.'}
              </p>
            </div>

            {/* Amenities */}
            <div className="mb-8">
              <h2 className="mb-4 text-lg font-semibold text-ink-900 dark:text-ink-100">Amenities</h2>
              {listing.amenities.length === 0 ? (
                <p className="text-sm text-ink-500 dark:text-ink-400">No amenities listed.</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {displayedAmenities.map((key) => {
                      const Icon = AMENITY_ICONS[key] || CheckCircle2;
                      const label = AMENITY_LABELS[key] || key;
                      return (
                        <div
                          key={key}
                          className="flex items-center gap-3 rounded-xl border border-ink-100 px-4 py-3 dark:border-ink-800"
                        >
                          <Icon className="h-5 w-5 flex-shrink-0 text-coral-500" />
                          <span className="text-sm text-ink-700 dark:text-ink-300">{label}</span>
                        </div>
                      );
                    })}
                  </div>
                  {listing.amenities.length > 8 && (
                    <button
                      onClick={() => setShowAllAmenities((s) => !s)}
                      className="mt-3 text-sm font-medium text-coral-600 transition hover:text-coral-700"
                    >
                      {showAllAmenities ? 'Show less' : `Show all ${listing.amenities.length} amenities`}
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Reviews */}
            <div className="mb-8">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-ink-900 dark:text-ink-100">
                  Reviews {reviews.length > 0 && `(${reviews.length})`}
                </h2>
              </div>
              {reviews.length === 0 ? (
                <div className="rounded-2xl border border-ink-100 p-8 text-center dark:border-ink-800">
                  <Star className="mx-auto mb-3 h-10 w-10 text-ink-200 dark:text-ink-700" />
                  <p className="text-sm text-ink-500 dark:text-ink-400">No reviews yet. Be the first to review!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div key={review.id} className="rounded-2xl border border-ink-100 p-5 dark:border-ink-800">
                      <div className="mb-3 flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <img
                            src={review.authorAvatar}
                            alt={review.author}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-ink-900 dark:text-ink-100">{review.author}</span>
                              {review.verifiedStay && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-teal-600 dark:text-teal-400">
                                  <CheckCircle2 className="h-3 w-3" /> Verified Stay
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-ink-400">{review.date}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3.5 w-3.5 ${i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-ink-200 dark:text-ink-700'}`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm leading-relaxed text-ink-600 dark:text-ink-300">{review.text}</p>
                      {review.photos && review.photos.length > 0 && (
                        <div className="mt-3 flex gap-2">
                          {review.photos.map((photo, i) => (
                            <img
                              key={i}
                              src={photo}
                              alt={`Review photo ${i + 1}`}
                              className="h-20 w-20 rounded-lg object-cover"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-4">
              {/* Pricing Card */}
              <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card-hover dark:border-ink-800 dark:bg-ink-900">
                <div className="mb-4">
                  <span className="text-3xl font-bold text-ink-900 dark:text-ink-100">
                    ₹{listing.price.toLocaleString('en-IN')}
                  </span>
                  <span className="text-sm text-ink-500 dark:text-ink-400"> /month</span>
                </div>

                {listing.deposit > 0 && (
                  <div className="mb-4 rounded-xl bg-ink-50 px-4 py-2 text-sm dark:bg-ink-800">
                    <span className="text-ink-500 dark:text-ink-400">Security deposit: </span>
                    <span className="font-medium text-ink-900 dark:text-ink-100">₹{listing.deposit.toLocaleString('en-IN')}</span>
                  </div>
                )}

                <div className="space-y-3">
                  <button
                    onClick={() => {
                      if (!auth) { navigate('/login'); return; }
                      setShowVisitModal(true);
                    }}
                    className="btn-primary w-full justify-center py-3 text-sm"
                  >
                    <Calendar className="h-4 w-4" /> Schedule Visit
                  </button>
                  <button
                    onClick={() => {
                      if (!auth) { navigate('/login'); return; }
                      setShowMessageModal(true);
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white py-3 text-sm font-semibold text-ink-700 transition hover:bg-ink-50 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-300 dark:hover:bg-ink-800"
                  >
                    <MessageCircle className="h-4 w-4" /> Message Owner
                  </button>
                  {owner?.phone && (
                    <a
                      href={`tel:${owner.phone}`}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white py-3 text-sm font-semibold text-ink-700 transition hover:bg-ink-50 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-300 dark:hover:bg-ink-800"
                    >
                      <Phone className="h-4 w-4" /> Call Owner
                    </a>
                  )}
                  {owner?.email && (
                    <a
                      href={`mailto:${owner.email}?subject=Inquiry about ${listing.title}`}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white py-3 text-sm font-semibold text-ink-700 transition hover:bg-ink-50 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-300 dark:hover:bg-ink-800"
                    >
                      <Mail className="h-4 w-4" /> Email Owner
                    </a>
                  )}
                </div>
              </div>

              {/* Owner Card */}
              {owner && (
                <div className="rounded-2xl border border-ink-100 bg-white p-6 dark:border-ink-800 dark:bg-ink-900">
                  <h3 className="mb-4 text-sm font-semibold text-ink-900 dark:text-ink-100">Managed by</h3>
                  <div className="flex items-center gap-3">
                    <img
                      src={owner.avatar}
                      alt={owner.name}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-ink-900 dark:text-ink-100">{owner.name}</span>
                        {owner.verified && <ShieldCheck className="h-4 w-4 text-teal-500" />}
                      </div>
                      <ResponseRateBadge rate={owner.responseRate} time={owner.responseTime} />
                    </div>
                  </div>
                  {owner.bio && (
                    <p className="mt-3 text-xs text-ink-500 dark:text-ink-400">{owner.bio}</p>
                  )}
                  <div className="mt-4 flex gap-4 text-center text-xs text-ink-500 dark:text-ink-400">
                    <div>
                      <div className="font-semibold text-ink-900 dark:text-ink-100">{owner.reviewCount}</div>
                      Reviews
                    </div>
                    <div>
                      <div className="font-semibold text-ink-900 dark:text-ink-100">{owner.listingCount}</div>
                      Listings
                    </div>
                    <div>
                      <div className="font-semibold text-ink-900 dark:text-ink-100">{owner.joinedYear}</div>
                      Joined
                    </div>
                  </div>
                </div>
              )}

              {/* Safety Notice */}
              <div className="rounded-2xl border border-teal-100 bg-teal-50 p-4 dark:border-teal-900/50 dark:bg-teal-950/30">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-teal-600" />
                  <div>
                    <h4 className="text-sm font-semibold text-teal-800 dark:text-teal-300">Safety tip</h4>
                    <p className="mt-1 text-xs leading-relaxed text-teal-700 dark:text-teal-400">
                      Always visit the property before making any payment. Drisya never asks for payment outside the platform.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Similar Listings */}
      {similar.length > 0 && (
        <section className="border-t border-ink-100 bg-ink-50 py-12 dark:border-ink-800 dark:bg-ink-950">
          <div className="mx-auto max-w-7xl px-4">
            <h2 className="mb-6 text-xl font-bold text-ink-900 dark:text-ink-100">Similar PGs in {listing.city}</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {similar.map((l, i) => (
                <ListingCard key={l.id} listing={l} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Message Modal */}
      {showMessageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-ink-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-ink-900 dark:text-ink-100">
                {messageSent ? 'Message Sent!' : 'Send a message'}
              </h3>
              <button
                onClick={() => { setShowMessageModal(false); setMessageSent(false); setMessageText(''); }}
                className="rounded-lg p-1 hover:bg-ink-100 dark:hover:bg-ink-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {messageSent ? (
              <div className="py-8 text-center">
                <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-teal-500" />
                <p className="text-sm text-ink-600 dark:text-ink-300">
                  Your message has been sent to the owner. They'll respond within their typical response time.
                </p>
                <button
                  onClick={() => { setShowMessageModal(false); setMessageSent(false); }}
                  className="btn-primary mt-6 px-6 py-2.5 text-sm"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="mb-4 flex items-center gap-3 rounded-xl bg-ink-50 p-3 dark:bg-ink-800">
                  {listing.photos[0] && (
                    <img src={listing.photos[0]} alt="" className="h-12 w-12 rounded-lg object-cover" />
                  )}
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-ink-900 dark:text-ink-100">{listing.title}</div>
                    <div className="text-xs text-ink-500 dark:text-ink-400">₹{listing.price.toLocaleString('en-IN')}/month</div>
                  </div>
                </div>
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Hi, I'm interested in this PG. Is it still available?"
                  rows={4}
                  className="w-full rounded-xl border border-ink-200 bg-white px-4 py-3 text-sm outline-none focus:border-coral-400 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-100"
                />
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={() => { setShowMessageModal(false); setMessageText(''); }}
                    className="flex-1 rounded-xl border border-ink-200 py-2.5 text-sm font-semibold text-ink-700 transition hover:bg-ink-50 dark:border-ink-700 dark:text-ink-300 dark:hover:bg-ink-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendMessage}
                    disabled={!messageText.trim() || messageSending}
                    className="btn-primary flex-1 justify-center py-2.5 text-sm disabled:opacity-50"
                  >
                    {messageSending ? 'Sending...' : 'Send Message'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Visit Modal */}
      {showVisitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-ink-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-ink-900 dark:text-ink-100">
                {visitBooked ? 'Visit Scheduled!' : 'Schedule a Visit'}
              </h3>
              <button
                onClick={() => { setShowVisitModal(false); setVisitBooked(false); setSelectedDate(''); setSelectedSlot(''); }}
                className="rounded-lg p-1 hover:bg-ink-100 dark:hover:bg-ink-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {visitBooked ? (
              <div className="py-8 text-center">
                <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-teal-500" />
                <p className="mb-1 text-sm font-medium text-ink-900 dark:text-ink-100">
                  Your visit has been scheduled
                </p>
                <p className="text-sm text-ink-500 dark:text-ink-400">
                  {formatDate(selectedDate)} at {selectedSlot}
                </p>
                <p className="mt-3 text-xs text-ink-400 dark:text-ink-500">
                  The owner will confirm shortly. You'll be notified once confirmed.
                </p>
                <button
                  onClick={() => { setShowVisitModal(false); setVisitBooked(false); setSelectedDate(''); setSelectedSlot(''); }}
                  className="btn-primary mt-6 px-6 py-2.5 text-sm"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="mb-4 flex items-center gap-3 rounded-xl bg-ink-50 p-3 dark:bg-ink-800">
                  {listing.photos[0] && (
                    <img src={listing.photos[0]} alt="" className="h-12 w-12 rounded-lg object-cover" />
                  )}
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-ink-900 dark:text-ink-100">{listing.title}</div>
                    <div className="text-xs text-ink-500 dark:text-ink-400">{listing.locality}, {listing.city}</div>
                  </div>
                </div>

                {/* Date Selection */}
                <div className="mb-4">
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-ink-400">
                    Select Date
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {getUpcomingDates().slice(0, 7).map((date) => (
                      <button
                        key={date}
                        onClick={() => setSelectedDate(date)}
                        className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
                          selectedDate === date
                            ? 'bg-coral-500 text-white'
                            : 'bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300 dark:hover:bg-ink-700'
                        }`}
                      >
                        {formatDate(date)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time Slot Selection */}
                {selectedDate && (
                  <div className="mb-4">
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-ink-400">
                      Select Time
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {TIME_SLOTS.map((slot) => (
                        <button
                          key={slot}
                          onClick={() => setSelectedSlot(slot)}
                          className={`rounded-lg px-2 py-2 text-xs font-medium transition ${
                            selectedSlot === slot
                              ? 'bg-coral-500 text-white'
                              : 'bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300 dark:hover:bg-ink-700'
                          }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4 flex gap-3">
                  <button
                    onClick={() => { setShowVisitModal(false); setSelectedDate(''); setSelectedSlot(''); }}
                    className="flex-1 rounded-xl border border-ink-200 py-2.5 text-sm font-semibold text-ink-700 transition hover:bg-ink-50 dark:border-ink-700 dark:text-ink-300 dark:hover:bg-ink-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleScheduleVisit}
                    disabled={!selectedDate || !selectedSlot || visitBooking}
                    className="btn-primary flex-1 justify-center py-2.5 text-sm disabled:opacity-50"
                  >
                    {visitBooking ? 'Booking...' : 'Confirm Visit'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
