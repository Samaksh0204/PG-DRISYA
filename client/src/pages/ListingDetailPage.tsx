import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import {
  ChevronLeft, ChevronRight, MapPin, Share2, Heart, ShieldCheck, Crown, Calendar, MessageCircle, ArrowLeft,
  CheckCircle2, Camera, AlertCircle, Zap, ListChecks, BedDouble, Users, Wallet, CalendarCheck, Star,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { fetchListingDetail, fetchListings, sendMessage, newClientId, scheduleVisit, requestBooking, submitReview, type ListingDetail } from '../lib/api';
import { ListingCard } from '../components/ListingCard';
import { ResponseRateBadge } from '../components/Badges';
import { Avatar, Modal, ErrorText, Stars, StarInput, PageLoader, SafeImage, StatusPill } from '../components/ui';
import { ReportButton } from '../components/ReportModal';
import { IdentityBadge } from '../components/IdentityVerification';
import { AMENITY_ICONS, AMENITY_LABELS } from '../data/amenityIcons';
import { formatINR, formatDate, formatDay, upcomingDates, localISODate, addDays, moveInCost, routeParams } from '../lib/format';
import type { PropertyListing, Review, CategoryRatings } from '../types';

const ListingLocationMap = lazy(() => import('../components/MapView').then((m) => ({ default: m.ListingLocationMap })));

const genderLabel: Record<string, string> = { male: 'Men only', female: 'Women only', coed: 'Co-ed' };
const occupancyLabel: Record<string, string> = { single: 'Single room', double: 'Double sharing', triple: 'Triple sharing', dorm: 'Dormitory' };
const TIME_SLOTS = ['09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM'];
const CATEGORY_LABELS: Record<keyof CategoryRatings, string> = { cleanliness: 'Cleanliness', accuracy: 'Accuracy', safety: 'Safety', food: 'Food', value: 'Value' };

export function ListingDetailPage() {
  const { route, navigate, wishlist, toggleWishlist, auth, toast } = useApp();
  const listingId = route.split('/listing/')[1]?.split('?')[0] || '';
  const [detail, setDetail] = useState<ListingDetail | null>(null);
  const [similar, setSimilar] = useState<PropertyListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  // Set when the server couldn't be reached or failed — not the same as "doesn't exist".
  const [loadError, setLoadError] = useState('');
  const [photoIdx, setPhotoIdx] = useState(0);
  const [showGallery, setShowGallery] = useState(false);
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const [modal, setModal] = useState<'message' | 'visit' | 'review' | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await fetchListingDetail(listingId);
      setDetail(d);
      setNotFound(false);
      setLoadError('');
      fetchListings({ city: d.property.city, limit: '5' })
        .then((s) => setSimilar(s.filter((l) => l.id !== d.property.id).slice(0, 4)))
        .catch(() => setSimilar([]));
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status === 404 || status === 400) {
        setNotFound(true);
        setLoadError('');
      } else {
        setLoadError(status ? 'The server had a problem loading this PG.' : 'Could not reach the server. Check that it is running and your internet is on.');
      }
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    if (!listingId) return;
    setLoading(true);
    setPhotoIdx(0);
    load();
  }, [listingId, load, auth?.id]);

  // Deep-link actions, e.g. /listing/:id?action=review from a notification.
  useEffect(() => {
    const action = routeParams(route).get('action');
    if (action === 'review' && detail?.viewer?.canReview) setModal('review');
    // "Book now" from a listing card: bring the booking box into view and highlight it.
    if (action === 'book' && detail) {
      const t = setTimeout(() => {
        const el = document.getElementById('booking-card');
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el?.classList.add('ring-4', 'ring-brand-500/30');
        setTimeout(() => el?.classList.remove('ring-4', 'ring-brand-500/30'), 1800);
      }, 150);
      return () => clearTimeout(t);
    }
  }, [route, detail]);

  const requireLogin = (then: () => void) => (auth ? then() : navigate('/login'));

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: detail?.property.title, url });
      else {
        await navigator.clipboard.writeText(url);
        toast('Link copied');
      }
    } catch { /* user cancelled */ }
  };

  if (loading) return <PageLoader />;
  if (loadError && !detail) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <AlertCircle className="mb-4 h-16 w-16 text-warning" />
        <h2 className="mb-2 text-xl font-semibold text-ink-900 dark:text-ink-100">Couldn't load this PG</h2>
        <p className="mb-6 max-w-md text-ink-500">{loadError}</p>
        <button onClick={() => { setLoading(true); load(); }} className="btn-primary">Try again</button>
      </div>
    );
  }
  if (notFound || !detail) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <AlertCircle className="mb-4 h-16 w-16 text-ink-300" />
        <h2 className="mb-2 text-xl font-semibold text-ink-900 dark:text-ink-100">Listing not found</h2>
        <p className="mb-6 max-w-md text-ink-500">It may have been removed or paused by the owner, or the link is out of date.</p>
        <button onClick={() => navigate('/search')} className="btn-primary">Browse PGs</button>
      </div>
    );
  }

  const { property: listing, owner, reviews, viewer } = detail;
  const photos = listing.photos;
  const saved = wishlist.includes(listing.id);
  const isOwner = !!viewer?.isOwner;
  const amenities = showAllAmenities ? listing.amenities : listing.amenities.slice(0, 10);

  return (
    <div className="min-h-screen bg-page">
      <div className="container-page py-4">
        <button onClick={() => window.history.length > 1 ? window.history.back() : navigate('/search')} className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-900 dark:text-ink-400 dark:hover:text-ink-100">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
      </div>

      {listing.status !== 'active' && (
        <div className="container-page mb-4">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
            <StatusPill status={listing.status} />
            {listing.status === 'pending_review' && 'Only you can see this listing until our team approves it.'}
            {listing.status === 'inactive' && 'This listing is paused and hidden from search.'}
            {listing.status === 'rejected' && <>Not approved: {listing.moderationNote || 'see your dashboard'}. Edit the listing to resubmit.</>}
          </div>
        </div>
      )}

      {/* Title */}
      <div className="container-page mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 dark:text-ink-100 sm:text-3xl">{listing.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-600 dark:text-ink-400">
            {listing.reviewCount > 0 ? (
              <a href="#reviews" className="flex items-center gap-1 font-medium text-ink-900 underline dark:text-ink-100"><Star className="h-4 w-4 fill-warning text-warning" /> {listing.rating.toFixed(1)} · {listing.reviewCount} review{listing.reviewCount > 1 ? 's' : ''}</a>
            ) : <span className="font-medium">New listing</span>}
            <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {[listing.locality, listing.city].filter(Boolean).join(', ')}</span>
            {listing.distanceFromLandmark && <span>· {listing.distanceFromLandmark}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={share} className="btn-ghost text-sm"><Share2 className="h-4 w-4" /> Share</button>
          {!isOwner && (
            <button onClick={() => toggleWishlist(listing.id)} className="btn-ghost text-sm" aria-pressed={saved}>
              <Heart className={`h-4 w-4 ${saved ? 'fill-brand-500 text-brand-500' : ''}`} /> {saved ? 'Saved' : 'Save'}
            </button>
          )}
        </div>
      </div>

      {/* Gallery */}
      <div className="container-page">
        <div className="relative overflow-hidden rounded-2xl">
          <div className="aspect-[16/9] w-full bg-ink-100 dark:bg-ink-800 sm:aspect-[2.2/1]">
            <SafeImage src={photos[photoIdx]} alt={`${listing.title} photo ${photoIdx + 1}`} width={1000} priority className="h-full w-full object-cover" />
          </div>
          {photos.length > 1 && (
            <>
              <button aria-label="Previous photo" onClick={() => setPhotoIdx((i) => (i - 1 + photos.length) % photos.length)} className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-md hover:bg-white dark:bg-ink-900/80"><ChevronLeft className="h-5 w-5" /></button>
              <button aria-label="Next photo" onClick={() => setPhotoIdx((i) => (i + 1) % photos.length)} className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-md hover:bg-white dark:bg-ink-900/80"><ChevronRight className="h-5 w-5" /></button>
              <button onClick={() => setShowGallery(true)} className="absolute bottom-4 right-4 inline-flex items-center gap-1.5 rounded-lg bg-white/90 px-3 py-2 text-xs font-medium hover:bg-white dark:bg-ink-900/80"><Camera className="h-3.5 w-3.5" /> All {photos.length} photos</button>
            </>
          )}
          <div className="absolute left-4 top-4 flex flex-wrap gap-2">
            {listing.verified && <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-teal-700"><ShieldCheck className="h-3.5 w-3.5" /> Drisya Verified</span>}
            {listing.featured && <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2.5 py-1 text-xs font-semibold text-amber-700"><Crown className="h-3.5 w-3.5" /> Featured</span>}
          </div>
        </div>
      </div>

      <div className="container-page py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="card px-5 py-2 sm:px-8 lg:col-span-2">
            {/* Host line */}
            {owner && (
              <div className="flex items-center justify-between gap-4 border-b border-ink-100 pb-6 pt-6 dark:border-ink-800">
                <div>
                  <h2 className="text-lg font-semibold text-ink-900 dark:text-ink-100">{occupancyLabel[listing.occupancy]} · hosted by {owner.name}</h2>
                  <p className="text-sm text-ink-500">{genderLabel[listing.genderPreference]} · {listing.roomsAvailable > 0 ? `${listing.roomsAvailable} room${listing.roomsAvailable > 1 ? 's' : ''} available` : 'Currently full'}</p>
                </div>
                <button onClick={() => navigate(`/user/${owner.id}`)} aria-label={`View ${owner.name}'s profile`}>
                  <Avatar src={owner.avatar} name={owner.name} className="h-12 w-12 rounded-full object-cover" />
                </button>
              </div>
            )}

            {/* Highlights */}
            <div className="grid grid-cols-2 gap-3 border-b border-ink-100 py-6 dark:border-ink-800 sm:grid-cols-4">
              <Fact icon={Users} label="For" value={genderLabel[listing.genderPreference]} />
              <Fact icon={BedDouble} label="Room" value={occupancyLabel[listing.occupancy]} />
              <Fact icon={Wallet} label="Deposit" value={listing.deposit > 0 ? formatINR(listing.deposit) : 'None'} />
              <Fact icon={CalendarCheck} label="Available from" value={listing.moveInDate && listing.moveInDate > localISODate() ? formatDate(listing.moveInDate) : 'Now'} />
            </div>

            <Section title="About this PG">
              <p className="whitespace-pre-line text-sm leading-relaxed text-ink-700 dark:text-ink-300">{listing.description || 'The owner has not added a description yet.'}</p>
            </Section>

            <Section title="What this place offers">
              {listing.amenities.length === 0 ? <p className="text-sm text-ink-500">No amenities listed.</p> : (
                <>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {amenities.map((key) => {
                      const Icon = AMENITY_ICONS[key] || CheckCircle2;
                      return <div key={key} className="flex items-center gap-3 py-1 text-sm text-ink-700 dark:text-ink-300"><Icon className="h-5 w-5 text-ink-500" /> {AMENITY_LABELS[key] || key}</div>;
                    })}
                  </div>
                  {listing.amenities.length > 10 && (
                    <button onClick={() => setShowAllAmenities((s) => !s)} className="btn-outline mt-4 text-sm">{showAllAmenities ? 'Show less' : `Show all ${listing.amenities.length} amenities`}</button>
                  )}
                </>
              )}
            </Section>

            <Section title="House rules">
              {listing.rules.length ? (
                <ul className="space-y-2">{listing.rules.map((r) => <li key={r} className="flex items-start gap-2 text-sm text-ink-700 dark:text-ink-300"><ListChecks className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" /> {r}</li>)}</ul>
              ) : <p className="text-sm text-ink-500">Ask the owner about rules such as gate timings and visitors.</p>}
            </Section>

            <Section title="Where you'll be">
              <Suspense fallback={<div className="skeleton h-72 rounded-2xl" />}>
                <ListingLocationMap lat={listing.lat} lng={listing.lng} label={`${[listing.locality, listing.city].filter(Boolean).join(', ')} — exact location shared after your visit is confirmed`} />
              </Suspense>
              <p className="mt-2 text-xs text-ink-500">{listing.exactLocation ? 'Exact location — shared with you because your visit or booking is confirmed.' : 'Approximate area. The exact location is shared once your visit or booking is confirmed.'}</p>
            </Section>

            <ReviewsSection listing={listing} reviews={reviews} canReview={!!viewer?.canReview} onWrite={() => setModal('review')} />

            <div className="mt-8 flex justify-end">{!isOwner && <ReportButton targetType="listing" targetId={listing.id} label="Report this listing" />}</div>
          </div>

          {/* Sidebar */}
          <div>
            <div className="sticky top-24 space-y-4">
              {isOwner ? (
                <div className="card p-6">
                  <p className="text-sm text-ink-600 dark:text-ink-300">This is your listing.</p>
                  <button onClick={() => navigate('/owner?tab=listings')} className="btn-primary mt-4 w-full">Manage in host dashboard</button>
                </div>
              ) : (
                <BookingCard listing={listing} onNeedLogin={() => navigate('/login')} loggedIn={!!auth} emailVerified={!!auth?.emailVerified} />
              )}

              {!isOwner && (
                <div className="card space-y-3 p-6">
                  <button onClick={() => requireLogin(() => setModal('visit'))} className="btn-outline w-full"><Calendar className="h-4 w-4" /> Book a visit</button>
                  <button onClick={() => requireLogin(() => setModal('message'))} className="btn-outline w-full"><MessageCircle className="h-4 w-4" /> Message owner</button>
                  <p className="text-center text-xs text-ink-500">Host phone numbers are never shared. Talk to the host here in Drisya messages, so there's a record if anything goes wrong.</p>
                </div>
              )}

              {owner && (
                <div className="card p-6">
                  <button onClick={() => navigate(`/user/${owner.id}`)} className="flex w-full items-center gap-3 text-left">
                    <Avatar src={owner.avatar} name={owner.name} className="h-12 w-12 rounded-full object-cover" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate font-semibold text-ink-900 dark:text-ink-100">{owner.name}</span>
                        {owner.verified && <ShieldCheck className="h-4 w-4 text-teal-500" aria-label="Host checked by the Drisya team" />}
                      </div>
                      {owner.identityVerified && <div className="mt-1"><IdentityBadge /></div>}
                      {owner.responseRate > 0 && <ResponseRateBadge rate={owner.responseRate} time={owner.responseTime} />}
                    </div>
                  </button>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs text-ink-500">
                    <div><div className="font-semibold text-ink-900 dark:text-ink-100">{owner.reviewCount}</div>Reviews</div>
                    <div><div className="font-semibold text-ink-900 dark:text-ink-100">{owner.rating ? owner.rating.toFixed(1) : '—'}</div>Rating</div>
                    <div><div className="font-semibold text-ink-900 dark:text-ink-100">{owner.joinedYear}</div>Joined</div>
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4 text-xs leading-relaxed text-brand-900 dark:border-brand-900/50 dark:bg-brand-950/30 dark:text-brand-200">
                <strong className="block text-sm">Safety tip</strong>
                Visit before paying. Pay rent and deposit only against a written agreement and receipt. Report anyone who asks for advance payment to "hold" a room.
              </div>
            </div>
          </div>
        </div>
      </div>

      {similar.length > 0 && (
        <section className="border-t border-ink-200 bg-white py-12 dark:border-ink-800 dark:bg-ink-900/40">
          <div className="container-page">
            <h2 className="mb-6 text-xl font-bold text-ink-900 dark:text-ink-100">More PGs in {listing.city}</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{similar.map((l, i) => <ListingCard key={l.id} listing={l} index={i} />)}</div>
          </div>
        </section>
      )}

      {showGallery && (
        <Modal title={`${photos.length} photos`} onClose={() => setShowGallery(false)} wide>
          <div className="grid gap-2 sm:grid-cols-2">{photos.map((p, i) => <SafeImage key={i} src={p} alt={`Photo ${i + 1}`} width={600} className="aspect-[4/3] w-full rounded-xl object-cover" />)}</div>
        </Modal>
      )}
      {modal === 'message' && owner && <MessageModal listing={listing} ownerId={owner.id} onClose={() => setModal(null)} />}
      {modal === 'visit' && <VisitModal listing={listing} onClose={() => setModal(null)} />}
      {modal === 'review' && <ReviewModal listing={listing} onClose={() => setModal(null)} onDone={() => { setModal(null); load(); }} />}
    </div>
  );
}

function Fact({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-ink-100 p-3 dark:border-ink-800">
      <Icon className="h-4 w-4 text-ink-400" />
      <div className="mt-1 text-xs text-ink-400">{label}</div>
      <div className="text-sm font-semibold text-ink-900 dark:text-ink-100">{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-ink-100 py-8 dark:border-ink-800">
      <h2 className="mb-4 text-lg font-semibold text-ink-900 dark:text-ink-100">{title}</h2>
      {children}
    </section>
  );
}

function ReviewsSection({ listing, reviews, canReview, onWrite }: { listing: PropertyListing; reviews: Review[]; canReview: boolean; onWrite: () => void }) {
  const [showAll, setShowAll] = useState(false);
  const categories = (Object.keys(CATEGORY_LABELS) as (keyof CategoryRatings)[])
    .map((k) => {
      const vals = reviews.map((r) => r.ratings?.[k]).filter((v): v is number => typeof v === 'number');
      return { key: k, avg: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0, n: vals.length };
    })
    .filter((c) => c.n > 0);
  const shown = showAll ? reviews : reviews.slice(0, 6);

  return (
    <section id="reviews" className="py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-ink-900 dark:text-ink-100">
          {reviews.length > 0 ? <><Star className="h-5 w-5 fill-warning text-warning" /> {listing.rating.toFixed(1)} · {reviews.length} review{reviews.length > 1 ? 's' : ''}</> : 'Reviews'}
        </h2>
        {canReview && <button onClick={onWrite} className="btn-primary text-sm">Write a review</button>}
      </div>

      {categories.length > 0 && (
        <div className="mb-8 grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3">
          {categories.map((c) => (
            <div key={c.key}>
              <div className="flex justify-between text-sm text-ink-700 dark:text-ink-300"><span>{CATEGORY_LABELS[c.key]}</span><span className="font-semibold">{c.avg.toFixed(1)}</span></div>
              <div className="mt-1 h-1 rounded-full bg-ink-100 dark:bg-ink-800"><div className="h-1 rounded-full bg-ink-900 dark:bg-ink-100" style={{ width: `${(c.avg / 5) * 100}%` }} /></div>
            </div>
          ))}
        </div>
      )}

      {reviews.length === 0 ? (
        <div className="rounded-2xl border border-ink-100 p-8 text-center text-sm text-ink-500 dark:border-ink-800">
          No reviews yet. Tenants can review after a completed visit or a stay.
        </div>
      ) : (
        <div className="grid gap-8 sm:grid-cols-2">
          {shown.map((r) => (
            <article key={r.id}>
              <div className="flex items-center gap-3">
                <Avatar src={r.authorAvatar} name={r.author} className="h-10 w-10 rounded-full object-cover" />
                <div>
                  <p className="text-sm font-semibold text-ink-900 dark:text-ink-100">{r.author}</p>
                  <p className="text-xs text-ink-500">{formatDate(r.date)}{r.verifiedStay && <span className="ml-2 inline-flex items-center gap-0.5 text-teal-600"><CheckCircle2 className="h-3 w-3" /> Stayed here</span>}</p>
                </div>
              </div>
              <div className="mt-2"><Stars value={r.rating} /></div>
              {r.text && <p className="mt-2 text-sm leading-relaxed text-ink-700 dark:text-ink-300">{r.text}</p>}
              {r.ownerReply && (
                <div className="mt-3 rounded-xl bg-ink-50 p-3 text-sm dark:bg-ink-800">
                  <p className="text-xs font-semibold text-ink-900 dark:text-ink-100">Response from the owner</p>
                  <p className="mt-1 text-ink-700 dark:text-ink-300">{r.ownerReply.text}</p>
                </div>
              )}
              <div className="mt-2"><ReportButton targetType="review" targetId={r.id} /></div>
            </article>
          ))}
        </div>
      )}
      {reviews.length > 6 && <button onClick={() => setShowAll((s) => !s)} className="btn-outline mt-6">{showAll ? 'Show fewer' : `Show all ${reviews.length} reviews`}</button>}
    </section>
  );
}

function BookingCard({ listing, loggedIn, emailVerified, onNeedLogin }: { listing: PropertyListing; loggedIn: boolean; emailVerified: boolean; onNeedLogin: () => void }) {
  const { navigate, toast } = useApp();
  const today = localISODate();
  const earliest = listing.moveInDate && listing.moveInDate > today ? listing.moveInDate : today;
  const [moveIn, setMoveIn] = useState(earliest);
  const [months, setMonths] = useState(6);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const cost = moveInCost(listing.price, listing.deposit);
  const full = listing.roomsAvailable < 1;

  const submit = async () => {
    if (!loggedIn) return onNeedLogin();
    setSending(true);
    setError('');
    try {
      const { booking } = await requestBooking({ propertyId: listing.id, moveInDate: moveIn, durationMonths: months, message: message.trim() });
      toast(booking.status === 'accepted' ? 'Booking confirmed! The owner has been notified.' : 'Request sent. The owner usually replies within 24 hours.');
      navigate('/dashboard?tab=trips');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div id="booking-card" className="card scroll-mt-24 p-6 transition-shadow duration-500">
      <div className="mb-4 flex items-baseline justify-between">
        <div><span className="text-2xl font-bold text-ink-900 dark:text-ink-100">{formatINR(listing.price)}</span><span className="text-sm text-ink-500"> /month</span></div>
        {listing.reviewCount > 0 && <span className="flex items-center gap-1 text-sm font-semibold text-ink-900 dark:text-ink-100"><Star className="h-3.5 w-3.5 fill-warning text-warning" /> {listing.rating.toFixed(1)}</span>}
      </div>

      <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-ink-300 dark:border-ink-600">
        <label className="border-r border-ink-300 p-3 dark:border-ink-600">
          <span className="block text-[10px] font-bold uppercase text-ink-700 dark:text-ink-200">Move-in</span>
          <input type="date" min={earliest} max={addDays(today, 180)} value={moveIn} onChange={(e) => setMoveIn(e.target.value)} aria-label="Move-in date" className="mt-0.5 w-full bg-transparent text-sm font-medium text-ink-900 outline-none dark:text-ink-100" />
        </label>
        <label className="p-3">
          <span className="block text-[10px] font-bold uppercase text-ink-700 dark:text-ink-200">Stay</span>
          <select value={months} onChange={(e) => setMonths(Number(e.target.value))} aria-label="Length of stay" className="mt-0.5 w-full bg-transparent text-sm font-medium text-ink-900 outline-none dark:text-ink-100">
            {[1, 2, 3, 6, 9, 11, 12, 24].map((m) => <option key={m} value={m}>{m} month{m > 1 ? 's' : ''}</option>)}
          </select>
        </label>
      </div>
      <textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000} rows={2} placeholder="Introduce yourself (college/work, move-in plans)" className="input mt-3 w-full resize-none text-sm" />

      <ErrorText>{error}</ErrorText>
      {loggedIn && !emailVerified && <p className="mt-3 text-xs text-amber-700">Confirm your email first (check your inbox, or resend from Account settings).</p>}

      <button onClick={submit} disabled={sending || full} className="btn-primary mt-4 w-full py-3">
        {full ? 'Currently full' : sending ? 'Sending…' : listing.instantBook ? <><Zap className="h-4 w-4" /> Book instantly</> : 'Request to book'}
      </button>
      <p className="mt-2 text-center text-xs text-ink-500">{listing.instantBook ? 'Confirmed immediately while rooms are available.' : "You won't be charged anything now."}</p>

      <div className="mt-4 space-y-2 border-t border-ink-100 pt-4 text-sm dark:border-ink-800">
        <div className="flex justify-between text-ink-600 dark:text-ink-300"><span>First month's rent</span><span>{formatINR(cost.firstMonth)}</span></div>
        <div className="flex justify-between text-ink-600 dark:text-ink-300"><span>Refundable deposit</span><span>{formatINR(cost.deposit)}</span></div>
        <div className="flex justify-between font-semibold text-ink-900 dark:text-ink-100"><span>Due at move-in</span><span>{formatINR(cost.total)}</span></div>
        <p className="text-xs text-ink-500">Paid directly to the owner at move-in, against a written agreement. Drisya charges no brokerage.</p>
      </div>
    </div>
  );
}

function MessageModal({ listing, ownerId, onClose }: { listing: PropertyListing; ownerId: string; onClose: () => void }) {
  const { navigate } = useApp();
  const [text, setText] = useState("Hi, I'm interested in this PG. Is a room available?");
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  // One id per dialog: pressing Send again after a timeout can't create a duplicate.
  const [clientId] = useState(newClientId);
  const send = async () => {
    setSending(true);
    setError('');
    try {
      await sendMessage({ propertyId: listing.id, receiverId: ownerId, text: text.trim(), clientId });
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  };
  return (
    <Modal title={sent ? 'Message sent' : 'Message the owner'} onClose={onClose}>
      {sent ? (
        <div className="py-6 text-center">
          <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-teal-500" />
          <p className="text-sm text-ink-600 dark:text-ink-300">We'll notify you when the owner replies.</p>
          <div className="mt-6 flex gap-3"><button onClick={onClose} className="btn-outline flex-1">Close</button><button onClick={() => navigate(`/messages?with=${ownerId}&property=${listing.id}`)} className="btn-primary flex-1">Open conversation</button></div>
        </div>
      ) : (
        <>
          <textarea data-autofocus value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} rows={5} className="input w-full resize-none" aria-label="Message" />
          <p className="mt-1 text-xs text-ink-500">Don't share bank details or OTPs in chat.</p>
          <div className="mt-3"><ErrorText>{error}</ErrorText></div>
          <div className="mt-4 flex gap-3"><button onClick={onClose} className="btn-outline flex-1">Cancel</button><button onClick={send} disabled={!text.trim() || sending} className="btn-primary flex-1">{sending ? 'Sending…' : 'Send'}</button></div>
        </>
      )}
    </Modal>
  );
}

function VisitModal({ listing, onClose }: { listing: PropertyListing; onClose: () => void }) {
  const { navigate } = useApp();
  const dates = upcomingDates(14, new Date(), 0);
  const [date, setDate] = useState('');
  const [slot, setSlot] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const book = async () => {
    setSending(true);
    setError('');
    try {
      await scheduleVisit({ propertyId: listing.id, date, timeSlot: slot, message: note.trim() });
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  };
  return (
    <Modal title={done ? 'Visit requested' : 'Book a visit'} onClose={onClose}>
      {done ? (
        <div className="py-6 text-center">
          <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-teal-500" />
          <p className="font-medium">{formatDay(date)} at {slot}</p>
          <p className="mt-1 text-sm text-ink-500">The owner will confirm. You'll get a notification.</p>
          <div className="mt-6 flex gap-3"><button onClick={onClose} className="btn-outline flex-1">Close</button><button onClick={() => navigate('/dashboard?tab=visits')} className="btn-primary flex-1">My visits</button></div>
        </div>
      ) : (
        <>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">Date</p>
          <div className="flex flex-wrap gap-2">
            {dates.map((d) => <button key={d} onClick={() => setDate(d)} aria-pressed={date === d} className={`chip !text-xs ${date === d ? 'chip-active' : ''}`}>{d === localISODate() ? 'Today' : formatDay(d)}</button>)}
          </div>
          {date && (
            <>
              <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-ink-400">Time</p>
              <div className="grid grid-cols-3 gap-2">
                {TIME_SLOTS.map((s) => <button key={s} onClick={() => setSlot(s)} aria-pressed={slot === s} className={`chip justify-center !px-2 !text-xs ${slot === s ? 'chip-active' : ''}`}>{s}</button>)}
              </div>
            </>
          )}
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Note for the owner (optional)" aria-label="Note for the owner (optional)" className="input mt-4 w-full" />
          <div className="mt-3"><ErrorText>{error}</ErrorText></div>
          <div className="mt-4 flex gap-3"><button onClick={onClose} className="btn-outline flex-1">Cancel</button><button onClick={book} disabled={!date || !slot || sending} className="btn-primary flex-1">{sending ? 'Booking…' : 'Request visit'}</button></div>
        </>
      )}
    </Modal>
  );
}

function ReviewModal({ listing, onClose, onDone }: { listing: PropertyListing; onClose: () => void; onDone: () => void }) {
  const { toast } = useApp();
  const [rating, setRating] = useState(0);
  const [cats, setCats] = useState<CategoryRatings>({});
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const submit = async () => {
    if (!rating) return setError('Please choose an overall rating');
    setSending(true);
    setError('');
    try {
      await submitReview({ propertyId: listing.id, rating, text: text.trim(), ratings: cats });
      toast('Thanks for your review!');
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  };
  return (
    <Modal title={`Review ${listing.title}`} onClose={onClose}>
      <p className="mb-2 text-sm font-medium">Overall</p>
      <StarInput value={rating} onChange={setRating} label="Overall rating" />
      <div className="mt-4 grid grid-cols-1 gap-2">
        {(Object.keys(CATEGORY_LABELS) as (keyof CategoryRatings)[]).map((k) => (
          <div key={k} className="flex items-center justify-between">
            <span className="text-sm text-ink-600 dark:text-ink-300">{CATEGORY_LABELS[k]}</span>
            <StarInput value={cats[k] || 0} onChange={(n) => setCats((c) => ({ ...c, [k]: n }))} label={`${CATEGORY_LABELS[k]} rating`} />
          </div>
        ))}
      </div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} rows={4} placeholder="What was it like? Food, cleanliness, safety, owner…" className="input mt-4 w-full resize-none" aria-label="Review" />
      <p className="mt-1 text-xs text-ink-500">Reviews are public and can't be edited after posting.</p>
      <div className="mt-3"><ErrorText>{error}</ErrorText></div>
      <div className="mt-4 flex gap-3"><button onClick={onClose} className="btn-outline flex-1">Cancel</button><button onClick={submit} disabled={sending} className="btn-primary flex-1">{sending ? 'Posting…' : 'Post review'}</button></div>
    </Modal>
  );
}
