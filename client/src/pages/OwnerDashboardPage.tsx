import { useCallback, useEffect, useRef, useState } from 'react';
import {
  LayoutDashboard, Building2, Star, Eye, Calendar, Plus, Pause, Edit, Trash2, CheckCircle2, X, Zap, Loader2, ImagePlus,
  Luggage, Crosshair, ArrowRight, AlertTriangle, MessageCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AMENITIES } from '../data/amenities';
import {
  fetchOwnerListings, fetchOwnerVisits, fetchOwnerBookings, fetchOwnerReviews, createListing, updateListing, setListingStatus,
  deleteListing, updateVisitStatus, updateBookingStatus, replyToReview, uploadImages, becomeOwner,
} from '../lib/api';
import { setToken } from '../lib/api';
import { Avatar, EmptyState, SignInRequired, StatusPill, PageLoader, SafeImage, Modal, ErrorText, Stars } from '../components/ui';
import { formatINR, formatDay, formatDate, localISODate, routeParams } from '../lib/format';
import type { Booking, PersonSummary, PropertyListing, Review, Visit } from '../types';

type Tab = 'overview' | 'listings' | 'bookings' | 'visits' | 'reviews';

export function OwnerDashboardPage() {
  const { navigate, auth, authLoading, setAuthUser, toast, route } = useApp();
  const initial = routeParams(route).get('tab') as Tab | null;
  const [tab, setTab] = useState<Tab>(initial || 'overview');
  const [listings, setListings] = useState<PropertyListing[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<PropertyListing | 'new' | null>(null);
  const [responding, setResponding] = useState<{ booking: Booking; status: 'declined' | 'cancelled' } | null>(null);
  const isHost = auth?.role === 'owner' || auth?.role === 'admin';

  // Follow links like /owner?tab=bookings (from notifications) even when already on this page.
  useEffect(() => {
    const t = routeParams(route).get('tab') as Tab | null;
    if (t && ['overview', 'listings', 'bookings', 'visits', 'reviews'].includes(t)) setTab(t);
  }, [route]);

  const load = useCallback(async () => {
    const [l, v, b, r] = await Promise.all([
      fetchOwnerListings().catch(() => []),
      fetchOwnerVisits().catch(() => []),
      fetchOwnerBookings().catch(() => []),
      fetchOwnerReviews().catch(() => []),
    ]);
    setListings(l); setVisits(v); setBookings(b); setReviews(r);
    setLoading(false);
  }, []);

  useEffect(() => { if (isHost) load(); else setLoading(false); }, [isHost, load]);

  if (authLoading) return <PageLoader />;
  if (!auth) return <SignInRequired message="Log in to list and manage your PG." role="owner" />;

  if (!isHost) {
    return (
      <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-12 text-center">
        <Building2 className="h-12 w-12 text-brand-500" />
        <h1 className="mt-4 font-display text-2xl font-bold text-ink-900 dark:text-white">List your PG on Drisya</h1>
        <p className="mt-2 max-w-md text-sm text-ink-500">Listing is free. Your account stays the same — you'll get a host dashboard to manage listings, visits and booking requests.</p>
        <button
          className="btn-primary mt-6"
          onClick={async () => {
            try {
              const res = await becomeOwner();
              setToken(res.token);
              setAuthUser(res.user);
              toast("You're now a host. Add your first listing!");
            } catch (err) {
              toast((err as Error).message, 'error');
            }
          }}
        >
          Become a host
        </button>
      </div>
    );
  }
  if (loading) return <PageLoader />;

  const pendingBookings = bookings.filter((b) => b.status === 'pending');
  const pendingVisits = visits.filter((v) => v.status === 'pending');
  const unanswered = reviews.filter((r) => !r.ownerReply);
  const totalViews = listings.reduce((s, l) => s + l.views, 0);

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try { await fn(); toast(ok); await load(); } catch (err) { toast((err as Error).message, 'error'); }
  };

  const tabs: { key: Tab; label: string; icon: React.ElementType; count?: number }[] = [
    { key: 'overview', label: 'Overview', icon: LayoutDashboard },
    { key: 'listings', label: 'Listings', icon: Building2, count: listings.length },
    { key: 'bookings', label: 'Booking requests', icon: Luggage, count: pendingBookings.length },
    { key: 'visits', label: 'Visits', icon: Calendar, count: pendingVisits.length },
    { key: 'reviews', label: 'Reviews', icon: Star, count: unanswered.length },
  ];

  return (
    <div className="min-h-screen bg-ink-50/30 dark:bg-ink-950">
      {editing && <ListingWizard editing={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={(p, isNew) => { setEditing(null); toast(isNew && p.status === 'pending_review' ? 'Submitted! Our team will review it within 1–2 working days.' : 'Listing saved'); load(); }} />}
      {responding && <RespondModal {...responding} onClose={() => setResponding(null)} onDone={() => { setResponding(null); load(); }} />}

      <div className="container-page py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white">Host dashboard</h1>
            <p className="text-sm text-ink-500 dark:text-ink-400">Manage your PGs, requests and reviews.</p>
          </div>
          <button onClick={() => setEditing('new')} className="btn-primary"><Plus className="h-4 w-4" /> Add listing</button>
        </div>

        <div className="mb-6 flex gap-2 overflow-x-auto border-b border-ink-100 dark:border-ink-800" role="tablist">
          {tabs.map((t) => (
            <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}
              className={`-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium ${tab === t.key ? 'border-brand-500 text-brand-600' : 'border-transparent text-ink-500 hover:text-ink-800 dark:hover:text-ink-200'}`}>
              <t.icon className="h-4 w-4" /> {t.label} {!!t.count && <span className="rounded-full bg-brand-500 px-1.5 text-xs font-bold text-white">{t.count}</span>}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Stat label="Live listings" value={listings.filter((l) => l.status === 'active').length} icon={Building2} />
              <Stat label="Listing views" value={totalViews} icon={Eye} />
              <Stat label="Pending requests" value={pendingBookings.length + pendingVisits.length} icon={Calendar} />
              <Stat label="Average rating" value={reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : '—'} icon={Star} />
            </div>
            {listings.some((l) => l.status === 'rejected') && (
              <div className="flex items-start gap-3 rounded-xl border border-danger/20 bg-danger/5 p-4 text-sm text-danger dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                <AlertTriangle className="h-5 w-5 shrink-0" /> Some listings need changes before they can go live. <button className="font-semibold underline" onClick={() => setTab('listings')}>Review them</button>
              </div>
            )}
            <Todo title="Booking requests waiting for you" items={pendingBookings.length} onClick={() => setTab('bookings')} />
            <Todo title="Visit requests to confirm" items={pendingVisits.length} onClick={() => setTab('visits')} />
            <Todo title="Reviews without a reply" items={unanswered.length} onClick={() => setTab('reviews')} />
            {listings.length === 0 && <EmptyState icon={Building2} title="Add your first PG" desc="Listing is free. New listings are reviewed by our team before going live." action={{ label: 'Add listing', onClick: () => setEditing('new') }} />}
          </div>
        )}

        {tab === 'listings' && (listings.length ? (
          <div className="space-y-4">
            {listings.map((l) => (
              <div key={l.id} className="card p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <button onClick={() => navigate(`/listing/${l.id}`)} className="shrink-0"><SafeImage src={l.photos[0]} alt={l.title} width={160} className="h-20 w-28 rounded-xl object-cover" /></button>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <button onClick={() => navigate(`/listing/${l.id}`)} className="truncate text-sm font-semibold text-ink-900 hover:text-brand-600 dark:text-ink-100">{l.title}</button>
                      <StatusPill status={l.status} />
                      {l.verified && <span className="text-xs font-semibold text-teal-600">Verified</span>}
                    </div>
                    <p className="text-xs text-ink-500">{l.locality}, {l.city} · {formatINR(l.price)}/mo · {l.roomsAvailable} room{l.roomsAvailable === 1 ? '' : 's'} free</p>
                    <p className="mt-1 flex items-center gap-3 text-xs text-ink-500"><span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {l.views}</span><span className="flex items-center gap-1"><Star className="h-3 w-3" /> {l.reviewCount ? `${l.rating.toFixed(1)} (${l.reviewCount})` : 'No reviews'}</span></p>
                  </div>
                  <div className="flex items-center gap-1">
                    <IconBtn title="Edit" onClick={() => setEditing(l)}><Edit className="h-4 w-4" /></IconBtn>
                    {['active', 'inactive'].includes(l.status) && (
                      <IconBtn title={l.status === 'inactive' ? 'Resume' : 'Pause'} onClick={() => act(() => setListingStatus(l.id, l.status === 'inactive' ? 'active' : 'inactive'), l.status === 'inactive' ? 'Listing is live again' : 'Listing paused')}>
                        {l.status === 'inactive' ? <Zap className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                      </IconBtn>
                    )}
                    <IconBtn title="Delete" danger onClick={() => window.confirm(`Delete "${l.title}"? This can't be undone.`) && act(() => deleteListing(l.id), 'Listing deleted')}><Trash2 className="h-4 w-4" /></IconBtn>
                  </div>
                </div>
                {l.status === 'rejected' && <p className="mt-3 rounded-lg bg-danger/5 p-3 text-xs text-danger dark:bg-red-950/30 dark:text-red-300"><strong>Changes needed:</strong> {l.moderationNote} — edit the listing to resubmit.</p>}
                {l.status === 'pending_review' && <p className="mt-3 text-xs text-amber-700">Waiting for review by the Drisya team (usually 1–2 working days).</p>}
                {l.status === 'inactive' && l.moderationNote && <p className="mt-3 text-xs text-ink-500">Note from Drisya: {l.moderationNote}</p>}
              </div>
            ))}
          </div>
        ) : <EmptyState icon={Building2} title="No listings yet" action={{ label: 'Add listing', onClick: () => setEditing('new') }} />)}

        {tab === 'bookings' && (bookings.length ? (
          <div className="space-y-3">
            {bookings.map((b) => {
              const tenant = b.tenantId as PersonSummary;
              return (
                <div key={b._id} className="card p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Avatar src={tenant?.avatar} name={tenant?.fullName || 'Former member'} className="h-12 w-12 rounded-full bg-ink-100 object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ink-900 dark:text-ink-100">{tenant?.fullName || 'Former member'} {tenant?.emailVerified && <span className="text-xs font-normal text-teal-600">· email confirmed</span>}</p>
                      <p className="text-xs text-ink-500">{b.propertyId?.title} · move-in {formatDay(b.moveInDate)} · {b.durationMonths} month{b.durationMonths > 1 ? 's' : ''} · {b.occupants} person{b.occupants > 1 ? 's' : ''}</p>
                      {b.message && <p className="mt-1 text-xs italic text-ink-600 dark:text-ink-300">"{b.message}"</p>}
                      {['accepted', 'completed'].includes(b.status) && tenant?.phone && <p className="mt-1 text-xs text-ink-600">Phone: <a className="underline" href={`tel:${tenant.phone}`}>{tenant.phone}</a></p>}
                      {b.instant && <p className="mt-1 text-xs text-brand-600">Instant booking</p>}
                    </div>
                    <StatusPill status={b.status} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-ink-100 pt-3 dark:border-ink-800">
                    {b.status === 'pending' && <>
                      <button onClick={() => act(() => updateBookingStatus(b._id, 'accepted'), 'Booking accepted — the tenant has been notified')} className="btn-primary text-xs"><CheckCircle2 className="h-3.5 w-3.5" /> Accept</button>
                      <button onClick={() => setResponding({ booking: b, status: 'declined' })} className="btn-outline text-xs"><X className="h-3.5 w-3.5" /> Decline</button>
                    </>}
                    {b.status === 'accepted' && <>
                      {b.moveInDate <= localISODate() && <button onClick={() => act(() => updateBookingStatus(b._id, 'completed'), 'Marked as moved in')} className="btn-outline text-xs">Mark moved in</button>}
                      <button onClick={() => setResponding({ booking: b, status: 'cancelled' })} className="btn-ghost text-xs text-danger">Cancel booking</button>
                    </>}
                    <button onClick={() => navigate('/messages')} className="btn-ghost text-xs"><MessageCircle className="h-3.5 w-3.5" /> Messages</button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : <EmptyState icon={Luggage} title="No booking requests yet" desc="Requests from tenants appear here. Turn on Instant Book to confirm automatically." />)}

        {tab === 'visits' && (visits.length ? (
          <div className="space-y-3">
            {visits.map((v) => {
              const tenant = v.tenantId as PersonSummary;
              return (
                <div key={v._id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink-900 dark:text-ink-100">{tenant?.fullName || 'Former member'} · {formatDay(v.date)} at {v.timeSlot}</p>
                    <p className="text-xs text-ink-500">{v.propertyId?.title}</p>
                    {v.message && <p className="mt-1 text-xs italic text-ink-600 dark:text-ink-300">"{v.message}"</p>}
                    {v.status === 'confirmed' && tenant?.phone && <p className="mt-1 text-xs">Phone: <a className="underline" href={`tel:${tenant.phone}`}>{tenant.phone}</a></p>}
                  </div>
                  <StatusPill status={v.status} />
                  <div className="flex gap-2">
                    {v.status === 'pending' && <>
                      <button onClick={() => act(() => updateVisitStatus(v._id, 'confirmed'), 'Visit confirmed')} className="btn-primary text-xs">Confirm</button>
                      <button onClick={() => act(() => updateVisitStatus(v._id, 'rejected'), 'Visit declined')} className="btn-outline text-xs">Decline</button>
                    </>}
                    {v.status === 'confirmed' && v.date <= localISODate() && <button onClick={() => act(() => updateVisitStatus(v._id, 'completed'), 'Visit marked as done — the tenant can now review')} className="btn-outline text-xs">Mark visited</button>}
                    {v.status === 'confirmed' && <button onClick={() => act(() => updateVisitStatus(v._id, 'cancelled'), 'Visit cancelled')} className="btn-ghost text-xs text-danger">Cancel</button>}
                  </div>
                </div>
              );
            })}
          </div>
        ) : <EmptyState icon={Calendar} title="No visit requests yet" />)}

        {tab === 'reviews' && (reviews.length ? (
          <div className="space-y-4">{reviews.map((r) => <OwnerReviewCard key={r.id} review={r} onReplied={load} />)}</div>
        ) : <EmptyState icon={Star} title="No reviews yet" desc="Tenants can review after a completed visit or stay." />)}
      </div>
    </div>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: string | number; icon: React.ElementType }) {
  return (
    <div className="card flex items-center gap-3 p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/20"><Icon className="h-5 w-5" /></div>
      <div><p className="font-display text-xl font-bold text-ink-900 dark:text-ink-100">{value}</p><p className="text-xs text-ink-500">{label}</p></div>
    </div>
  );
}

function Todo({ title, items, onClick }: { title: string; items: number; onClick: () => void }) {
  if (!items) return null;
  return (
    <button onClick={onClick} className="card flex w-full items-center justify-between p-4 text-left hover:shadow-card-hover">
      <span className="text-sm font-medium text-ink-800 dark:text-ink-200">{title}</span>
      <span className="flex items-center gap-2 text-sm font-semibold text-brand-600">{items} <ArrowRight className="h-4 w-4" /></span>
    </button>
  );
}

function IconBtn({ title, onClick, children, danger }: { title: string; onClick: () => void; children: React.ReactNode; danger?: boolean }) {
  return <button title={title} aria-label={title} onClick={onClick} className={`rounded-lg p-2 text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800 ${danger ? 'hover:text-danger' : 'hover:text-ink-800'}`}>{children}</button>;
}

function RespondModal({ booking, status, onClose, onDone }: { booking: Booking; status: 'declined' | 'cancelled'; onClose: () => void; onDone: () => void }) {
  const { toast } = useApp();
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      await updateBookingStatus(booking._id, status, reason.trim());
      toast(status === 'declined' ? 'Request declined' : 'Booking cancelled');
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title={status === 'declined' ? 'Decline request' : 'Cancel booking'} onClose={onClose}>
      <p className="text-sm text-ink-600 dark:text-ink-300">Let the tenant know why (optional, but appreciated).</p>
      <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} rows={3} className="input mt-3 w-full resize-none" placeholder="e.g. No rooms free for those dates" />
      <div className="mt-3"><ErrorText>{error}</ErrorText></div>
      <div className="mt-4 flex gap-3"><button onClick={onClose} className="btn-outline flex-1">Back</button><button onClick={submit} disabled={busy} className="btn-primary flex-1">{busy ? 'Saving…' : 'Confirm'}</button></div>
    </Modal>
  );
}

function OwnerReviewCard({ review, onReplied }: { review: Review; onReplied: () => void }) {
  const { toast } = useApp();
  const [text, setText] = useState(review.ownerReply?.text || '');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      await replyToReview(review.id, text.trim());
      toast('Reply posted');
      setOpen(false);
      onReplied();
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink-900 dark:text-ink-100">{review.author} <span className="font-normal text-ink-500">on {review.propertyTitle}</span></p>
          <p className="text-xs text-ink-500">{formatDate(review.date)}{review.verifiedStay && ' · stayed here'}</p>
        </div>
        <Stars value={review.rating} />
      </div>
      {review.text && <p className="mt-3 text-sm text-ink-700 dark:text-ink-300">{review.text}</p>}
      {review.ownerReply && !open && <div className="mt-3 rounded-xl bg-ink-50 p-3 text-sm dark:bg-ink-800"><p className="text-xs font-semibold">Your reply</p><p className="mt-1">{review.ownerReply.text}</p></div>}
      {open ? (
        <div className="mt-3">
          <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} rows={3} className="input w-full resize-none" placeholder="Thank the guest or address their feedback. Replies are public." />
          <div className="mt-2 flex gap-2"><button onClick={() => setOpen(false)} className="btn-outline text-xs">Cancel</button><button onClick={save} disabled={!text.trim() || busy} className="btn-primary text-xs">Post reply</button></div>
        </div>
      ) : <button onClick={() => setOpen(true)} className="btn-ghost mt-2 text-xs">{review.ownerReply ? 'Edit reply' : 'Reply publicly'}</button>}
    </div>
  );
}

/* ── Listing wizard ─────────────────────────────────────────────────── */

function ListingWizard({ editing, onClose, onSaved }: { editing: PropertyListing | null; onClose: () => void; onSaved: (p: PropertyListing, isNew: boolean) => void }) {
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    title: editing?.title ?? '',
    city: editing?.city ?? '',
    locality: editing?.locality ?? '',
    distanceFromLandmark: editing?.distanceFromLandmark ?? '',
    price: editing ? String(editing.price) : '',
    deposit: editing?.deposit ? String(editing.deposit) : '',
    occupancy: editing?.occupancy ?? 'double',
    genderPreference: editing?.genderPreference ?? 'coed',
    roomsAvailable: String(editing?.roomsAvailable ?? 1),
    moveInDate: editing?.moveInDate ?? '',
    amenities: editing?.amenities ?? [],
    rules: (editing?.rules ?? []).join('\n'),
    description: editing?.description ?? '',
    photos: editing?.photos ?? [],
    instantBook: editing?.instantBook ?? false,
    lat: editing?.lat ? String(editing.lat) : '',
    lng: editing?.lng ? String(editing.lng) : '',
  });
  const set = (k: keyof typeof form, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const stepError = (s: number): string => {
    if (s === 1) {
      if (!form.title.trim()) return 'Please add a title';
      if (!form.city.trim()) return 'Please add the city';
      if (!(Number(form.price) > 0)) return 'Monthly rent must be more than 0';
      if (Number(form.deposit) < 0) return 'Deposit cannot be negative';
    }
    if (s === 3 && (form.lat || form.lng)) {
      const lat = Number(form.lat), lng = Number(form.lng);
      if (!(lat >= -90 && lat <= 90) || !(lng >= -180 && lng <= 180) || !form.lat || !form.lng) return 'Enter both latitude and longitude, or leave both empty';
    }
    if (s === 4 && form.photos.length === 0) return 'Add at least one photo — listings without photos are not approved';
    return '';
  };
  const next = () => { const e = stepError(step); setError(e); if (!e) setStep((s) => s + 1); };

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (form.photos.length + files.length > 15) { setError('A listing can have at most 15 photos'); return; }
    setUploading(true);
    setError('');
    try {
      const urls = await uploadImages(files);
      setForm((f) => ({ ...f, photos: [...f.photos, ...urls] }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return setError('Your browser cannot share location');
    navigator.geolocation.getCurrentPosition(
      (pos) => { set('lat', pos.coords.latitude.toFixed(6)); set('lng', pos.coords.longitude.toFixed(6)); },
      () => setError('Could not get your location. You can type the coordinates instead (right-click the spot in Google Maps to copy them).'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const submit = async () => {
    const e = stepError(4) || stepError(1) || stepError(3);
    if (e) return setError(e);
    setBusy(true);
    setError('');
    const body = {
      title: form.title.trim(), city: form.city.trim(), locality: form.locality.trim(), distanceFromLandmark: form.distanceFromLandmark.trim(),
      price: Number(form.price), deposit: Number(form.deposit) || 0, occupancy: form.occupancy, genderPreference: form.genderPreference,
      roomsAvailable: Math.max(0, Math.floor(Number(form.roomsAvailable) || 0)), moveInDate: form.moveInDate,
      amenities: form.amenities, rules: form.rules.split('\n').map((r) => r.trim()).filter(Boolean), description: form.description.trim(),
      photos: form.photos, instantBook: form.instantBook, lat: form.lat ? Number(form.lat) : 0, lng: form.lng ? Number(form.lng) : 0,
    };
    try {
      const saved = editing ? await updateListing(editing.id, body) : await createListing(body);
      onSaved(saved, !editing);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const STEPS = ['Basics', 'Details', 'Location', 'Photos'];
  return (
    <Modal title={editing ? 'Edit listing' : 'Add a new listing'} onClose={onClose} wide>
      <div className="mb-5 flex gap-2">{STEPS.map((s, i) => <div key={s} className="flex-1"><div className={`h-1 rounded-full ${i < step ? 'bg-brand-500' : 'bg-ink-200 dark:bg-ink-700'}`} /><p className="mt-1 text-[11px] text-ink-500">{s}</p></div>)}</div>

      {step === 1 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field className="sm:col-span-2" label="Title" value={form.title} onChange={(v) => set('title', v)} placeholder="e.g. Sunrise Girls PG near DAVV" />
          <Field label="City" value={form.city} onChange={(v) => set('city', v)} placeholder="Indore" />
          <Field label="Locality" value={form.locality} onChange={(v) => set('locality', v)} placeholder="Vijay Nagar" />
          <Field label="Monthly rent (₹)" type="number" value={form.price} onChange={(v) => set('price', v)} placeholder="8000" />
          <Field label="Security deposit (₹)" type="number" value={form.deposit} onChange={(v) => set('deposit', v)} placeholder="16000" />
          <Select label="Room type" value={form.occupancy} onChange={(v) => set('occupancy', v)} options={[['single', 'Single'], ['double', 'Double sharing'], ['triple', 'Triple sharing'], ['dorm', 'Dormitory']]} />
          <Select label="For" value={form.genderPreference} onChange={(v) => set('genderPreference', v)} options={[['male', 'Men'], ['female', 'Women'], ['coed', 'Co-ed']]} />
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Rooms available now" type="number" value={form.roomsAvailable} onChange={(v) => set('roomsAvailable', v)} />
            <Field label="Available from" type="date" value={form.moveInDate} onChange={(v) => set('moveInDate', v)} />
            <Field label="Nearby landmark" value={form.distanceFromLandmark} onChange={(v) => set('distanceFromLandmark', v)} placeholder="1 km from DAVV" />
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-ink-600 dark:text-ink-300">Amenities</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {AMENITIES.map((a) => (
                <button key={a.key} type="button" onClick={() => set('amenities', form.amenities.includes(a.key) ? form.amenities.filter((x) => x !== a.key) : [...form.amenities, a.key])}
                  className={`rounded-lg border px-3 py-2 text-xs ${form.amenities.includes(a.key) ? 'border-brand-400 bg-brand-50 font-semibold text-brand-700 dark:bg-brand-900/20 dark:text-brand-300' : 'border-ink-200 text-ink-600 dark:border-ink-700 dark:text-ink-300'}`}>{a.label}</button>
              ))}
            </div>
          </div>
          <label className="block text-xs font-medium text-ink-600 dark:text-ink-300">Description
            <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={4} maxLength={5000} className="input mt-1 w-full resize-none" placeholder="Food, nearby colleges/offices, transport, what makes it special…" />
          </label>
          <label className="block text-xs font-medium text-ink-600 dark:text-ink-300">House rules (one per line)
            <textarea value={form.rules} onChange={(e) => set('rules', e.target.value)} rows={3} className="input mt-1 w-full resize-none" placeholder={'Gate closes at 10:30 PM\nNo smoking'} />
          </label>
          <label className="flex items-start gap-2 text-sm text-ink-700 dark:text-ink-200">
            <input type="checkbox" checked={form.instantBook} onChange={(e) => set('instantBook', e.target.checked)} className="mt-1 h-4 w-4 accent-brand-500" />
            <span><strong>Instant Book</strong> — booking requests are accepted automatically while rooms are available. You can still cancel if needed.</span>
          </label>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <p className="text-sm text-ink-600 dark:text-ink-300">Add a map pin so tenants can find you in map search. Only the approximate area is shown publicly.</p>
          <button type="button" onClick={useMyLocation} className="btn-outline"><Crosshair className="h-4 w-4" /> Use my current location</button>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Latitude" value={form.lat} onChange={(v) => set('lat', v)} placeholder="22.7533" />
            <Field label="Longitude" value={form.lng} onChange={(v) => set('lng', v)} placeholder="75.8937" />
          </div>
          <p className="text-xs text-ink-500">Tip: in Google Maps, right-click your building and click the numbers to copy them.</p>
        </div>
      )}

      {step === 4 && (
        <div>
          {form.photos.length > 0 && (
            <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
              {form.photos.map((url, i) => (
                <div key={url + i} className="group relative aspect-square overflow-hidden rounded-lg">
                  <img src={url} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                  {i === 0 && <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 text-[10px] text-white">Cover</span>}
                  <button type="button" aria-label="Remove photo" onClick={() => set('photos', form.photos.filter((_, j) => j !== i))} className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white"><X className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
          )}
          <input ref={fileRef} type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={upload} className="hidden" />
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-ink-300 p-6 text-center hover:border-brand-400 disabled:opacity-50 dark:border-ink-600">
            {uploading ? <Loader2 className="h-8 w-8 animate-spin text-brand-500" /> : <ImagePlus className="h-8 w-8 text-ink-300" />}
            <span className="text-sm font-medium">{uploading ? 'Uploading…' : 'Add photos'}</span>
            <span className="text-xs text-ink-500">Real photos of rooms, washroom, kitchen and building. JPG/PNG/WebP, max 15. Large photos are resized automatically.</span>
          </button>
          {!editing && <p className="mt-3 text-xs text-ink-500">By submitting you confirm you own or manage this property and the details are accurate. Our team reviews every new listing.</p>}
        </div>
      )}

      <div className="mt-4"><ErrorText>{error}</ErrorText></div>
      <div className="mt-6 flex items-center justify-between">
        {step > 1 ? <button onClick={() => { setError(''); setStep((s) => s - 1); }} className="btn-outline">Back</button> : <span />}
        {step < 4 ? <button onClick={next} className="btn-primary">Next <ArrowRight className="h-4 w-4" /></button>
          : <button onClick={submit} disabled={busy || uploading} className="btn-primary">{busy ? 'Saving…' : editing ? 'Save changes' : 'Submit for review'}</button>}
      </div>
    </Modal>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text', className = '' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; className?: string }) {
  return (
    <label className={`block text-xs font-medium text-ink-600 dark:text-ink-300 ${className}`}>
      {label}
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="input mt-1 w-full" min={type === 'number' ? 0 : undefined} />
    </label>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <label className="block text-xs font-medium text-ink-600 dark:text-ink-300">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} className="input mt-1 w-full">{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
    </label>
  );
}
