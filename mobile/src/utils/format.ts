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
};
