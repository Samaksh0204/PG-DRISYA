import type { PropertyListing, Review, Owner, Conversation, NotificationItem } from '../types';

const BASE = import.meta.env.VITE_API_URL || '/api';

function getToken(): string | null {
  return localStorage.getItem('drisya_token');
}

export function setToken(token: string) {
  localStorage.setItem('drisya_token', token);
}

export function clearToken() {
  localStorage.removeItem('drisya_token');
}

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(opts.headers as Record<string, string> || {}),
  };
  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Request failed');
  return json;
}

// ── Auth ──────────────────────────────────────────────

export async function register(data: { fullName: string; email: string; password: string; phone?: string; role: string }) {
  return request<{ token: string; user: any }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function login(email: string, password: string) {
  return request<{ token: string; user: any }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function getMe() {
  return request<{ user: any }>('/auth/me');
}

export async function updateProfile(data: Record<string, any>) {
  return request<{ user: any }>('/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function changePassword(currentPassword: string, newPassword: string) {
  return request<{ message: string }>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export async function verifyAadhaar(aadhaarNumber: string) {
  return request<{ verified: boolean; user: any }>('/auth/verify-aadhaar', {
    method: 'POST',
    body: JSON.stringify({ aadhaarNumber }),
  });
}

// ── Properties ────────────────────────────────────────

function mapProperty(p: any): PropertyListing {
  return {
    id: p._id || p.id,
    title: p.title,
    ownerId: typeof p.ownerId === 'object' ? p.ownerId._id : p.ownerId,
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
    featured: p.featured || false,
    instantBook: p.instantBook || false,
    verified: p.verified || false,
    moveInDate: p.moveInDate || '',
    distanceFromLandmark: p.distanceFromLandmark || '',
    reviews: [],
    virtualTour: p.virtualTour || false,
    views: p.views || 0,
    inquiries: 0,
    bookings: 0,
    status: p.status || 'active',
    roomsAvailable: p.roomsAvailable || 1,
    rules: p.rules || [],
  };
}

export async function fetchListings(params?: Record<string, string>): Promise<PropertyListing[]> {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  const data = await request<{ properties: any[] }>(`/properties${qs}`);
  return data.properties.map(mapProperty);
}

export async function fetchListingById(id: string): Promise<PropertyListing | null> {
  try {
    const data = await request<{ property: any }>(`/properties/${id}`);
    return mapProperty(data.property);
  } catch {
    return null;
  }
}

/** Fetches property + owner + reviews in one call. */
export async function fetchListingDetail(id: string): Promise<{
  property: PropertyListing;
  owner: Owner | null;
  reviews: Review[];
} | null> {
  try {
    const data = await request<{ property: any; owner: any; reviews: any[] }>(`/properties/${id}`);
    const property = mapProperty(data.property);

    let owner: Owner | null = null;
    if (data.owner) {
      const o = data.owner;
      owner = {
        id: o._id || o.id,
        name: o.fullName || o.name || 'Property Owner',
        avatar: o.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(o.fullName || 'Owner')}&background=ff4d3d&color=fff`,
        phone: o.phone || '',
        email: o.email || '',
        joinedYear: o.createdAt ? new Date(o.createdAt).getFullYear() : new Date().getFullYear(),
        verified: o.verified || false,
        responseRate: o.responseRate || 0,
        responseTime: o.responseTime || 'within a day',
        rating: o.rating || 0,
        reviewCount: o.reviewCount || 0,
        listingCount: o.listingCount || 0,
        bio: o.bio || '',
        subscriptionTier: o.subscriptionTier || 'free',
      };
    }

    const reviews: Review[] = (data.reviews || []).map((r: any) => ({
      id: r.id || r._id,
      author: r.author || 'Anonymous',
      authorAvatar: r.authorAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.author || 'A')}&background=14b8a6&color=fff&size=100`,
      rating: r.rating,
      date: r.date,
      text: r.text,
      verifiedStay: r.verifiedStay || false,
      photos: r.photos || [],
    }));

    return { property, owner, reviews };
  } catch {
    return null;
  }
}

export async function fetchOwnerListings(): Promise<PropertyListing[]> {
  const data = await request<{ properties: any[] }>('/properties/owner/mine');
  return data.properties.map(mapProperty);
}

export async function fetchOwnerAnalytics() {
  return request<{
    totalListings: number;
    activeListings: number;
    totalViews: number;
    totalRooms: number;
    avgRating: number;
    totalReviews: number;
    visits: { pending: number; confirmed: number; completed: number; cancelled: number };
    propertyStats: Array<{
      id: string; title: string; city: string; views: number;
      rating: number; reviewCount: number; roomsAvailable: number;
      status: string; price: number;
    }>;
  }>('/properties/owner/analytics');
}

export async function createListing(body: Record<string, any>) {
  const res = await request<{ property: any }>('/properties', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return { property: mapProperty(res.property) };
}

export async function updateListing(id: string, body: Record<string, any>) {
  const res = await request<{ property: any }>(`/properties/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  return { property: mapProperty(res.property) };
}

export async function deleteListing(id: string): Promise<void> {
  await request(`/properties/${id}`, { method: 'DELETE' });
}

// ── Owner profile ─────────────────────────────────────

export async function fetchOwner(id: string): Promise<Owner | null> {
  try {
    const data = await request<{ user: any }>(`/auth/me`);
    const u = data.user;
    return {
      id: u._id,
      name: u.fullName,
      avatar: u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.fullName)}&background=ff4d3d&color=fff`,
      phone: u.phone || '',
      joinedYear: new Date(u.createdAt).getFullYear(),
      verified: u.verified || false,
      responseRate: u.responseRate || 0,
      responseTime: u.responseTime || 'within a day',
      rating: 0,
      reviewCount: 0,
      listingCount: 0,
      bio: u.bio || '',
      subscriptionTier: u.subscriptionTier || 'free',
    };
  } catch {
    return null;
  }
}

// ── Reviews ───────────────────────────────────────────

export async function fetchReviews(propertyId: string): Promise<Review[]> {
  try {
    const data = await request<{ reviews: any[] }>(`/reviews/${propertyId}`);
    return data.reviews.map((r: any) => ({
      id: r.id,
      author: r.author,
      authorAvatar: r.authorAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.author)}&background=14b8a6&color=fff&size=100`,
      rating: r.rating,
      date: r.date,
      text: r.text,
      verifiedStay: r.verifiedStay,
      photos: r.photos || [],
    }));
  } catch {
    return [];
  }
}

export async function submitReview(body: { propertyId: string; rating: number; text: string }) {
  return request('/reviews', { method: 'POST', body: JSON.stringify(body) });
}

// ── Favorites / Wishlist ──────────────────────────────

export async function fetchFavorites(): Promise<string[]> {
  try {
    const data = await request<{ favorites: any[] }>('/favorites');
    return data.favorites.map((f: any) => f.propertyId?._id || f.propertyId).filter(Boolean);
  } catch {
    return [];
  }
}

export async function fetchFavoriteIds(): Promise<string[]> {
  try {
    const data = await request<{ ids: string[] }>('/favorites/ids');
    return data.ids;
  } catch {
    return [];
  }
}

export async function toggleFavorite(propertyId: string, collection?: string): Promise<boolean> {
  const body: Record<string, string> = { propertyId };
  if (collection) body.collection = collection;
  const data = await request<{ saved: boolean }>('/favorites/toggle', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return data.saved;
}

export async function fetchWishlistCollections(): Promise<{ name: string; count: number }[]> {
  try {
    const data = await request<{ collections: { name: string; count: number }[] }>('/favorites/collections');
    return data.collections;
  } catch {
    return [];
  }
}

export async function fetchCollectionFavorites(name: string): Promise<any[]> {
  const data = await request<{ favorites: any[] }>(`/favorites/collection/${encodeURIComponent(name)}`);
  return data.favorites;
}

export async function moveFavoriteToCollection(propertyId: string, collection: string) {
  return request('/favorites/move', {
    method: 'PUT',
    body: JSON.stringify({ propertyId, collection }),
  });
}

export async function deleteWishlistCollection(name: string) {
  return request(`/favorites/collection/${encodeURIComponent(name)}`, { method: 'DELETE' });
}

// ── Visits ────────────────────────────────────────────

export async function scheduleVisit(body: { propertyId: string; date: string; timeSlot: string; message?: string }) {
  return request('/visits', { method: 'POST', body: JSON.stringify(body) });
}

export async function fetchMyVisits() {
  return request<{ visits: any[] }>('/visits/mine');
}

export async function fetchOwnerVisits() {
  return request<{ visits: any[] }>('/visits/owner');
}

export async function updateVisitStatus(id: string, status: string) {
  return request(`/visits/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
}

// ── Messages ──────────────────────────────────────────

export async function fetchConversations(): Promise<Conversation[]> {
  try {
    const data = await request<{ conversations: any[] }>('/messages/conversations');
    return data.conversations.map((c: any) => ({
      id: c.id,
      listingId: c.propertyId || '',
      listingTitle: c.propertyTitle || 'General',
      listingImage: c.propertyImage || '',
      participantId: c.participantId,
      participantName: c.participantName,
      participantAvatar: c.participantAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.participantName)}&background=14b8a6&color=fff`,
      participantRole: c.participantRole || 'tenant',
      lastMessage: c.lastMessage,
      lastMessageTime: c.lastMessageTime,
      unread: c.unread,
      messages: c.messages || [],
    }));
  } catch {
    return [];
  }
}

export async function sendMessage(body: { propertyId?: string; receiverId: string; text: string }) {
  return request('/messages', { method: 'POST', body: JSON.stringify(body) });
}

export async function markRead(propertyId: string, senderId: string) {
  return request('/messages/read', {
    method: 'PUT',
    body: JSON.stringify({ propertyId, senderId }),
  });
}

// ── Cities ───────────────────────────────────────────

export async function fetchCities(): Promise<{ name: string; listingCount: number }[]> {
  try {
    return await request<{ name: string; listingCount: number }[]>('/properties/cities');
  } catch {
    return [];
  }
}

// ── Notifications ────────────────────────────────────

export async function fetchNotifications(page = 1): Promise<{ notifications: NotificationItem[]; unreadCount: number; total: number }> {
  return request(`/notifications?page=${page}`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await request('/notifications/read-all', { method: 'PUT' });
}

export async function markNotificationRead(id: string): Promise<void> {
  await request(`/notifications/${id}/read`, { method: 'PUT' });
}

// ── Upload (Cloudinary) ─────────────────────────────

export async function uploadImages(files: File[]): Promise<string[]> {
  const token = getToken();
  const formData = new FormData();
  files.forEach((file) => formData.append('images', file));

  const res = await fetch(`${BASE}/upload`, {
    method: 'POST',
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: formData,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Upload failed');
  return json.urls;
}
