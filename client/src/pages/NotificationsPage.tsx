import { useEffect, useState } from 'react';
import { Bell, CheckCheck, Info, Home as HomeIcon, Star, Calendar, Settings, Luggage, MessageCircle, Flag } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from '../lib/api';
import { SignInRequired, PageLoader, EmptyState } from '../components/ui';
import { timeAgo } from '../lib/format';
import type { NotificationItem } from '../types';

const TYPE_ICON: Record<string, React.ReactNode> = {
  info: <Info className="h-5 w-5 text-teal-500" />,
  listing: <HomeIcon className="h-5 w-5 text-brand-500" />,
  review: <Star className="h-5 w-5 text-amber-500" />,
  visit: <Calendar className="h-5 w-5 text-blue-500" />,
  booking: <Luggage className="h-5 w-5 text-teal-600" />,
  message: <MessageCircle className="h-5 w-5 text-brand-500" />,
  report: <Flag className="h-5 w-5 text-danger" />,
  account: <Settings className="h-5 w-5 text-ink-500" />,
  system: <Settings className="h-5 w-5 text-ink-500" />,
};

// Where each notification should take you.
function targetFor(n: NotificationItem, role?: string): string | null {
  const host = role === 'owner' || role === 'admin';
  switch (n.type) {
    case 'message': return '/messages';
    case 'booking': return host && /request|instant booking|cancelled by the tenant/i.test(n.title + n.body) ? '/owner?tab=bookings' : '/dashboard?tab=trips';
    case 'visit': return host && /request|cancelled by the tenant/i.test(n.title + n.body) ? '/owner?tab=visits' : '/dashboard?tab=visits';
    case 'review': return host && /left a/i.test(n.body) ? '/owner?tab=reviews' : n.data?.propertyId ? `/listing/${n.data.propertyId}` : null;
    case 'report': return role === 'admin' && n.title === 'New report' ? '/admin' : null;
    case 'listing': return /your listing/i.test(n.title) ? '/owner?tab=listings' : n.data?.propertyId ? `/listing/${n.data.propertyId}` : null;
    case 'system': return role === 'admin' && n.data?.inquiryId ? '/admin' : null;
    default: return n.data?.propertyId ? `/listing/${n.data.propertyId}` : null;
  }
}

export function NotificationsPage() {
  const { auth, authLoading, navigate, refreshNotifications } = useApp();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) return;
    fetchNotifications(1).then((d) => { setItems(d.notifications); setPages(d.pages); }).catch(() => {}).finally(() => setLoading(false));
  }, [auth?.id]);

  if (authLoading) return <PageLoader />;
  if (!auth) return <SignInRequired message="Log in to see your notifications." />;
  if (loading) return <PageLoader />;

  const unread = items.filter((n) => !n.read).length;
  const open = async (n: NotificationItem) => {
    if (!n.read) {
      setItems((prev) => prev.map((x) => (x._id === n._id ? { ...x, read: true } : x)));
      markNotificationRead(n._id).then(refreshNotifications).catch(() => {});
    }
    const to = targetFor(n, auth.role);
    if (to) navigate(to);
  };
  const more = async () => {
    const d = await fetchNotifications(page + 1);
    setItems((prev) => [...prev, ...d.notifications]);
    setPage(page + 1);
    setPages(d.pages);
  };

  return (
    <div className="container-page py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white">Notifications</h1>
            {unread > 0 && <p className="mt-1 text-sm text-ink-500">{unread} unread</p>}
          </div>
          {unread > 0 && (
            <button onClick={async () => { await markAllNotificationsRead(); setItems((p) => p.map((n) => ({ ...n, read: true }))); refreshNotifications(); }} className="btn-ghost text-sm text-brand-600">
              <CheckCheck className="h-4 w-4" /> Mark all read
            </button>
          )}
        </div>
        {items.length === 0 ? <EmptyState icon={Bell} title="You're all caught up" desc="Updates about visits, bookings, messages and reviews will appear here." /> : (
          <div className="space-y-2">
            {items.map((n) => (
              <button key={n._id} onClick={() => open(n)} className={`card flex w-full items-start gap-4 p-4 text-left hover:shadow-card-hover ${!n.read ? 'border-l-4 border-l-brand-500' : ''}`}>
                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink-50 dark:bg-ink-800">{TYPE_ICON[n.type] || TYPE_ICON.info}</div>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm ${!n.read ? 'font-semibold text-ink-900 dark:text-white' : 'text-ink-700 dark:text-ink-300'}`}>{n.title}</p>
                  <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">{n.body}</p>
                  <p className="mt-1 text-[11px] text-ink-400">{timeAgo(n.createdAt)}</p>
                </div>
                {!n.read && <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-brand-500" aria-label="Unread" />}
              </button>
            ))}
            {page < pages && <button onClick={more} className="btn-outline mt-4 w-full">Load older</button>}
          </div>
        )}
      </div>
    </div>
  );
}
