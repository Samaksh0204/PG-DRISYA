import { useCallback, useEffect, useState } from 'react';
import { Heart, Calendar, Luggage, Star, X, MessageCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ListingCard } from '../components/ListingCard';
import { EmptyState, SignInRequired, StatusPill, PageLoader, SafeImage, Modal, ErrorText } from '../components/ui';
import { fetchFavoriteListings, fetchMyVisits, fetchMyBookings, updateVisitStatus, updateBookingStatus } from '../lib/api';
import { formatINR, formatDay, routeParams } from '../lib/format';
import type { Booking, PropertyListing, Visit } from '../types';

type Tab = 'trips' | 'visits' | 'saved';

export function TenantDashboardPage() {
  const { navigate, auth, authLoading, route, toast, wishlist } = useApp();
  const initial = routeParams(route).get('tab') as Tab | null;
  const [tab, setTab] = useState<Tab>(initial && ['trips', 'visits', 'saved'].includes(initial) ? initial : 'trips');
  const [saved, setSaved] = useState<PropertyListing[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<Booking | null>(null);

  useEffect(() => {
    const t = routeParams(route).get('tab') as Tab | null;
    if (t && ['trips', 'visits', 'saved'].includes(t)) setTab(t);
  }, [route]);

  const load = useCallback(async () => {
    const [s, v, b] = await Promise.all([fetchFavoriteListings().catch(() => []), fetchMyVisits().catch(() => []), fetchMyBookings().catch(() => [])]);
    setSaved(s);
    setVisits(v);
    setBookings(b);
    setLoading(false);
  }, []);

  useEffect(() => { if (auth) load(); }, [auth?.id, load]);
  // Keep the wishlist tab in sync when hearts are toggled elsewhere.
  useEffect(() => { setSaved((prev) => prev.filter((l) => wishlist.includes(l.id))); }, [wishlist]);

  if (authLoading) return <PageLoader />;
  if (!auth) return <SignInRequired message="Log in to see your trips, visits and wishlist." />;
  if (loading) return <PageLoader />;

  const cancelVisit = async (v: Visit) => {
    if (!window.confirm('Cancel this visit?')) return;
    try {
      await updateVisitStatus(v._id, 'cancelled');
      setVisits((prev) => prev.map((x) => (x._id === v._id ? { ...x, status: 'cancelled' } : x)));
      toast('Visit cancelled');
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  };

  const tabs: { key: Tab; label: string; icon: React.ElementType; count: number }[] = [
    { key: 'trips', label: 'Bookings', icon: Luggage, count: bookings.filter((b) => ['pending', 'accepted'].includes(b.status)).length },
    { key: 'visits', label: 'Visits', icon: Calendar, count: visits.filter((v) => ['pending', 'confirmed'].includes(v.status)).length },
    { key: 'saved', label: 'Wishlist', icon: Heart, count: saved.length },
  ];

  return (
    <div className="min-h-screen bg-ink-50/30 dark:bg-ink-950">
      <div className="container-page py-8">
        <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white">Hi, {auth.fullName.split(' ')[0]}</h1>
        <p className="text-sm text-ink-500 dark:text-ink-400">Your bookings, visits and saved PGs.</p>

        {!auth.emailVerified && (
          <div className="mt-4 rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
            Please confirm your email to request bookings. <button onClick={() => navigate('/profile/edit')} className="font-semibold underline">Resend link</button>
          </div>
        )}

        <div className="mt-6 flex gap-2 overflow-x-auto border-b border-ink-100 dark:border-ink-800" role="tablist">
          {tabs.map((t) => (
            <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}
              className={`-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium ${tab === t.key ? 'border-brand-500 text-brand-600' : 'border-transparent text-ink-500 hover:text-ink-800 dark:hover:text-ink-200'}`}>
              <t.icon className="h-4 w-4" /> {t.label} {t.count > 0 && <span className="rounded-full bg-brand-500 px-1.5 text-xs font-bold text-white">{t.count}</span>}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === 'trips' && (bookings.length ? (
            <div className="space-y-3">
              {bookings.map((b) => (
                <Row key={b._id} property={b.propertyId} onOpen={() => b.propertyId && navigate(`/listing/${b.propertyId._id}`)}
                  meta={<>Move-in {formatDay(b.moveInDate)} · {b.durationMonths} month{b.durationMonths > 1 ? 's' : ''} · {formatINR(b.monthlyRent)}/mo + {formatINR(b.deposit)} deposit</>}
                  note={b.statusReason ? `Note: ${b.statusReason}` : b.status === 'pending' ? 'Waiting for the owner to respond.' : b.status === 'accepted' ? "Confirmed. The owner's phone number is now visible on the listing." : ''}
                  status={b.status}
                  actions={<>
                    {b.propertyId && ['accepted', 'completed'].includes(b.status) && <button onClick={() => navigate(`/listing/${b.propertyId!._id}?action=review`)} className="btn-outline text-xs"><Star className="h-3.5 w-3.5" /> Review</button>}
                    {['pending', 'accepted'].includes(b.status) && <button onClick={() => setCancelling(b)} className="btn-ghost text-xs text-danger"><X className="h-3.5 w-3.5" /> Cancel</button>}
                  </>} />
              ))}
            </div>
          ) : <EmptyState icon={Luggage} title="No bookings yet" desc="When you request to book a PG it'll show up here." action={{ label: 'Find a PG', onClick: () => navigate('/search') }} />)}

          {tab === 'visits' && (visits.length ? (
            <div className="space-y-3">
              {visits.map((v) => (
                <Row key={v._id} property={v.propertyId} onOpen={() => v.propertyId && navigate(`/listing/${v.propertyId._id}`)}
                  meta={<>{formatDay(v.date)} at {v.timeSlot}</>}
                  note={v.status === 'pending' ? 'Waiting for the owner to confirm.' : ''}
                  status={v.status}
                  actions={<>
                    {v.status === 'completed' && v.propertyId && <button onClick={() => navigate(`/listing/${v.propertyId!._id}?action=review`)} className="btn-outline text-xs"><Star className="h-3.5 w-3.5" /> Review</button>}
                    {['pending', 'confirmed'].includes(v.status) && <button onClick={() => cancelVisit(v)} className="btn-ghost text-xs text-danger"><X className="h-3.5 w-3.5" /> Cancel</button>}
                    <button onClick={() => navigate('/messages')} className="btn-ghost text-xs" aria-label="Messages"><MessageCircle className="h-3.5 w-3.5" /></button>
                  </>} />
              ))}
            </div>
          ) : <EmptyState icon={Calendar} title="No visits yet" desc="Book a visit from any listing to see the PG in person." action={{ label: 'Find a PG', onClick: () => navigate('/search') }} />)}

          {tab === 'saved' && (saved.length ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">{saved.map((l, i) => <ListingCard key={l.id} listing={l} index={i} />)}</div>
          ) : <EmptyState icon={Heart} title="Your wishlist is empty" desc="Tap the heart on any PG to save it here." action={{ label: 'Explore PGs', onClick: () => navigate('/search') }} />)}
        </div>
      </div>

      {cancelling && <CancelBookingModal booking={cancelling} onClose={() => setCancelling(null)} onDone={(b) => { setBookings((prev) => prev.map((x) => (x._id === b._id ? { ...x, ...b, propertyId: x.propertyId } : x))); setCancelling(null); toast('Booking cancelled'); }} />}
    </div>
  );
}

function Row({ property, meta, note, status, actions, onOpen }: { property: Booking['propertyId']; meta: React.ReactNode; note?: string; status: string; actions: React.ReactNode; onOpen: () => void }) {
  return (
    <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      <button onClick={onOpen} className="shrink-0"><SafeImage src={property?.photos?.[0]} alt={property?.title || 'Listing'} width={120} className="h-16 w-24 rounded-xl object-cover" /></button>
      <div className="min-w-0 flex-1">
        <button onClick={onOpen} className="block truncate text-left text-sm font-semibold text-ink-900 hover:text-brand-600 dark:text-ink-100">{property?.title || 'Listing removed'}</button>
        {property && <p className="text-xs text-ink-500">{property.locality}, {property.city}</p>}
        <p className="mt-1 text-xs text-ink-600 dark:text-ink-300">{meta}</p>
        {note && <p className="mt-1 text-xs text-ink-500">{note}</p>}
      </div>
      <div className="flex items-center gap-2"><StatusPill status={status} />{actions}</div>
    </div>
  );
}

function CancelBookingModal({ booking, onClose, onDone }: { booking: Booking; onClose: () => void; onDone: (b: Booking) => void }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      onDone((await updateBookingStatus(booking._id, 'cancelled', reason.trim())).booking);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title="Cancel booking" onClose={onClose}>
      <p className="text-sm text-ink-600 dark:text-ink-300">The owner will be told straight away. Any refund of money already paid is between you and the owner under your agreement.</p>
      <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} rows={3} placeholder="Reason (optional, shared with the owner)" className="input mt-4 w-full resize-none" />
      <div className="mt-3"><ErrorText>{error}</ErrorText></div>
      <div className="mt-4 flex gap-3"><button onClick={onClose} className="btn-outline flex-1">Keep booking</button><button onClick={submit} disabled={busy} className="btn-primary flex-1 !bg-danger hover:!bg-danger/90">{busy ? 'Cancelling…' : 'Cancel booking'}</button></div>
    </Modal>
  );
}
