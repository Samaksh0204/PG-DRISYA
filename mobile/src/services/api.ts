import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type {
  PropertyListing, Owner, Review, City, User, NotificationItem, ViewerInfo, Visit, Booking, Conversation, ListingPage,
  SiteStats, PublicProfile, CategoryRatings, ReportReason, ReportTarget, AdminStats, AdminListing, AdminUser, AdminReport, Inquiry,
  IdentityState, ThreadPage, AnalyticsReport,
} from '../types';
import Constants from 'expo-constants';
import { apiUrlProblem, resolveDevUrl } from '../utils/format';
import { AVATAR_BG } from '../theme/colors';

// EXPO_PUBLIC_* variables are inlined at build time (set them in mobile/.env or eas.json).
// In development, a LAN address is corrected to your computer's current one (see resolveDevUrl).
const expoHost = Constants.expoConfig?.hostUri;
export const BASE = (resolveDevUrl(process.env.EXPO_PUBLIC_API_URL, expoHost, __DEV__, 5000, '/api') || 'http://localhost:5000/api').replace(/\/$/, '');
export const WEB_URL = (resolveDevUrl(process.env.EXPO_PUBLIC_WEB_URL, expoHost, __DEV__, 5173, '') || '').replace(/\/$/, '');
if (__DEV__) console.log(`[api] Using ${BASE}`);

const urlProblem = apiUrlProblem(process.env.EXPO_PUBLIC_API_URL, __DEV__);
if (urlProblem) console.warn(`[api] ${urlProblem} See mobile/.env.example.`);

const REQUEST_TIMEOUT_MS = 15000;
const TOKEN_KEY = 'drisya_token';

// The session token lives in the OS keychain (iOS) / Keystore-backed storage (Android),
// not in plain AsyncStorage. Expo web has no SecureStore, so it falls back there.
const useSecureStore = Platform.OS !== 'web';
let cachedToken: string | null | undefined;

export async function getToken(): Promise<string | null> {
  if (cachedToken !== undefined) return cachedToken;
  if (!useSecureStore) return (cachedToken = await AsyncStorage.getItem(TOKEN_KEY));
  let token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (!token) {
    // One-time move for people signed in with an older version of the app.
    const legacy = await AsyncStorage.getItem(TOKEN_KEY);
    if (legacy) {
      await SecureStore.setItemAsync(TOKEN_KEY, legacy);
      await AsyncStorage.removeItem(TOKEN_KEY);
      token = legacy;
    }
  }
  return (cachedToken = token);
}
export async function setToken(token: string) {
  cachedToken = token;
  if (useSecureStore) await SecureStore.setItemAsync(TOKEN_KEY, token);
  else await AsyncStorage.setItem(TOKEN_KEY, token);
}
export async function clearToken() {
  cachedToken = null;
  if (useSecureStore) await SecureStore.deleteItemAsync(TOKEN_KEY);
  await AsyncStorage.removeItem(TOKEN_KEY);
}
// Tests only: forget the in-memory copy.
export const __resetTokenCache = () => { cachedToken = undefined; };

let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// ── Waking the server ─────────────────────────────────────────────────
// Free hosting puts the API to sleep when idle. A sleeping server holds the connection
// (so the request times out) or answers 502/503/504 while it starts. In those cases wait
// for /api/health to answer — the UI shows "Waking up the server…" — then retry once.
// An instant network failure means the phone is offline, so that still fails fast.
const WAKE_STATUSES = new Set([502, 503, 504]);
// Tests don't wait a real minute.
let wakeTiming = process.env.NODE_ENV === 'test'
  ? { totalMs: 40, intervalMs: 10, probeTimeoutMs: 20 }
  : { totalMs: 75000, intervalMs: 3000, probeTimeoutMs: 20000 };
const wakeListeners = new Set<(waking: boolean) => void>();
let waking: Promise<boolean> | null = null;

export function onServerWaking(fn: (waking: boolean) => void) {
  wakeListeners.add(fn);
  return () => { wakeListeners.delete(fn); };
}
// Tests only.
export function __setWakeTiming(t: Partial<typeof wakeTiming>) { wakeTiming = { ...wakeTiming, ...t }; }

function waitForServer(): Promise<boolean> {
  if (!waking) {
    waking = (async () => {
      wakeListeners.forEach((f) => f(true));
      const deadline = Date.now() + wakeTiming.totalMs;
      try {
        while (Date.now() < deadline) {
          const ctrl = new AbortController();
          const t = setTimeout(() => ctrl.abort(), wakeTiming.probeTimeoutMs);
          try {
            if ((await fetch(`${BASE}/health`, { signal: ctrl.signal })).ok) return true;
          } catch { /* still starting */ } finally {
            clearTimeout(t);
          }
          await new Promise((r) => setTimeout(r, wakeTiming.intervalMs));
        }
        return false;
      } finally {
        wakeListeners.forEach((f) => f(false));
        waking = null;
      }
    })();
  }
  return waking;
}

export async function request<T>(path: string, opts: RequestInit & { timeoutMs?: number } = {}, retried = false): Promise<T> {
  const token = await getToken();
  const isForm = typeof FormData !== 'undefined' && opts.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(opts.body && !isForm ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    // Lets the server split usage stats by web / iOS / Android.
    'X-Client-Platform': Platform.OS,
    ...((opts.headers as Record<string, string>) || {}),
  };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs || REQUEST_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { ...opts, headers, signal: controller.signal });
  } catch (err: any) {
    clearTimeout(timeout);
    if (err?.name === 'AbortError') {
      if (!retried && (await waitForServer())) return request<T>(path, opts, true);
      throw new ApiError('Request timed out. Check your connection and try again.', 0);
    }
    throw new ApiError('Could not reach the server. Check your connection and try again.', 0);
  } finally {
    clearTimeout(timeout);
  }
  if (WAKE_STATUSES.has(res.status) && !retried && (await waitForServer())) return request<T>(path, opts, true);
  let json: any = {};
  try { json = await res.json(); } catch { /* empty body */ }
  if (!res.ok) {
    if (res.status === 401 && token && onUnauthorized) onUnauthorized();
    throw new ApiError(json.message || `Request failed (${res.status})`, res.status);
  }
  return json as T;
}

const post = <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });
const put = <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body: body === undefined ? undefined : JSON.stringify(body) });
const patch = <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body ?? {}) });
const del = <T>(path: string, body?: unknown) => request<T>(path, { method: 'DELETE', body: body === undefined ? undefined : JSON.stringify(body) });

const avatarFor = (name: string, bg = AVATAR_BG) => `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=${bg}&color=fff`;

export function mapProperty(p: any): PropertyListing {
  return {
    id: p._id || p.id,
    title: p.title,
    ownerId: typeof p.ownerId === 'object' && p.ownerId ? p.ownerId._id : p.ownerId,
    photos: p.photos || [],
    city: p.city,
    locality: p.locality || '',
    lat: p.lat || 0,
    lng: p.lng || 0,
    genderPreference: p.genderPreference,
    occupancy: p.occupancy,
    price: p.price,
    deposit: p.deposit || 0,
    amenities: p.amenities || [],
    description: p.description || '',
    rating: p.rating || 0,
    reviewCount: p.reviewCount || 0,
    featured: !!p.featured,
    instantBook: !!p.instantBook,
    verified: !!p.verified,
    moveInDate: p.moveInDate || '',
    distanceFromLandmark: p.distanceFromLandmark || '',
    views: p.views || 0,
    status: p.status || 'active',
    moderationNote: p.moderationNote || '',
    roomsAvailable: typeof p.roomsAvailable === 'number' ? p.roomsAvailable : 1,
    rules: p.rules || [],
    createdAt: p.createdAt,
    exactLocation: !!p.exactLocation,
  };
}

export function mapReview(r: any): Review {
  return {
    id: r.id || r._id,
    author: r.author || 'Former member',
    authorId: r.authorId || null,
    authorAvatar: r.authorAvatar || avatarFor(r.author || 'A', '14b8a6'),
    rating: r.rating,
    ratings: r.ratings || {},
    date: r.date,
    text: r.text || '',
    verifiedStay: !!r.verifiedStay,
    photos: r.photos || [],
    ownerReply: r.ownerReply || null,
    propertyId: r.propertyId,
    propertyTitle: r.propertyTitle,
  };
}

// ── Auth & account ──────────────────────────────────
type AuthRes = { token: string; user: User };
export async function login(email: string, password: string) {
  const data = await post<AuthRes>('/auth/login', { email, password });
  await setToken(data.token);
  return data;
}
export async function register(body: { fullName: string; email: string; password: string; phone?: string; role: string; acceptTerms: boolean }) {
  const data = await post<AuthRes>('/auth/register', body);
  await setToken(data.token);
  return data;
}
export const getMe = () => request<{ user: User }>('/auth/me');
export const updateProfile = (updates: Partial<User>) => put<{ user: User }>('/auth/profile', updates);
export const forgotPassword = (email: string) => post<{ message: string }>('/auth/forgot-password', { email });
export const resetPassword = (token: string, password: string) => post<{ message: string }>('/auth/reset-password', { token, password });
export const verifyEmail = (token: string) => post<{ message: string; user: User }>('/auth/verify-email', { token });
export const changePassword = (currentPassword: string, newPassword: string) => post<{ message: string; token: string }>('/auth/change-password', { currentPassword, newPassword });
export const resendVerification = () => post<{ message: string }>('/auth/resend-verification');
export const becomeOwner = () => post<AuthRes>('/auth/become-owner');
export const deleteAccount = (password: string) => del<{ message: string }>('/auth/me', { password });
export const verifyAadhaar = (aadhaarNumber: string) => post<{ verified: boolean; user: User }>('/auth/verify-aadhaar', { aadhaarNumber });
export const exportMyData = () => request<unknown>('/auth/export');

// ── Listings ────────────────────────────────────────
export async function searchListings(params: Record<string, string | number | boolean | undefined> = {}): Promise<ListingPage> {
  const clean = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '' && v !== false)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  const data = await request<{ properties: any[]; total: number; page: number; pages: number }>(`/properties${clean ? `?${clean}` : ''}`);
  return { listings: data.properties.map(mapProperty), total: data.total ?? data.properties.length, page: data.page ?? 1, pages: data.pages ?? 1 };
}

export async function fetchListings(params?: Record<string, string>): Promise<PropertyListing[]> {
  return (await searchListings(params)).listings;
}

export async function fetchListingDetail(id: string): Promise<{ property: PropertyListing; owner: Owner | null; reviews: Review[]; viewer: ViewerInfo | null }> {
  const data = await request<{ property: any; owner: any; reviews: any[]; viewer: ViewerInfo | null }>(`/properties/${id}`);
  const o = data.owner;
  return {
    property: mapProperty(data.property),
    viewer: data.viewer,
    reviews: (data.reviews || []).map(mapReview),
    owner: o ? {
      id: o.id,
      name: o.fullName || 'Property owner',
      avatar: o.avatar || avatarFor(o.fullName),
      joinedYear: o.createdAt ? new Date(o.createdAt).getFullYear() : new Date().getFullYear(),
      verified: !!o.verified,
      identityVerified: !!o.identityVerified,
      responseRate: o.responseRate || 0,
      responseTime: o.responseTime || 'within a day',
      rating: o.rating || 0,
      reviewCount: o.reviewCount || 0,
      listingCount: o.listingCount || 0,
      bio: o.bio || '',
    } : null,
  };
}

export const createListing = async (data: Record<string, any>) => ({ property: mapProperty((await post<{ property: any }>('/properties', data)).property) });
export const updateListing = async (id: string, data: Record<string, any>) => ({ property: mapProperty((await put<{ property: any }>(`/properties/${id}`, data)).property) });
export const setListingStatus = async (id: string, status: 'active' | 'inactive') => mapProperty((await patch<{ property: any }>(`/properties/${id}/status`, { status })).property);
export const deleteListing = (id: string) => del<{ message: string }>(`/properties/${id}`);
export const fetchOwnerListings = async () => (await request<{ properties: any[] }>('/properties/owner/mine')).properties.map(mapProperty);
export const fetchCities = () => request<City[]>('/properties/cities').catch(() => [] as City[]);
export const fetchStats = () => request<SiteStats>('/stats');

// ── Public profiles ─────────────────────────────────
export async function fetchPublicProfile(id: string) {
  const data = await request<{ user: PublicProfile; listings: any[]; reviews: any[] }>(`/users/${id}`);
  return { user: data.user, listings: data.listings.map(mapProperty), reviews: data.reviews.map(mapReview) };
}

// ── Favorites ───────────────────────────────────────
export const fetchFavoriteListings = async (): Promise<PropertyListing[]> =>
  (await request<{ favorites: any[] }>('/favorites')).favorites.filter((f) => f.propertyId && f.propertyId.title).map((f) => mapProperty(f.propertyId));
export const fetchFavoriteIds = async () => (await request<{ ids: string[] }>('/favorites/ids')).ids;
export const toggleFavorite = (propertyId: string) => post<{ saved: boolean }>('/favorites/toggle', { propertyId });

// ── Visits & bookings ───────────────────────────────
export const scheduleVisit = (body: { propertyId: string; date: string; timeSlot: string; message?: string }) => post<{ visit: Visit }>('/visits', body);
export const fetchMyVisits = async () => (await request<{ visits: Visit[] }>('/visits/mine')).visits;
export const fetchOwnerVisits = async () => (await request<{ visits: Visit[] }>('/visits/owner')).visits;
export const updateVisitStatus = (id: string, status: string) => put<{ visit: Visit }>(`/visits/${id}/status`, { status });

export const requestBooking = (body: { propertyId: string; moveInDate: string; durationMonths: number; occupants?: number; message?: string }) => post<{ booking: Booking }>('/bookings', body);
export const fetchMyBookings = async () => (await request<{ bookings: Booking[] }>('/bookings/mine')).bookings;
export const fetchOwnerBookings = async () => (await request<{ bookings: Booking[] }>('/bookings/owner')).bookings;
export const updateBookingStatus = (id: string, status: string, reason = '') => put<{ booking: Booking }>(`/bookings/${id}/status`, { status, reason });

// ── Reviews ─────────────────────────────────────────
export const submitReview = async (body: { propertyId: string; rating: number; text: string; ratings?: CategoryRatings }) =>
  mapReview((await post<{ review: any }>('/reviews', body)).review);
export const replyToReview = async (id: string, text: string) => mapReview((await post<{ review: any }>(`/reviews/${id}/reply`, { text })).review);
export const deleteReview = (id: string) => del<{ message: string }>(`/reviews/${id}`);
export const fetchOwnerReviews = async () => (await request<{ reviews: any[] }>('/reviews/owner/mine')).reviews.map(mapReview);

// ── Reports & inquiries ─────────────────────────────
export const submitReport = (body: { targetType: ReportTarget | string; targetId: string; reason: ReportReason | string; details?: string }) => post<{ report: any }>('/reports', body);
export const submitInquiry = (body: Record<string, unknown>) => post<{ message: string }>('/inquiries', body);

// ── Messages ────────────────────────────────────────
export async function fetchConversations(): Promise<Conversation[]> {
  const data = await request<{ conversations: any[] }>('/messages/conversations');
  return data.conversations.map((c) => ({
    ...c,
    propertyImage: c.propertyImage || '',
    participantRole: c.participantRole || 'tenant',
    participantAvatar: c.participantAvatar || avatarFor(c.participantName, '14b8a6'),
    messages: c.messages || [],
  }));
}
export const sendMessage = (body: { receiverId: string; text: string; propertyId?: string | null; clientId?: string }) =>
  post<{ message: any; duplicate?: boolean; warning?: 'contact_info' }>('/messages', { ...body, propertyId: body.propertyId || undefined });

// One conversation, newest page first; `before` loads older, `after` polls for new.
export function fetchThread(withUserId: string, propertyId: string | null | undefined, opts: { before?: string; after?: string } = {}) {
  const qs = [`with=${encodeURIComponent(withUserId)}`, `propertyId=${encodeURIComponent(propertyId || 'none')}`];
  if (opts.before) qs.push(`before=${encodeURIComponent(opts.before)}`);
  if (opts.after) qs.push(`after=${encodeURIComponent(opts.after)}`);
  return request<ThreadPage>(`/messages/thread?${qs.join('&')}`);
}
export const blockUser = (userId: string) => post<{ blocked: boolean }>('/messages/block', { userId });
export const unblockUser = (userId: string) => del<{ blocked: boolean }>(`/messages/block/${userId}`);

// Random id so a retried send is stored once (the server de-duplicates on it).
export const newClientId = () => `c_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
export const markRead = (propertyId: string | null, senderId: string) => put<{ success: boolean }>('/messages/read', { propertyId, senderId });
export const fetchUnreadMessageCount = async () => (await request<{ count: number }>('/messages/unread-count')).count;

// ── Identity verification ───────────────────────────
export const fetchIdentityStatus = () => request<IdentityState>('/identity/status');
export const startIdentityVerification = () => post<{ status: 'pending'; redirectUrl: string }>('/identity/start');
export const cancelIdentityVerification = () => post<IdentityState>('/identity/cancel');

// ── Notifications ───────────────────────────────────
export const fetchNotifications = (page = 1) =>
  request<{ notifications: NotificationItem[]; unreadCount: number; total: number; pages: number }>(`/notifications?page=${page}`);
export const markAllNotificationsRead = () => put<{ success: boolean }>('/notifications/read-all');
export const markNotificationRead = (id: string) => put<{ notification: NotificationItem }>(`/notifications/${id}/read`);

// ── Admin ───────────────────────────────────────────
export const admin = {
  stats: () => request<AdminStats>('/admin/stats'),
  analytics: (days: 7 | 30 | 90) => request<AnalyticsReport>(`/admin/analytics?days=${days}`),
  listings: async (status: string): Promise<{ total: number; listings: AdminListing[] }> => {
    const data = await request<{ listings: any[]; total: number }>(`/admin/listings?status=${status}`);
    return { total: data.total, listings: data.listings.map((l) => ({ ...mapProperty(l), owner: typeof l.ownerId === 'object' ? l.ownerId : null })) };
  },
  moderate: (id: string, action: string, note = '') => patch<{ listing: any }>(`/admin/listings/${id}`, { action, note }),
  users: (q = '') => request<{ users: AdminUser[]; total: number }>(`/admin/users?q=${encodeURIComponent(q)}`),
  updateUser: (id: string, body: Record<string, unknown>) => patch<{ user: AdminUser }>(`/admin/users/${id}`, body),
  reports: (status = 'open') => request<{ reports: AdminReport[] }>(`/admin/reports?status=${status}`),
  resolveReport: (id: string, status: 'resolved' | 'dismissed', removeContent = false, note = '') =>
    patch<{ report: any }>(`/admin/reports/${id}`, { status, removeContent, note }),
  inquiries: () => request<{ inquiries: Inquiry[] }>('/admin/inquiries'),
  updateInquiry: (id: string, status: string) => patch<{ inquiry: Inquiry }>(`/admin/inquiries/${id}`, { status }),
};

// ── Upload ──────────────────────────────────────────
// Photo uploads go through React Native's XMLHttpRequest, not `fetch`: since SDK 52
// Expo replaces the global fetch with `expo/fetch`, which rejects React Native's
// `{ uri, name, type }` FormData parts ("uri is not supported"), so every upload
// failed on the device before reaching the server. XHR streams the file from its uri.
export function uploadFormData<T>(path: string, formData: FormData, timeoutMs = 60000): Promise<T> {
  return new Promise((resolve, reject) => {
    (async () => {
      const token = await getToken();
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${BASE}${path}`);
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.setRequestHeader('Accept', 'application/json');
      xhr.timeout = timeoutMs;
      xhr.onload = () => {
        let json: any = {};
        try { json = JSON.parse(xhr.responseText || '{}'); } catch { /* non-JSON body */ }
        if (xhr.status >= 200 && xhr.status < 300) return resolve(json as T);
        if (xhr.status === 401 && token && onUnauthorized) onUnauthorized();
        reject(new ApiError(json.message || `Upload failed (${xhr.status})`, xhr.status));
      };
      xhr.onerror = () => reject(new ApiError('Photo upload failed. Check your connection and try again.', 0));
      xhr.ontimeout = () => reject(new ApiError('Photo upload timed out. Try again on a stronger connection or with fewer photos.', 0));
      xhr.send(formData);
    })().catch(reject);
  });
}

export async function uploadImages(images: { uri: string; name: string; type: string }[]): Promise<string[]> {
  const formData = new FormData();
  images.forEach((img) => formData.append('images', { uri: img.uri, name: img.name, type: img.type } as any));
  return (await uploadFormData<{ urls: string[] }>('/upload', formData)).urls;
}
