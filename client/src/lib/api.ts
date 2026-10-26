import type {
  PropertyListing, Review, Owner, Conversation, NotificationItem, Visit, Booking, UserProfile,
  PublicProfile, SiteStats, ViewerInfo, ReportReason, ReportTarget, CategoryRatings, IdentityState, ThreadPage,
} from '../types';
import { shrinkImage } from './image';

// Same-origin '/api' by default (Vite proxies it in dev). Set VITE_API_URL for a separately hosted API.
export const BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
const TOKEN_KEY = 'drisya_token';

// Storage can throw (private mode / blocked cookies) — never let that crash the app.
export function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
export function setToken(token: string) {
  try { localStorage.setItem(TOKEN_KEY, token); } catch { /* ignore */ }
}
export function clearToken() {
  try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// Called when the server says our session is no longer valid (password changed, suspended…).
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn;
}

export async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(opts.body && !(opts.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((opts.headers as Record<string, string>) || {}),
  };
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { ...opts, headers });
  } catch {
    throw new ApiError('Could not reach the server. Check your connection and try again.', 0);
  }
  let json: any = {};
  try { json = await res.json(); } catch { /* non-JSON body */ }
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

const avatarFor = (name: string, bg = '102A43') =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=${bg}&color=fff`;

// ── Auth & account ─────────────────────────────────────────────────────

type AuthResponse = { token: string; user: UserProfile };

export const register = (data: { fullName: string; email: string; password: string; role: 'tenant' | 'owner'; acceptTerms: boolean; phone?: string }) =>
  post<AuthResponse>('/auth/register', data);
export const login = (email: string, password: string) => post<AuthResponse>('/auth/login', { email, password });
export const getMe = () => request<{ user: UserProfile }>('/auth/me');
export const updateProfile = (data: Partial<UserProfile>) => put<{ user: UserProfile }>('/auth/profile', data);
export const changePassword = (currentPassword: string, newPassword: string) =>
  post<{ message: string; token: string }>('/auth/change-password', { currentPassword, newPassword });
export const forgotPassword = (email: string) => post<{ message: string }>('/auth/forgot-password', { email });
export const resetPassword = (token: string, password: string) => post<{ message: string }>('/auth/reset-password', { token, password });
export const verifyEmail = (token: string) => post<{ message: string; user: UserProfile }>('/auth/verify-email', { token });
export const resendVerification = () => post<{ message: string }>('/auth/resend-verification');
export const becomeOwner = () => post<AuthResponse>('/auth/become-owner');
export const deleteAccount = (password: string) => del<{ message: string }>('/auth/me', { password });
export const verifyAadhaar = (aadhaarNumber: string) => post<{ verified: boolean; user: UserProfile }>('/auth/verify-aadhaar', { aadhaarNumber });

export async function exportMyData(): Promise<Blob> {
  const data = await request<unknown>('/auth/export');
  return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
}

// ── Listings ───────────────────────────────────────────────────────────

export function mapProperty(p: any): PropertyListing {
  return {
    id: p._id || p.id,
    title: p.title,
    ownerId: typeof p.ownerId === 'object' && p.ownerId ? p.ownerId._id : p.ownerId,
    photos: p.photos?.length ? p.photos : [],
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

export interface ListingPage {
  listings: PropertyListing[];
  total: number;
  page: number;
  pages: number;
}

export async function searchListings(params: Record<string, string | number | undefined> = {}): Promise<ListingPage> {
  const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, String(v)]));
  const qs = new URLSearchParams(clean).toString();
  const data = await request<{ properties: any[]; total: number; page: number; pages: number }>(`/properties${qs ? `?${qs}` : ''}`);
  return { listings: data.properties.map(mapProperty), total: data.total, page: data.page, pages: data.pages };
}

export async function fetchListings(params?: Record<string, string>): Promise<PropertyListing[]> {
  return (await searchListings(params)).listings;
}

export interface ListingDetail {
  property: PropertyListing;
  owner: Owner | null;
  reviews: Review[];
  viewer: ViewerInfo | null;
}

export async function fetchListingDetail(id: string): Promise<ListingDetail> {
  const data = await request<{ property: any; owner: any; reviews: any[]; viewer: ViewerInfo | null }>(`/properties/${id}`);
  const o = data.owner;
  return {
    property: mapProperty(data.property),
    viewer: data.viewer,
    reviews: (data.reviews || []).map(mapReview),
    owner: o
      ? {
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
        }
      : null,
  };
}

export const fetchOwnerListings = async () => (await request<{ properties: any[] }>('/properties/owner/mine')).properties.map(mapProperty);
export const createListing = async (body: Record<string, unknown>) => mapProperty((await post<{ property: any }>('/properties', body)).property);
export const updateListing = async (id: string, body: Record<string, unknown>) => mapProperty((await put<{ property: any }>(`/properties/${id}`, body)).property);
export const setListingStatus = async (id: string, status: 'active' | 'inactive') => mapProperty((await patch<{ property: any }>(`/properties/${id}/status`, { status })).property);
export const deleteListing = (id: string) => del<{ message: string }>(`/properties/${id}`);
export const fetchCities = () => request<{ name: string; listingCount: number }[]>('/properties/cities');
export const fetchStats = () => request<SiteStats>('/stats');

// ── Public profiles ────────────────────────────────────────────────────

export async function fetchPublicProfile(id: string) {
  const data = await request<{ user: PublicProfile; listings: any[]; reviews: any[] }>(`/users/${id}`);
  return { user: data.user, listings: data.listings.map(mapProperty), reviews: data.reviews.map(mapReview) };
}

// ── Reviews ────────────────────────────────────────────────────────────

export const submitReview = async (body: { propertyId: string; rating: number; text: string; ratings?: CategoryRatings }) =>
  mapReview((await post<{ review: any }>('/reviews', body)).review);
export const replyToReview = async (id: string, text: string) => mapReview((await post<{ review: any }>(`/reviews/${id}/reply`, { text })).review);
export const deleteReview = (id: string) => del<{ message: string }>(`/reviews/${id}`);
export const fetchOwnerReviews = async () => (await request<{ reviews: any[] }>('/reviews/owner/mine')).reviews.map(mapReview);
export const reviewEligibility = (propertyId: string) => request<{ canReview: boolean; hasReviewed: boolean; isOwner: boolean }>(`/reviews/eligibility/${propertyId}`);

// ── Wishlist ───────────────────────────────────────────────────────────

export const fetchFavoriteIds = async () => (await request<{ ids: string[] }>('/favorites/ids')).ids;
export const fetchFavoriteListings = async () =>
  (await request<{ favorites: any[] }>('/favorites')).favorites.map((f) => mapProperty(f.propertyId));
export const toggleFavorite = async (propertyId: string) => (await post<{ saved: boolean }>('/favorites/toggle', { propertyId })).saved;

// ── Visits & bookings ──────────────────────────────────────────────────

export const scheduleVisit = (body: { propertyId: string; date: string; timeSlot: string; message?: string }) => post<{ visit: Visit }>('/visits', body);
export const fetchMyVisits = async () => (await request<{ visits: Visit[] }>('/visits/mine')).visits;
export const fetchOwnerVisits = async () => (await request<{ visits: Visit[] }>('/visits/owner')).visits;
export const updateVisitStatus = (id: string, status: string) => put<{ visit: Visit }>(`/visits/${id}/status`, { status });

export const requestBooking = (body: { propertyId: string; moveInDate: string; durationMonths: number; occupants?: number; message?: string }) =>
  post<{ booking: Booking }>('/bookings', body);
export const fetchMyBookings = async () => (await request<{ bookings: Booking[] }>('/bookings/mine')).bookings;
export const fetchOwnerBookings = async () => (await request<{ bookings: Booking[] }>('/bookings/owner')).bookings;
export const updateBookingStatus = (id: string, status: string, reason = '') => put<{ booking: Booking }>(`/bookings/${id}/status`, { status, reason });

// ── Messages ───────────────────────────────────────────────────────────

export async function fetchConversations(): Promise<Conversation[]> {
  const data = await request<{ conversations: any[] }>('/messages/conversations');
  return data.conversations.map((c) => ({
    id: c.id,
    listingId: c.propertyId || '',
    listingTitle: c.propertyTitle || 'General',
    listingImage: c.propertyImage || '',
    participantId: c.participantId,
    participantName: c.participantName,
    participantAvatar: c.participantAvatar || avatarFor(c.participantName, '14b8a6'),
    participantRole: c.participantRole || 'tenant',
    participantDeleted: !!c.participantDeleted,
    blockedByMe: !!c.blockedByMe,
    blockedMe: !!c.blockedMe,
    lastMessage: c.lastMessage,
    lastMessageTime: c.lastMessageTime,
    unread: c.unread,
    messages: c.messages || [],
  }));
}
export const sendMessage = (body: { propertyId?: string; receiverId: string; text: string; clientId?: string }) =>
  post<{ message: any; duplicate?: boolean; warning?: 'contact_info' }>('/messages', { ...body, propertyId: body.propertyId || undefined });

// One conversation, newest page first; `before` loads older, `after` polls for new.
export function fetchThread(withUserId: string, propertyId: string | null, opts: { before?: string; after?: string } = {}) {
  const qs = new URLSearchParams({ with: withUserId, propertyId: propertyId || 'none' });
  if (opts.before) qs.set('before', opts.before);
  if (opts.after) qs.set('after', opts.after);
  return request<ThreadPage>(`/messages/thread?${qs}`);
}
export const blockUser = (userId: string) => post<{ blocked: boolean }>('/messages/block', { userId });
export const unblockUser = (userId: string) => del<{ blocked: boolean }>(`/messages/block/${userId}`);

// Random id so a retried send is stored once (the server de-duplicates on it).
export const newClientId = () =>
  `c_${(globalThis.crypto?.randomUUID?.() || `${Date.now()}${Math.random()}`).replace(/[^A-Za-z0-9]/g, '').slice(0, 40)}`;
export const markRead = (propertyId: string, senderId: string) => put<{ success: boolean }>('/messages/read', { propertyId: propertyId || null, senderId });
export const fetchUnreadMessageCount = async () => (await request<{ count: number }>('/messages/unread-count')).count;

// ── Identity verification ──────────────────────────────────────────────

export const fetchIdentityStatus = () => request<IdentityState>('/identity/status');
export const startIdentityVerification = () => post<{ status: 'pending'; redirectUrl: string }>('/identity/start');
export const cancelIdentityVerification = () => post<IdentityState>('/identity/cancel');

// ── Notifications ──────────────────────────────────────────────────────

export const fetchNotifications = (page = 1) =>
  request<{ notifications: NotificationItem[]; unreadCount: number; total: number; pages: number }>(`/notifications?page=${page}`);
export const markAllNotificationsRead = () => put<{ success: boolean }>('/notifications/read-all');
export const markNotificationRead = (id: string) => put<{ notification: NotificationItem }>(`/notifications/${id}/read`);

// ── Reports & inquiries ────────────────────────────────────────────────

export const submitReport = (body: { targetType: ReportTarget; targetId: string; reason: ReportReason; details?: string }) => post<{ report: { id: string } }>('/reports', body);
export const submitInquiry = (body: Record<string, unknown>) => post<{ message: string }>('/inquiries', body);

// ── Admin ──────────────────────────────────────────────────────────────

export const admin = {
  stats: () => request<Record<string, number>>('/admin/stats'),
  listings: async (status: string) => {
    const data = await request<{ listings: any[]; total: number }>(`/admin/listings?status=${status}`);
    return { total: data.total, listings: data.listings.map((l) => ({ ...mapProperty(l), owner: l.ownerId })) };
  },
  moderate: (id: string, action: string, note = '') => patch<{ listing: any }>(`/admin/listings/${id}`, { action, note }),
  users: (q = '') => request<{ users: any[]; total: number }>(`/admin/users?q=${encodeURIComponent(q)}`),
  updateUser: (id: string, body: Record<string, unknown>) => patch<{ user: any }>(`/admin/users/${id}`, body),
  reports: (status = 'open') => request<{ reports: any[] }>(`/admin/reports?status=${status}`),
  resolveReport: (id: string, status: 'resolved' | 'dismissed', removeContent = false, note = '') =>
    patch<{ report: any }>(`/admin/reports/${id}`, { status, removeContent, note }),
  inquiries: () => request<{ inquiries: any[] }>('/admin/inquiries'),
  updateInquiry: (id: string, status: string) => patch<{ inquiry: any }>(`/admin/inquiries/${id}`, { status }),
};

// ── Uploads (Cloudinary via the server) ────────────────────────────────

export async function uploadImages(files: File[]): Promise<string[]> {
  const formData = new FormData();
  // Large phone photos would exceed the 5 MB limit; shrink them first.
  (await Promise.all(files.map(shrinkImage))).forEach((file) => formData.append('images', file));
  return (await request<{ urls: string[] }>('/upload', { method: 'POST', body: formData })).urls;
}
