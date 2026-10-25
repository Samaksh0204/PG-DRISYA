import { useEffect, useState } from 'react';
import { ShieldCheck, Star, CalendarDays, MapPin, UserX } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { fetchPublicProfile } from '../lib/api';
import { ListingCard } from '../components/ListingCard';
import { Avatar, EmptyState, PageLoader, Stars } from '../components/ui';
import { ReportButton } from '../components/ReportModal';
import { formatDate } from '../lib/format';
import type { PropertyListing, PublicProfile, Review } from '../types';

export function HostProfilePage() {
  const { route, navigate, auth } = useApp();
  const id = route.split('/user/')[1]?.split('?')[0] || '';
  const [data, setData] = useState<{ user: PublicProfile; listings: PropertyListing[]; reviews: Review[] } | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'missing'>('loading');

  useEffect(() => {
    setState('loading');
    fetchPublicProfile(id).then((d) => { setData(d); setState('ok'); }).catch(() => setState('missing'));
  }, [id]);

  if (state === 'loading') return <PageLoader />;
  if (state === 'missing' || !data) return <EmptyState icon={UserX} title="Profile not found" action={{ label: 'Back to search', onClick: () => navigate('/search') }} />;
  const { user, listings, reviews } = data;

  return (
    <div className="container-page grid gap-10 py-10 lg:grid-cols-3">
      <aside className="lg:col-span-1">
        <div className="card sticky top-24 p-6 text-center">
          <Avatar src={user.avatar} name={user.fullName} className="mx-auto h-24 w-24 rounded-full object-cover" />
          <h1 className="mt-3 font-display text-2xl font-bold text-ink-900 dark:text-white">{user.fullName}</h1>
          <p className="text-sm capitalize text-ink-500">{user.role === 'owner' ? 'Host' : user.role}</p>
          <div className="mt-4 grid grid-cols-3 gap-2 border-y border-ink-100 py-4 text-sm dark:border-ink-800">
            <div><p className="font-bold">{user.reviewCount}</p><p className="text-xs text-ink-500">Reviews</p></div>
            <div><p className="flex items-center justify-center gap-1 font-bold">{user.rating ? user.rating.toFixed(1) : '—'} <Star className="h-3 w-3 fill-current" /></p><p className="text-xs text-ink-500">Rating</p></div>
            <div><p className="font-bold">{new Date(user.createdAt).getFullYear()}</p><p className="text-xs text-ink-500">Joined</p></div>
          </div>
          <ul className="mt-4 space-y-2 text-left text-sm text-ink-700 dark:text-ink-300">
            {user.verified && <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-teal-600" /> Identity verified by Drisya</li>}
            {user.city && <li className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Lives in {user.city}</li>}
            <li className="flex items-center gap-2"><CalendarDays className="h-4 w-4" /> Member since {formatDate(user.createdAt)}</li>
            {user.responseRate > 0 && <li className="text-xs text-ink-500">Responds {user.responseTime} · {user.responseRate}% response rate</li>}
          </ul>
          {auth && auth.id !== user.id && <div className="mt-4"><ReportButton targetType="user" targetId={user.id} label="Report this profile" /></div>}
        </div>
      </aside>
      <div className="lg:col-span-2">
        {user.bio && <section className="mb-10"><h2 className="mb-2 text-xl font-semibold">About {user.fullName.split(' ')[0]}</h2><p className="whitespace-pre-line text-sm leading-relaxed text-ink-700 dark:text-ink-300">{user.bio}</p></section>}
        {listings.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-4 text-xl font-semibold">{user.fullName.split(' ')[0]}'s listings</h2>
            <div className="grid gap-6 sm:grid-cols-2">{listings.map((l, i) => <ListingCard key={l.id} listing={l} index={i} />)}</div>
          </section>
        )}
        {reviews.length > 0 && (
          <section>
            <h2 className="mb-4 text-xl font-semibold">Reviews from tenants</h2>
            <div className="space-y-6">
              {reviews.map((r) => (
                <article key={r.id} className="border-b border-ink-100 pb-6 dark:border-ink-800">
                  <div className="flex items-center gap-3"><Avatar src={r.authorAvatar} name={r.author} className="h-9 w-9 rounded-full" /><div><p className="text-sm font-semibold">{r.author}</p><p className="text-xs text-ink-500">{formatDate(r.date)} · {r.propertyTitle}</p></div></div>
                  <div className="mt-2"><Stars value={r.rating} /></div>
                  {r.text && <p className="mt-2 text-sm text-ink-700 dark:text-ink-300">{r.text}</p>}
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
