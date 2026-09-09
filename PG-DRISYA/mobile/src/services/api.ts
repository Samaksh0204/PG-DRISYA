import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PropertyListing, Owner, Review, City, User, NotificationItem, FavoriteItem } from '../types';

// ─────────────────────────────────────────────────────
// Reads from EXPO_PUBLIC_API_URL (set in .env).
// Fallback is localhost for web; physical devices need
// your machine's LAN IP in .env.
// ─────────────────────────────────────────────────────
const BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

const TOKEN_KEY = 'drisya_token';
const REQUEST_TIMEOUT_MS = 15_000; // 15-second timeout

async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function setToken(token: string) {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function clearToken() {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(opts.headers as Record<string, string> || {}),
  };

  // Abort after timeout so requests don't hang forever
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${BASE}${path}`, {
      ...opts,
      headers,
      signal: controller.signal,
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Request failed');
    return json;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('Request timed out — check your network connection');
    }
    // Provide a friendlier message for network failures
    if (err.message === 'Network request failed') {
      throw new Error('Cannot reach the server — make sure EXPO_PUBLIC_API_URL is set to your machine\'s IP');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ── Property mapper ──────────────────────────────────
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

// ── Auth ─────────────────────────────────────────────
export async function login(email: string, password: string) {
  const data = await request<{ token: string; user: any }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  await setToken(data.token);
  return data;
}

export async function register(body: { fullName: string; email: string; password: string; phone?: string; role: string }) {
  const data = await request<{ token: string; user: any }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  await setToken(data.token);
  return data;
}

export async function getMe(): Promise<{ user: User }> {
  return request<{ user: User }>('/auth/me');
}

export async function updateProfile(updates: Partial<User>): Promise<{ user: User }> {
  return request<{ user: User }>('/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function verifyAadhaar(aadhaarNumber: string): Promise<{ verified: boolean; user: User }> {
  return request<{ verified: boolean; user: User }>('/auth/verify-aadhaar', {
    method: 'POST',
    body: JSON.stringify({ aadhaarNumber }),
  });
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
  return request<{ message: string }>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

// ── Properties ───────────────────────────────────────
export async function fetchListings(params?: Record<string, string>): Promise<PropertyListing[]> {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  const data = await request<{ properties: any[] }>(`/properties${qs}`);
  return data.properties.map(mapProperty);
}

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

export async function createListing(data: Record<string, any>): Promise<{ property: PropertyListing }> {
  const res = await request<{ property: any }>('/properties', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return { property: mapProperty(res.property) };
}

export async function updateListing(id: string, data: Record<string, any>): Promise<{ property: PropertyListing }> {
  const res = await request<{ property: any }>(`/properties/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return { property: mapProperty(res.property) };
}

export async function deleteListing(id: string): Promise<void> {
  await request(`/properties/${id}`, { method: 'DELETE' });
}

export async function fetchOwnerListings(): Promise<PropertyListing[]> {
  const data = await request<{ properties: any[] }>('/properties/owner/mine');
  return data.properties.map(mapProperty);
}

// ── Cities ───────────────────────────────────────────
export async function fetchCities(): Promise<City[]> {
  try {
    return await request<City[]>('/properties/cities');
  } catch {
    return [];
  }
}

// ── Favorites ────────────────────────────────────────
export async function fetchFavorites(): Promise<FavoriteItem[]> {
  const data = await request<{ favorites: FavoriteItem[] }>('/favorites');
  return data.favorites;
}

export async function fetchFavoriteIds(): Promise<string[]> {
  const data = await request<{ ids: string[] }>('/favorites/ids');
  return data.ids;
}

export async function toggleFavorite(propertyId: string, collection?: string): Promise<{ saved: boolean }> {
  const body: Record<string, string> = { propertyId };
  if (collection) body.collection = collection;
  return request<{ saved: boolean }>('/favorites/toggle', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function fetchWishlistCollections(): Promise<{ name: string; count: number }[]> {
  try {
    const data = await request<{ collections: { name: string; count: number }[] }>('/favorites/collections');
    return data.collections;
  } catch {
    return [];
  }
}

export async function moveFavoriteToCollection(propertyId: string, collection: string) {
  return request('/favorites/move', {
    method: 'PUT',
    body: JSON.stringify({ propertyId, collection }),
  });
}

// ── Notifications ────────────────────────────────────
export async function fetchNotifications(page = 1): Promise<{ notifications: NotificationItem[]; unreadCount: number; total: number }> {
  return request(`/notifications?page=${page}`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await request('/notifications/read-all', { method: 'PUT' });
}

// ── Upload ───────────────────────────────────────────
export async function uploadImages(images: { uri: string; name: string; type: string }[]): Promise<string[]> {
  const token = await getToken();
  const formData = new FormData();
  images.forEach((img) => {
    formData.append('images', { uri: img.uri, name: img.name, type: img.type } as any);
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000); // 60s for uploads

  try {
    const res = await fetch(`${BASE}/upload`, {
      method: 'POST',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: formData,
      signal: controller.signal,
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Upload failed');
    return json.urls;
  } catch (err: any) {
    if (err.name === 'AbortError') throw new Error('Upload timed out');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
