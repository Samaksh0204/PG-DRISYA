import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  PropertyListing, Owner, Review, City, User, NotificationItem, FavoriteItem, ViewerInfo, Visit, Booking, Conversation,
} from '../types';
import { apiUrlProblem } from '../utils/format';

// EXPO_PUBLIC_* variables are inlined at build time (set them in mobile/.env or eas.json).
export const BASE = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
export const WEB_URL = (process.env.EXPO_PUBLIC_WEB_URL || '').replace(/\/$/, '');

const urlProblem = apiUrlProblem(process.env.EXPO_PUBLIC_API_URL, __DEV__);
if (urlProblem) console.warn(`[api] ${urlProblem} See mobile/.env.example.`);

const REQUEST_TIMEOUT_MS = 15000;
const TOKEN_KEY = 'drisya_token';

export const getToken = () => AsyncStorage.getItem(TOKEN_KEY);
export const setToken = (token: string) => AsyncStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => AsyncStorage.removeItem(TOKEN_KEY);

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

export async function request<T>(path: string, opts: RequestInit & { timeoutMs?: number } = {}): Promise<T> {
  const token = await getToken();
  const isForm = typeof FormData !== 'undefined' && opts.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(opts.body && !isForm ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((opts.headers as Record<string, string>) || {}),
  };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs || REQUEST_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { ...opts, headers, signal: controller.signal });
  } catch (err: any) {
    if (err?.name === 'AbortError') throw new ApiError('Request timed out. Check your connection and try again.', 0);
    throw new ApiError('Could not reach the server. Check your connection and try again.', 0);
  } finally {
    clearTimeout(timeout);
  }
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
const patch = <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
const del = <T>(path: string, body?: unknown) => request<T>(path, { method: 'DELETE', body: body === undefined ? undefined : JSON.stringify(body) });

const avatarFor = (name: string, bg = 'ff4d3d') => `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'U')}&background=${bg}&color=fff`;

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
  };
}

export function mapReview(r: any): Review {
  return {
    id: r.id || r._id,
    author: r.author || 'Former member',
    authorAvatar: r.authorAvatar || avatarFor(r.author, '14b8a6'),
    rating: r.rating,
    date: r.date,
    text: r.text || '',
    verifiedStay: !!r.verifiedStay,
    ownerReply: r.ownerReply || null,
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
export const changePassword = (currentPassword: string, newPassword: string) => post<{ message: string; token: string }>('/auth/change-password', { currentPassword, newPassword });
export const resendVerification = () => post<{ message: string }>('/auth/resend-verification');
export const becomeOwner = () => post<AuthRes>('/auth/become-owner');
export const deleteAccount = (password: string) => del<{ message: string }>('/auth/me', { password });
export const verifyAadhaar = (aadhaarNumber: string) => post<{ verified: boolean; user: User }>('/auth/verify-aadhaar', { aadhaarNumber });

// ── Listings ────────────────────────────────────────
export async function fetchListings(params?: Record<string, string>): Promise<PropertyListing[]> {
  const qs = params ? `?${new URLSearchParams(params).toString()}` : '';
  return (await request<{ properties: any[] }>(`/properties${qs}`)).properties.map(mapProperty);
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
      phone: o.phone,
      joinedYear: o.createdAt ? new Date(o.createdAt).getFullYear() : new Date().getFullYear(),
      verified: !!o.verified,
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

// ── Favorites ───────────────────────────────────────
export const fetchFavorites = async (): Promise<FavoriteItem[]> =>
  (await request<{ favorites: any[] }>('/favorites')).favorites.map((f) => ({ ...f, propertyId: mapProperty(f.propertyId) }));
export const fetchFavoriteIds = async () => (await request<{ ids: string[] }>('/favorites/ids')).ids;
export const toggleFavorite = (propertyId: string) => post<{ saved: boolean }>('/favorites/toggle', { propertyId });

// ── Visits & bookings ───────────────────────────────
export const scheduleVisit = (body: { propertyId: string; date: string; timeSlot: string; message?: string }) => post<{ visit: Visit }>('/visits', body);
export const fetchMyVisits = async () => (await request<{ visits: Visit[] }>('/visits/mine')).visits;
export const fetchOwnerVisits = async () => (await request<{ visits: Visit[] }>('/visits/owner')).visits;
export const updateVisitStatus = (id: string, status: string) => put<{ visit: Visit }>(`/visits/${id}/status`, { status });

export const requestBooking = (body: { propertyId: string; moveInDate: string; durationMonths: number; message?: string }) => post<{ booking: Booking }>('/bookings', body);
export const fetchMyBookings = async () => (await request<{ bookings: Booking[] }>('/bookings/mine')).bookings;
export const fetchOwnerBookings = async () => (await request<{ bookings: Booking[] }>('/bookings/owner')).bookings;
export const updateBookingStatus = (id: string, status: string, reason = '') => put<{ booking: Booking }>(`/bookings/${id}/status`, { status, reason });

// ── Reviews & reports ───────────────────────────────
export const submitReview = (body: { propertyId: string; rating: number; text: string }) => post<{ review: any }>('/reviews', body);
export const submitReport = (body: { targetType: string; targetId: string; reason: string; details?: string }) => post<{ report: any }>('/reports', body);

// ── Messages ────────────────────────────────────────
export async function fetchConversations(): Promise<Conversation[]> {
  const data = await request<{ conversations: any[] }>('/messages/conversations');
  return data.conversations.map((c) => ({ ...c, participantAvatar: c.participantAvatar || avatarFor(c.participantName, '14b8a6') }));
}
export const sendMessage = (body: { receiverId: string; text: string; propertyId?: string | null }) =>
  post<{ message: any }>('/messages', { ...body, propertyId: body.propertyId || undefined });
export const markRead = (propertyId: string | null, senderId: string) => put<{ success: boolean }>('/messages/read', { propertyId, senderId });

// ── Notifications ───────────────────────────────────
export const fetchNotifications = (page = 1) => request<{ notifications: NotificationItem[]; unreadCount: number; total: number }>(`/notifications?page=${page}`);
export const markAllNotificationsRead = () => put<{ success: boolean }>('/notifications/read-all');

// ── Upload ──────────────────────────────────────────
export async function uploadImages(images: { uri: string; name: string; type: string }[]): Promise<string[]> {
  const formData = new FormData();
  images.forEach((img) => formData.append('images', { uri: img.uri, name: img.name, type: img.type } as any));
  return (await request<{ urls: string[] }>('/upload', { method: 'POST', body: formData, timeoutMs: 60000 })).urls;
}
