// Pure helpers (unit tested in src/__tests__/format.test.ts).

export const formatINR = (n: number) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;

// Local calendar date as YYYY-MM-DD (NOT toISOString, which is UTC and is
// off by one day in India between midnight and 5:30 AM).
export function localISODate(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return localISODate(date);
}

export function upcomingDates(count: number, from: Date = new Date(), startOffset = 1): string[] {
  const today = localISODate(from);
  return Array.from({ length: count }, (_, i) => addDays(today, i + startOffset));
}

// "2026-10-25" → "Sun, 25 Oct"
export function formatDay(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

// ISO timestamp or date → "25 Oct 2026"
export function formatDate(value: string | undefined | null): string {
  if (!value) return '';
  const d = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function timeAgo(value: string, now: Date = new Date()): string {
  const d = new Date(value);
  const s = Math.floor((now.getTime() - d.getTime()) / 1000);
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

// Total due at move-in: first month's rent + deposit.
export function moveInCost(monthlyRent: number, deposit: number) {
  return { firstMonth: monthlyRent, deposit, total: monthlyRent + deposit };
}

export function passwordProblem(pw: string): string | null {
  if (pw.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'Password must contain at least one letter and one number';
  return null;
}

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

// Parse "/search?city=Indore&x=1" → URLSearchParams of the query part.
export function routeParams(route: string): URLSearchParams {
  const i = route.indexOf('?');
  return new URLSearchParams(i >= 0 ? route.slice(i + 1) : '');
}

export const pluralize = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
