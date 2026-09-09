import { useEffect, useState, useRef } from 'react';
import {
  LayoutDashboard, Building2, MessageCircle, Star, CreditCard, ShieldCheck, User,
  Eye, TrendingUp, Calendar, Plus, Pause, Edit, Trash2,
  ArrowRight, CheckCircle2, Clock, AlertCircle, X, Upload, Zap, LogIn, Loader2, ImagePlus,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { VerifiedBadge, FeaturedBadge } from '../components/Badges';
import { AMENITIES } from '../data/amenities';
import { fetchOwnerListings, fetchOwnerVisits, fetchOwnerAnalytics, createListing, updateVisitStatus, uploadImages } from '../lib/api';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import type { PropertyListing } from '../types';

type Tab = 'overview' | 'listings' | 'visits' | 'reviews' | 'earnings' | 'analytics' | 'profile';

interface Analytics {
  totalListings: number; activeListings: number; totalViews: number;
  totalRooms: number; avgRating: number; totalReviews: number;
  visits: { pending: number; confirmed: number; completed: number; cancelled: number };
  propertyStats: Array<{ id: string; title: string; city: string; views: number; rating: number; reviewCount: number; roomsAvailable: number; status: string; price: number }>;
}

export function OwnerDashboardPage() {
  useDocumentTitle('Owner Dashboard');
  const { navigate, auth, authLoading } = useApp();
  const [tab, setTab] = useState<Tab>('overview');
  const [listings, setListings] = useState<PropertyListing[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    if (!auth) { setLoading(false); return; }
    Promise.all([
      fetchOwnerListings().catch(() => []),
      fetchOwnerVisits().then((d) => d.visits || []).catch(() => []),
      fetchOwnerAnalytics().catch(() => null),
    ]).then(([props, vis, stats]) => {
      setListings(props);
      setVisits(vis);
      setAnalytics(stats);
      setLoading(false);
    });
  }, [auth?.id]);

  const tabs: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }>; count?: number }[] = [
    { key: 'overview', label: 'Overview', icon: LayoutDashboard },
    { key: 'listings', label: 'My Listings', icon: Building2, count: listings.length },
    { key: 'visits', label: 'Visits', icon: Calendar, count: visits.length },
    { key: 'reviews', label: 'Reviews', icon: Star, count: 0 },
    { key: 'analytics', label: 'Analytics', icon: TrendingUp },
    { key: 'earnings', label: 'Earnings', icon: CreditCard },
    { key: 'profile', label: 'Profile', icon: User },
  ];

  const pendingVisits = visits.filter((v: any) => v.status === 'pending');
  const confirmedVisits = visits.filter((v: any) => v.status === 'confirmed');
  const totalViews = listings.reduce((s, l) => s + l.views, 0);

  if (!authLoading && !auth) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <User className="h-12 w-12 text-ink-300" />
        <h1 className="mt-3 text-lg font-semibold text-ink-900 dark:text-ink-100">Sign in required</h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Log in to manage your PG listings and visits.</p>
        <button onClick={() => navigate('/login?role=owner')} className="btn-primary mt-4">
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
      {showWizard && <AddListingWizard onClose={() => setShowWizard(false)} onCreated={(p) => { setListings((prev) => [p, ...prev]); setShowWizard(false); }} />}
      <div className="container-page py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white">Owner Dashboard</h1>
            <p className="text-sm text-ink-500 dark:text-ink-400">Welcome, {auth?.name || 'Owner'} — manage your properties</p>
          </div>
          <button onClick={() => setShowWizard(true)} className="btn-primary">
            <Plus className="h-4 w-4" /> Add Listing
          </button>
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
            {/* Overview */}
            {tab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  <OverviewCard label="Active listings" value={String(listings.length)} icon={Building2} color="coral" />
                  <OverviewCard label="Total views" value={String(totalViews)} icon={Eye} color="teal" />
                  <OverviewCard label="Pending visits" value={String(pendingVisits.length)} icon={Clock} color="amber" />
                  <OverviewCard label="Confirmed visits" value={String(confirmedVisits.length)} icon={CheckCircle2} color="green" />
                </div>

                {pendingVisits.length > 0 && (
                  <div className="card p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="font-display text-base font-bold text-ink-900 dark:text-white">Pending visits</h3>
                      <button onClick={() => setTab('visits')} className="flex items-center gap-1 text-xs font-medium text-coral-600 hover:text-coral-700">
                        View all <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="space-y-2">
                      {pendingVisits.slice(0, 3).map((v: any) => {
                        const prop = v.propertyId;
                        return (
                          <div key={v._id} className="flex items-center gap-3 rounded-xl border border-ink-100 p-3 dark:border-ink-800">
                            {prop && <img src={prop.photos?.[0]} alt="" className="h-12 w-12 rounded-lg object-cover" />}
                            <div className="flex-1 min-w-0">
                              <p className="truncate text-sm font-semibold text-ink-900 dark:text-ink-100">{prop?.title || 'Property'}</p>
                              <p className="text-xs text-ink-400">{v.tenantId?.fullName || 'Tenant'} · {v.timeSlot} · {new Date(v.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                            </div>
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                              <Clock className="h-3 w-3" /> Pending
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {listings.length > 0 && (
                  <div className="card p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="font-display text-base font-bold text-ink-900 dark:text-white">Top listings</h3>
                      <button onClick={() => setTab('listings')} className="flex items-center gap-1 text-xs font-medium text-coral-600 hover:text-coral-700">
                        View all <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="space-y-2">
                      {listings.slice(0, 3).map((l) => (
                        <div key={l.id} className="flex items-center gap-3 rounded-xl border border-ink-100 p-3 dark:border-ink-800">
                          <img src={l.photos[0]} alt="" className="h-12 w-12 rounded-lg object-cover" />
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-sm font-semibold text-ink-900 dark:text-ink-100">{l.title}</p>
                            <p className="text-xs text-ink-400">{l.locality}, {l.city}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-ink-900 dark:text-ink-100">₹{l.price.toLocaleString('en-IN')}</p>
                            <p className="flex items-center gap-1 text-xs text-ink-400"><Eye className="h-3 w-3" /> {l.views}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Listings */}
            {tab === 'listings' && (
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-display text-lg font-bold text-ink-900 dark:text-white">My Listings</h2>
                  <button onClick={() => setShowWizard(true)} className="btn-primary text-sm">
                    <Plus className="h-4 w-4" /> Add New
                  </button>
                </div>
                {listings.length > 0 ? (
                  <div className="space-y-4">
                    {listings.map((l) => (
                      <div key={l.id} className="card flex items-center gap-4 p-4">
                        <img
                          src={l.photos[0]}
                          alt=""
                          className="h-20 w-28 cursor-pointer rounded-xl object-cover"
                          onClick={() => navigate(`/listing/${l.id}`)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="cursor-pointer truncate text-sm font-semibold text-ink-900 hover:text-coral-500 dark:text-ink-100" onClick={() => navigate(`/listing/${l.id}`)}>{l.title}</p>
                            {l.verified && <VerifiedBadge />}
                            {l.featured && <FeaturedBadge />}
                          </div>
                          <p className="text-xs text-ink-400">{l.locality}, {l.city}</p>
                          <div className="mt-2 flex items-center gap-4 text-xs text-ink-500 dark:text-ink-400">
                            <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {l.views} views</span>
                            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {visits.filter((v: any) => (typeof v.propertyId === 'object' ? v.propertyId?._id : v.propertyId) === l.id).length} visits</span>
                            <span className="flex items-center gap-1"><Star className="h-3 w-3" /> {l.rating.toFixed(1)}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-base font-bold text-ink-900 dark:text-ink-100">₹{l.price.toLocaleString('en-IN')}<span className="text-xs font-normal text-ink-400">/mo</span></p>
                          <div className="mt-2 flex items-center gap-1">
                            <button className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-600 dark:hover:bg-ink-800">
                              <Edit className="h-4 w-4" />
                            </button>
                            <button className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-amber-600 dark:hover:bg-ink-800">
                              <Pause className="h-4 w-4" />
                            </button>
                            <button className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-red-600 dark:hover:bg-ink-800">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={Building2} title="No listings yet" desc="Add your first PG listing to start receiving tenant visits." action={{ label: 'Add Listing', onClick: () => setShowWizard(true) }} />
                )}
              </div>
            )}

            {/* Visits */}
            {tab === 'visits' && (
              <div>
                <h2 className="mb-4 font-display text-lg font-bold text-ink-900 dark:text-white">Visit requests</h2>
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
                    const tenant = v.tenantId;
                    return (
                      <div key={v._id} className="card p-4">
                        <div className="flex items-center gap-4">
                          {prop && <img src={prop.photos?.[0]} alt="" className="h-16 w-16 cursor-pointer rounded-xl object-cover" onClick={() => navigate(`/listing/${prop._id}`)} />}
                          <div className="flex-1 min-w-0">
                            {prop && <p className="cursor-pointer truncate text-sm font-semibold text-ink-900 hover:text-coral-500 dark:text-ink-100" onClick={() => navigate(`/listing/${prop._id}`)}>{prop.title}</p>}
                            <p className="text-xs text-ink-400">
                              {tenant?.fullName || 'Tenant'} · {v.timeSlot} · {new Date(v.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                            {v.message && <p className="mt-1 text-xs text-ink-500 dark:text-ink-400 italic">"{v.message}"</p>}
                          </div>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${sc.cls}`}>
                            <sc.icon className="h-3 w-3" /> {sc.label}
                          </span>
                        </div>
                        {v.status === 'pending' && (
                          <div className="mt-3 flex items-center gap-2 border-t border-ink-100 pt-3 dark:border-ink-800">
                            <button
                              onClick={() => updateVisitStatus(v._id, 'confirmed').then(() => setVisits((prev) => prev.map((x: any) => x._id === v._id ? { ...x, status: 'confirmed' } : x))).catch(() => {})}
                              className="flex items-center gap-1 rounded-lg bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-100 dark:bg-teal-900/20 dark:text-teal-300"
                            >
                              <CheckCircle2 className="h-3 w-3" /> Confirm
                            </button>
                            <button
                              onClick={() => updateVisitStatus(v._id, 'rejected').then(() => setVisits((prev) => prev.map((x: any) => x._id === v._id ? { ...x, status: 'rejected' } : x))).catch(() => {})}
                              className="flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-300"
                            >
                              <X className="h-3 w-3" /> Decline
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  }) : (
                    <EmptyState icon={Calendar} title="No visits yet" desc="When tenants schedule visits to your properties, they'll appear here." />
                  )}
                </div>
              </div>
            )}

            {/* Reviews */}
            {tab === 'reviews' && (
              <div>
                <h2 className="mb-4 font-display text-lg font-bold text-ink-900 dark:text-white">Reviews</h2>
                <EmptyState icon={Star} title="No reviews yet" desc="Once tenants leave reviews on your properties, they'll show up here." />
              </div>
            )}

            {/* Analytics */}
            {tab === 'analytics' && analytics && (
              <div className="space-y-6">
                <h2 className="font-display text-lg font-bold text-ink-900 dark:text-white">Property Analytics</h2>

                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  <OverviewCard label="Total listings" value={String(analytics.totalListings)} icon={Building2} color="coral" />
                  <OverviewCard label="Active listings" value={String(analytics.activeListings)} icon={CheckCircle2} color="green" />
                  <OverviewCard label="Total views" value={analytics.totalViews.toLocaleString()} icon={Eye} color="teal" />
                  <OverviewCard label="Avg. rating" value={analytics.avgRating ? analytics.avgRating.toFixed(1) : '—'} icon={Star} color="amber" />
                </div>

                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  <OverviewCard label="Total reviews" value={String(analytics.totalReviews)} icon={Star} color="teal" />
                  <OverviewCard label="Rooms available" value={String(analytics.totalRooms)} icon={Building2} color="coral" />
                  <OverviewCard label="Pending visits" value={String(analytics.visits.pending)} icon={Clock} color="amber" />
                  <OverviewCard label="Completed visits" value={String(analytics.visits.completed)} icon={CheckCircle2} color="green" />
                </div>

                {analytics.propertyStats.length > 0 && (
                  <div className="card overflow-hidden">
                    <div className="border-b border-ink-100 px-5 py-3 dark:border-ink-800">
                      <h3 className="font-display text-sm font-bold text-ink-900 dark:text-white">Performance by property</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-ink-100 bg-ink-50/50 dark:border-ink-800 dark:bg-ink-800/50">
                            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-ink-400">Property</th>
                            <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-ink-400">Views</th>
                            <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-ink-400">Rating</th>
                            <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-ink-400">Reviews</th>
                            <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-ink-400">Price</th>
                            <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-ink-400">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analytics.propertyStats.map((p) => (
                            <tr key={p.id} className="border-b border-ink-50 transition hover:bg-ink-50/50 dark:border-ink-800/50 dark:hover:bg-ink-800/30">
                              <td className="px-4 py-3">
                                <button onClick={() => navigate(`/listing/${p.id}`)} className="text-left">
                                  <p className="font-medium text-ink-900 hover:text-coral-500 dark:text-ink-100">{p.title}</p>
                                  <p className="text-xs text-ink-400">{p.city}</p>
                                </button>
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-ink-700 dark:text-ink-200">{p.views.toLocaleString()}</td>
                              <td className="px-4 py-3 text-right text-ink-700 dark:text-ink-200">⭐ {p.rating.toFixed(1)}</td>
                              <td className="px-4 py-3 text-right text-ink-700 dark:text-ink-200">{p.reviewCount}</td>
                              <td className="px-4 py-3 text-right font-medium text-ink-700 dark:text-ink-200">₹{p.price.toLocaleString()}</td>
                              <td className="px-4 py-3 text-center">
                                <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${p.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400'}`}>
                                  {p.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Views bar chart */}
                {analytics.propertyStats.length > 0 && (
                  <div className="card p-5">
                    <h3 className="mb-4 font-display text-sm font-bold text-ink-900 dark:text-white">Views distribution</h3>
                    <div className="space-y-3">
                      {analytics.propertyStats
                        .sort((a, b) => b.views - a.views)
                        .map((p) => {
                          const maxViews = Math.max(...analytics.propertyStats.map((x) => x.views), 1);
                          const pct = Math.round((p.views / maxViews) * 100);
                          return (
                            <div key={p.id}>
                              <div className="mb-1 flex items-center justify-between">
                                <span className="truncate text-xs font-medium text-ink-700 dark:text-ink-200">{p.title}</span>
                                <span className="ml-2 text-xs text-ink-400">{p.views}</span>
                              </div>
                              <div className="h-2 rounded-full bg-ink-100 dark:bg-ink-800">
                                <div className="h-2 rounded-full bg-gradient-to-r from-coral-400 to-coral-600" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Earnings */}
            {tab === 'earnings' && (
              <div>
                <h2 className="mb-4 font-display text-lg font-bold text-ink-900 dark:text-white">Earnings</h2>
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                  <OverviewCard label="This month" value="₹0" icon={CreditCard} color="coral" />
                  <OverviewCard label="Total earned" value="₹0" icon={TrendingUp} color="teal" />
                  <OverviewCard label="Pending payouts" value="₹0" icon={Clock} color="amber" />
                </div>
                <div className="mt-6">
                  <EmptyState icon={CreditCard} title="No earnings data" desc="Earnings tracking will be available once you have confirmed bookings." />
                </div>
              </div>
            )}

            {/* Profile */}
            {tab === 'profile' && (
              <div className="space-y-6">
                <div className="card p-6">
                  <h2 className="mb-4 font-display text-lg font-bold text-ink-900 dark:text-white">Owner profile</h2>
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-coral-100 text-2xl font-bold text-coral-700 dark:bg-coral-900/30 dark:text-coral-300">
                      {(auth?.name || 'O').charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-lg font-semibold text-ink-900 dark:text-ink-100">{auth?.name || 'Owner'}</p>
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
                      <VerifyRow label="Aadhaar / PAN" status={auth?.verified ? 'verified' : 'unverified'} />
                      <VerifyRow label="Property ownership docs" status={auth?.verified ? 'verified' : 'under_review'} />
                    </div>
                  </div>
                  <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <StatBox label="Listings" value={String(listings.length)} />
                    <StatBox label="Total views" value={String(totalViews)} />
                    <StatBox label="Total visits" value={String(visits.length)} />
                    <StatBox label="Rating" value="—" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Add Listing Wizard (UPGRADED: Cloudinary file upload) ── */

function AddListingWizard({ onClose, onCreated }: { onClose: () => void; onCreated: (p: PropertyListing) => void }) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    title: '',
    city: '',
    locality: '',
    price: '',
    deposit: '',
    occupancy: 'single' as string,
    genderPreference: 'coed' as string,
    amenities: [] as string[],
    description: '',
    photos: [] as string[],
    instantBook: false,
  });

  const set = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));
  const toggleAmenity = (key: string) =>
    setForm((f) => ({
      ...f,
      amenities: f.amenities.includes(key) ? f.amenities.filter((a) => a !== key) : [...f.amenities, key],
    }));

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadError('');
    try {
      const urls = await uploadImages(Array.from(files));
      setForm((f) => ({ ...f, photos: [...f.photos, ...urls] }));
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload images');
    } finally {
      setUploading(false);
      // Reset input so same files can be selected again
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removePhoto = (index: number) => {
    setForm((f) => ({ ...f, photos: f.photos.filter((_, i) => i !== index) }));
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const body = {
        title: form.title,
        city: form.city,
        locality: form.locality,
        price: Number(form.price),
        deposit: Number(form.deposit) || 0,
        occupancy: form.occupancy,
        genderPreference: form.genderPreference,
        amenities: form.amenities,
        description: form.description,
        photos: form.photos,
        instantBook: form.instantBook,
      };
      const data = await createListing(body);
      // data.property is already mapped by api.ts — use it directly
      onCreated(data.property);
    } catch (err) {
      alert((err as Error).message || 'Failed to create listing');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="relative mx-4 w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-ink-900" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute right-4 top-4 rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800">
          <X className="h-5 w-5" />
        </button>
        <h2 className="mb-1 font-display text-lg font-bold text-ink-900 dark:text-white">Add new listing</h2>
        <p className="mb-5 text-xs text-ink-400">Step {step} of 3</p>

        <div className="mb-5 flex gap-1">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`h-1 flex-1 rounded-full transition ${s <= step ? 'bg-coral-500' : 'bg-ink-200 dark:bg-ink-700'}`} />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <Field label="Title" value={form.title} onChange={(v) => set('title', v)} placeholder="e.g. Sunshine PG for Women" />
            <div className="grid grid-cols-2 gap-4">
              <Field label="City" value={form.city} onChange={(v) => set('city', v)} placeholder="e.g. Bangalore" />
              <Field label="Locality" value={form.locality} onChange={(v) => set('locality', v)} placeholder="e.g. Koramangala" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Price (₹/month)" value={form.price} onChange={(v) => set('price', v)} placeholder="8000" type="number" />
              <Field label="Security deposit (₹)" value={form.deposit} onChange={(v) => set('deposit', v)} placeholder="16000" type="number" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-600 dark:text-ink-300">Occupancy</label>
                <select value={form.occupancy} onChange={(e) => set('occupancy', e.target.value)} className="input w-full">
                  <option value="single">Single</option>
                  <option value="double">Double</option>
                  <option value="triple">Triple</option>
                  <option value="dorm">Dorm</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-600 dark:text-ink-300">Gender</label>
                <select value={form.genderPreference} onChange={(e) => set('genderPreference', e.target.value)} className="input w-full">
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="coed">Co-ed</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-medium text-ink-600 dark:text-ink-300">Amenities</label>
              <div className="grid grid-cols-2 gap-2">
                {AMENITIES.map((a) => (
                  <button
                    key={a.key}
                    type="button"
                    onClick={() => toggleAmenity(a.key)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition ${
                      form.amenities.includes(a.key)
                        ? 'border-coral-400 bg-coral-50 font-semibold text-coral-700 dark:border-coral-600 dark:bg-coral-900/20 dark:text-coral-300'
                        : 'border-ink-200 text-ink-600 hover:border-ink-300 dark:border-ink-700 dark:text-ink-300'
                    }`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-600 dark:text-ink-300">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                rows={4}
                className="input w-full resize-none"
                placeholder="Describe your property — nearby landmarks, rules, facilities..."
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-ink-700 dark:text-ink-200">
              <input type="checkbox" checked={form.instantBook} onChange={(e) => set('instantBook', e.target.checked)} className="h-4 w-4 rounded accent-coral-500" />
              Enable Instant Book <Zap className="h-3.5 w-3.5 text-coral-500" />
            </label>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-medium text-ink-600 dark:text-ink-300">
                Property Photos {form.photos.length > 0 && `(${form.photos.length} uploaded)`}
              </label>

              {/* Photo preview grid */}
              {form.photos.length > 0 && (
                <div className="mb-3 grid grid-cols-3 gap-2">
                  {form.photos.map((url, i) => (
                    <div key={i} className="group relative aspect-square overflow-hidden rounded-lg">
                      <img src={url} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload area */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-ink-300 p-6 text-center transition hover:border-coral-400 hover:bg-coral-50/50 disabled:opacity-50 dark:border-ink-600 dark:hover:border-coral-600 dark:hover:bg-coral-900/10"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-8 w-8 animate-spin text-coral-500" />
                    <span className="text-sm font-medium text-ink-600 dark:text-ink-300">Uploading...</span>
                  </>
                ) : (
                  <>
                    <ImagePlus className="h-8 w-8 text-ink-300" />
                    <span className="text-sm font-medium text-ink-600 dark:text-ink-300">
                      Click to select photos
                    </span>
                    <span className="text-xs text-ink-400">JPG, PNG, WebP — up to 5 MB each</span>
                  </>
                )}
              </button>

              {uploadError && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
                  <AlertCircle className="h-3.5 w-3.5" /> {uploadError}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between">
          {step > 1 ? (
            <button onClick={() => setStep((s) => s - 1)} className="rounded-lg border border-ink-200 px-4 py-2 text-sm font-medium text-ink-600 hover:bg-ink-50 dark:border-ink-700 dark:text-ink-300 dark:hover:bg-ink-800">
              Back
            </button>
          ) : (
            <div />
          )}
          {step < 3 ? (
            <button onClick={() => setStep((s) => s + 1)} className="btn-primary">
              Next <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button onClick={submit} disabled={submitting || uploading} className="btn-primary disabled:opacity-50">
              {submitting ? 'Creating...' : 'Create Listing'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Shared helpers ────────────────────────────────────── */

function Field({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-ink-600 dark:text-ink-300">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="input w-full" />
    </div>
  );
}

function OverviewCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: React.ComponentType<{ className?: string }>; color: string }) {
  const colors: Record<string, string> = {
    coral: 'bg-coral-50 text-coral-700 dark:bg-coral-900/20 dark:text-coral-300',
    teal: 'bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-300',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300',
    green: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300',
  };
  return (
    <div className="card flex items-center gap-3 p-4">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${colors[color]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="font-display text-xl font-bold text-ink-900 dark:text-ink-100">{value}</p>
        <p className="text-xs text-ink-400">{label}</p>
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
