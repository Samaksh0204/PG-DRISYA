import { useEffect, useState } from 'react';
import { Heart, MessageCircle, Calendar, User, ShieldCheck, Settings, Star, Clock, ChevronRight, Bookmark, X, CheckCircle2, AlertCircle, Package, LogIn } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ListingCard } from '../components/ListingCard';
import { VerifiedBadge } from '../components/Badges';
import { fetchListings, fetchMyVisits } from '../lib/api';
import type { PropertyListing } from '../types';

type Tab = 'saved' | 'visits' | 'bookings' | 'messages' | 'profile' | 'notifications';

export function TenantDashboardPage() {
  const { navigate, wishlist, auth, authLoading } = useApp();
  const [tab, setTab] = useState<Tab>('saved');
  const [allListings, setAllListings] = useState<PropertyListing[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchListings().then(setAllListings).catch(() => {});
    if (auth) {
      fetchMyVisits()
        .then((data) => { setVisits(data.visits || []); setLoading(false); })
        .catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [auth?.id]);

  const savedListings = allListings.filter((l) => wishlist.includes(l.id));
  const tabs: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }>; count?: number }[] = [
    { key: 'saved', label: 'Saved', icon: Heart, count: wishlist.length },
    { key: 'visits', label: 'Visits', icon: Calendar, count: visits.length },
    { key: 'bookings', label: 'Bookings', icon: Calendar, count: 0 },
    { key: 'messages', label: 'Messages', icon: MessageCircle, count: 0 },
    { key: 'profile', label: 'Profile', icon: User },
    { key: 'notifications', label: 'Settings', icon: Settings },
  ];

  if (!authLoading && !auth) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <User className="h-12 w-12 text-ink-300" />
        <h1 className="mt-3 text-lg font-semibold text-ink-900 dark:text-ink-100">Sign in required</h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Log in to access your dashboard, saved properties, and visits.</p>
        <button onClick={() => navigate('/login?role=tenant')} className="btn-primary mt-4">
          <LogIn className="h-4 w-4" /> Log in
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container-page py-20">
        <div className="skeleton mb-4 h-12 w-64 rounded-full" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-50/30 dark:bg-ink-950">
      <div className="container-page py-8">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white">My Dashboard</h1>
          <p className="text-sm text-ink-500 dark:text-ink-400">Welcome back, {auth?.name || 'Guest'} — here's your housing journey</p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          <aside className="lg:col-span-1">
            <div className="card overflow-hidden">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition ${
                    tab === t.key
                      ? 'bg-coral-50 font-semibold text-coral-700 dark:bg-coral-900/20 dark:text-coral-300'
                      : 'text-ink-600 hover:bg-ink-50 dark:text-ink-300 dark:hover:bg-ink-800'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <t.icon className="h-4 w-4" />
                    {t.label}
                  </span>
                  {t.count !== undefined && t.count > 0 && (
                    <span className="rounded-full bg-coral-500 px-1.5 py-0.5 text-xs font-bold text-white">{t.count}</span>
                  )}
                </button>
              ))}
            </div>
          </aside>

          <div className="lg:col-span-3">
            {tab === 'saved' && (
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-display text-lg font-bold text-ink-900 dark:text-white">Saved properties</h2>
                  <span className="text-sm text-ink-400">{savedListings.length} saved</span>
                </div>
                <div className="mb-6 flex flex-wrap gap-2">
                  <div className="flex items-center gap-2 rounded-full border border-ink-200 bg-white px-3 py-1.5 text-xs dark:border-ink-700 dark:bg-ink-900">
                    <Bookmark className="h-3.5 w-3.5 text-coral-500" />
                    <span className="font-medium text-ink-700 dark:text-ink-200">Saved</span>
                    <span className="text-ink-400">{savedListings.length}</span>
                  </div>
                  <button className="flex items-center gap-1 rounded-full border border-dashed border-ink-300 px-3 py-1.5 text-xs text-ink-500 hover:border-coral-400 hover:text-coral-500">
                    <Package className="h-3.5 w-3.5" /> New collection
                  </button>
                </div>
                {savedListings.length > 0 ? (
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                    {savedListings.map((l, i) => (
                      <ListingCard key={l.id} listing={l} index={i} />
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={Heart} title="No saved properties yet" desc="Tap the heart icon on any listing to save it here." action={{ label: 'Explore PGs', onClick: () => navigate('/search') }} />
                )}
              </div>
            )}

            {tab === 'visits' && (
              <div>
                <h2 className="mb-4 font-display text-lg font-bold text-ink-900 dark:text-white">Scheduled visits</h2>
                <div className="space-y-3">
                  {visits.length > 0 ? visits.map((v: any) => {
                    const statusConfig: Record<string, { label: string; cls: string; icon: React.ComponentType<{ className?: string }> }> = {
                      pending: { label: 'Pending', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', icon: Clock },
                      confirmed: { label: 'Confirmed', cls: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300', icon: CheckCircle2 },
                      rejected: { label: 'Rejected', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', icon: X },
                      completed: { label: 'Completed', cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300', icon: CheckCircle2 },
                      cancelled: { label: 'Cancelled', cls: 'bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-300', icon: X },
                    };
                    const sc = statusConfig[v.status] || statusConfig.pending;
                    const prop = v.propertyId;
                    return (
                      <div key={v._id} className="card flex items-center gap-4 p-4">
                        {prop && <img src={prop.photos?.[0]} alt="" className="h-16 w-16 cursor-pointer rounded-xl object-cover" onClick={() => navigate(`/listing/${prop._id}`)} />}
                        <div className="flex-1">
                          {prop && <p className="cursor-pointer text-sm font-semibold text-ink-900 hover:text-coral-500 dark:text-ink-100" onClick={() => navigate(`/listing/${prop._id}`)}>{prop.title}</p>}
                          {prop && <p className="text-xs text-ink-400">{prop.locality}, {prop.city}</p>}
                          <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">{v.timeSlot} · {new Date(v.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                        </div>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${sc.cls}`}>
                          <sc.icon className="h-3 w-3" /> {sc.label}
                        </span>
                      </div>
                    );
                  }) : (
                    <EmptyState icon={Calendar} title="No visits yet" desc="Schedule a visit from any listing page." action={{ label: 'Explore PGs', onClick: () => navigate('/search') }} />
                  )}
                </div>
              </div>
            )}

            {tab === 'bookings' && (
              <div>
                <h2 className="mb-4 font-display text-lg font-bold text-ink-900 dark:text-white">Booking history</h2>
                <EmptyState icon={Calendar} title="No bookings yet" desc="Your confirmed bookings will appear here with receipts and move-in details." action={{ label: 'Explore PGs', onClick: () => navigate('/search') }} />
              </div>
            )}

            {tab === 'messages' && (
              <div>
                <h2 className="mb-4 font-display text-lg font-bold text-ink-900 dark:text-white">Recent conversations</h2>
                <EmptyState icon={MessageCircle} title="No messages yet" desc="Start a conversation with an owner from any listing page." action={{ label: 'Explore PGs', onClick: () => navigate('/search') }} />
              </div>
            )}

            {tab === 'profile' && (
              <div className="space-y-6">
                <div className="card p-6">
                  <h2 className="mb-4 font-display text-lg font-bold text-ink-900 dark:text-white">Profile & verification</h2>
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-coral-100 text-2xl font-bold text-coral-700 dark:bg-coral-900/30 dark:text-coral-300">
                      {(auth?.name || 'P').charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-lg font-semibold text-ink-900 dark:text-ink-100">{auth?.name || 'Tenant'}</p>
                        {auth?.verified && <VerifiedBadge />}
                      </div>
                      <p className="text-sm text-ink-400">{auth?.email}</p>
                    </div>
                  </div>
                  <div className="mt-6">
                    <h3 className="mb-3 text-sm font-semibold text-ink-700 dark:text-ink-200">Verification status</h3>
                    <div className="space-y-2">
                      <VerifyRow label="Email" status="verified" />
                      <VerifyRow label="Phone" status={auth?.verified ? 'verified' : 'unverified'} />
                      <VerifyRow label="Aadhaar" status={auth?.verified ? 'verified' : 'unverified'} />
                      <VerifyRow label="College ID" status={auth?.verified ? 'verified' : 'under_review'} />
                    </div>
                  </div>
                  <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <StatBox label="Visits" value={String(visits.length)} />
                    <StatBox label="Bookings" value="0" />
                    <StatBox label="Reviews given" value="0" />
                    <StatBox label="Saved" value={String(wishlist.length)} />
                  </div>
                </div>
              </div>
            )}

            {tab === 'notifications' && (
              <div className="card p-6">
                <h2 className="mb-4 font-display text-lg font-bold text-ink-900 dark:text-white">Notification settings</h2>
                <div className="space-y-3">
                  {['New messages from owners', 'Verification status updates', 'Price drops on saved listings', 'Visit reminders', 'New listings in your area', 'Drisya Expert offers'].map((s) => (
                    <label key={s} className="flex items-center justify-between rounded-lg border border-ink-100 p-3 dark:border-ink-800">
                      <span className="text-sm text-ink-700 dark:text-ink-200">{s}</span>
                      <div className="flex gap-3">
                        {['In-app', 'Email', 'SMS'].map((ch) => (
                          <label key={ch} className="flex items-center gap-1.5 text-xs text-ink-500">
                            <input type="checkbox" defaultChecked={ch === 'In-app'} className="h-3.5 w-3.5 rounded accent-coral-500" />
                            {ch}
                          </label>
                        ))}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, desc, action }: { icon: React.ComponentType<{ className?: string }>; title: string; desc: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-200 py-16 text-center dark:border-ink-700">
      <Icon className="h-10 w-10 text-ink-300" />
      <h3 className="mt-3 text-base font-semibold text-ink-900 dark:text-ink-100">{title}</h3>
      <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{desc}</p>
      {action && <button onClick={action.onClick} className="btn-primary mt-4">{action.label}</button>}
    </div>
  );
}

function VerifyRow({ label, status }: { label: string; status: 'verified' | 'under_review' | 'unverified' }) {
  const config = {
    verified: { icon: CheckCircle2, cls: 'text-teal-600', text: 'Verified' },
    under_review: { icon: Clock, cls: 'text-amber-600', text: 'Under review' },
    unverified: { icon: AlertCircle, cls: 'text-ink-400', text: 'Not submitted' },
  };
  const c = config[status];
  return (
    <div className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2.5 dark:border-ink-800">
      <span className="text-sm text-ink-700 dark:text-ink-200">{label}</span>
      <span className={`flex items-center gap-1.5 text-xs font-medium ${c.cls}`}>
        <c.icon className="h-4 w-4" /> {c.text}
      </span>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-ink-50 p-3 text-center dark:bg-ink-800">
      <p className="font-display text-xl font-bold text-ink-900 dark:text-ink-100">{value}</p>
      <p className="text-xs text-ink-400">{label}</p>
    </div>
  );
}
