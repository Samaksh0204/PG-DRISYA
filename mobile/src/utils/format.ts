// Pure helpers shared by screens (unit tested in __tests__/format.test.ts).

export const formatINR = (n: number) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;

// Local calendar date (toISOString is UTC and is a day off in India after midnight).
export function localISODate(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return localISODate(date);
}

export function upcomingDates(count: number, from: Date = new Date(), startOffset = 0): string[] {
  const today = localISODate(from);
  return Array.from({ length: count }, (_, i) => addDays(today, i + startOffset));
}

export function formatDay(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[dt.getDay()]}, ${d} ${months[m - 1]}`;
}

export function moveInCost(rent: number, deposit: number) {
  return { firstMonth: rent, deposit, total: rent + deposit };
}

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

export function passwordProblem(pw: string): string | null {
  if (pw.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'Password must contain at least one letter and one number';
  return null;
}

// Release builds must talk to an HTTPS API (Android blocks plain HTTP by default,
// and iOS App Transport Security does too).
export function apiUrlProblem(url: string | undefined, isDev: boolean): string | null {
  if (!url) return isDev ? 'EXPO_PUBLIC_API_URL is not set' : 'The app was built without an API address.';
  if (!isDev && !url.startsWith('https://')) return 'Release builds need an https:// API address.';
  return null;
}

// In development the phone loads the app from Expo running on your computer, so the
// address it used for that is the one your computer has *right now*. A LAN address
// written in .env goes stale whenever the computer joins another Wi-Fi network, so in
// development we swap a local/private host for the Expo host (same port and path).
// Release builds always use the configured URL unchanged.
const LOCAL_HOST = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/;

export function resolveDevUrl(configured: string | undefined, expoHostUri: string | undefined | null, isDev: boolean, fallbackPort = 5000, fallbackPath = '/api'): string | undefined {
  if (!isDev || !expoHostUri) return configured;
  const host = expoHostUri.split('/')[0].split(':')[0];
  // Tunnels (*.exp.direct) can't reach your API port — keep whatever is configured.
  if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(host) && host !== 'localhost') return configured;
  if (!configured) return `http://${host}:${fallbackPort}${fallbackPath}`;
  const m = configured.match(/^(https?:\/\/)([^/:]+)(:\d+)?(.*)$/);
  if (!m || !LOCAL_HOST.test(m[2])) return configured; // a real domain: leave it alone
  return `${m[1]}${host}${m[3] || ''}${m[4]}`;
}

export const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  accepted: 'Accepted',
  declined: 'Declined',
  rejected: 'Declined',
  cancelled: 'Cancelled',
  completed: 'Completed',
  active: 'Live',
  inactive: 'Paused',
  pending_review: 'In review',
  rejected_listing: 'Changes needed',
  open: 'Open',
  resolved: 'Resolved',
  dismissed: 'Dismissed',
  new: 'New',
  contacted: 'Contacted',
  closed: 'Closed',
};

// ISO timestamp or date → "25 Oct 2026"
export function formatDate(value: string | undefined | null): string {
  if (!value) return '';
  const d = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export function timeAgo(value: string, now: Date = new Date()): string {
  const s = Math.floor((now.getTime() - new Date(value).getTime()) / 1000);
  if (Number.isNaN(s)) return '';
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(value);
}

export const pluralize = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export const avatarUrl = (name: string, bg = '102A43') =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=${bg}&color=fff&size=200`;

// Ask image CDNs for a copy sized for the phone instead of the full original.
export function optimizeImage(url: string | undefined, width: number): string | undefined {
  if (!url) return url;
  try {
    if (url.includes('res.cloudinary.com') && url.includes('/upload/') && !/\/upload\/[^/]*(w_|q_|f_)/.test(url)) {
      return url.replace('/upload/', `/upload/f_auto,q_auto,c_limit,w_${width}/`);
    }
    if (url.includes('images.pexels.com')) {
      const base = url.split('?')[0];
      return `${base}?auto=compress&cs=tinysrgb&w=${width}`;
    }
  } catch {
    /* leave unknown URLs untouched */
  }
  return url;
}
