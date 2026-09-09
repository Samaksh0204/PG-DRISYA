import { useEffect, useState } from 'react';
import { Bell, CheckCheck, Info, Home as HomeIcon, Star, Calendar, Settings, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from '../lib/api';
import type { NotificationItem } from '../types';

const TYPE_ICON: Record<string, React.ReactNode> = {
  info: <Info className="h-5 w-5 text-teal-500" />,
  listing: <HomeIcon className="h-5 w-5 text-coral-500" />,
  review: <Star className="h-5 w-5 text-amber-500" />,
  visit: <Calendar className="h-5 w-5 text-blue-500" />,
  system: <Settings className="h-5 w-5 text-ink-500" />,
};

export function NotificationsPage() {
  const { auth, navigate, refreshNotifications } = useApp();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    if (!auth) return;
    fetchNotifications(1)
      .then((data) => setNotifications(data.notifications))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [auth]);

  if (!auth) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <Bell className="h-12 w-12 text-ink-300" />
        <h2 className="mt-4 font-display text-xl font-bold text-ink-900 dark:text-white">Sign in to see notifications</h2>
        <button onClick={() => navigate('/login')} className="btn-primary mt-4">Sign in</button>
      </div>
    );
  }

  const handleMarkAll = async () => {
    setMarking(true);
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      refreshNotifications();
    } catch {}
    setMarking(false);
  };

  const handleMarkOne = async (id: string) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => n._id === id ? { ...n, read: true } : n));
      refreshNotifications();
    } catch {}
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="container-page py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white">Notifications</h1>
            {unreadCount > 0 && (
              <p className="mt-1 text-sm text-ink-500">{unreadCount} unread</p>
            )}
          </div>
          {unreadCount > 0 && (
            <button onClick={handleMarkAll} disabled={marking} className="btn-ghost text-sm text-coral-500">
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-coral-500" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Bell className="h-12 w-12 text-ink-200 dark:text-ink-700" />
            <h3 className="mt-4 text-lg font-semibold text-ink-700 dark:text-ink-300">No notifications yet</h3>
            <p className="mt-1 text-sm text-ink-400">You'll be notified when new PGs are added or you have updates.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <button
                key={n._id}
                onClick={() => {
                  if (!n.read) handleMarkOne(n._id);
                  if (n.data?.propertyId) navigate(`/listing/${n.data.propertyId}`);
                }}
                className={`card flex w-full items-start gap-4 p-4 text-left transition hover:shadow-card-hover ${
                  !n.read ? 'border-l-4 border-l-coral-500' : ''
                }`}
              >
                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink-50 dark:bg-ink-800">
                  {TYPE_ICON[n.type] || TYPE_ICON.info}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm ${!n.read ? 'font-semibold text-ink-900 dark:text-white' : 'text-ink-700 dark:text-ink-300'}`}>
                    {n.title}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">{n.body}</p>
                  <p className="mt-1 text-[11px] text-ink-400">
                    {new Date(n.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {!n.read && (
                  <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-coral-500" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
