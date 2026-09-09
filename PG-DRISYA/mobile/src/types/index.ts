export type Role = 'guest' | 'tenant' | 'owner' | 'admin';
export type OccupancyType = 'single' | 'double' | 'triple' | 'dorm';
export type GenderPreference = 'male' | 'female' | 'coed';
export type SubscriptionTier = 'free' | 'starter' | 'growth' | 'elite';

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: Role;
  avatar: string;
  city: string;
  gender: string;
  bio: string;
  college: string;
  verified: boolean;
  subscriptionTier: SubscriptionTier;
  responseRate: number;
  responseTime: string;
  aadhaarVerified: boolean;
  createdAt: string;
}

export interface Review {
  id: string;
  author: string;
  authorAvatar: string;
  rating: number;
  date: string;
  text: string;
  verifiedStay: boolean;
  photos?: string[];
}

export interface Owner {
  id: string;
  name: string;
  avatar: string;
  phone: string;
  email?: string;
  joinedYear: number;
  verified: boolean;
  responseRate: number;
  responseTime: string;
  rating: number;
  reviewCount: number;
  listingCount: number;
  bio: string;
  subscriptionTier: SubscriptionTier;
}

export interface PropertyListing {
  id: string;
  title: string;
  ownerId: string;
  photos: string[];
  city: string;
  locality: string;
  lat: number;
  lng: number;
  genderPreference: GenderPreference;
  occupancy: OccupancyType;
  price: number;
  deposit: number;
  amenities: string[];
  description: string;
  rating: number;
  reviewCount: number;
  featured: boolean;
  instantBook: boolean;
  verified: boolean;
  moveInDate: string;
  distanceFromLandmark: string;
  reviews: Review[];
  virtualTour?: boolean;
  views: number;
  inquiries: number;
  bookings: number;
  status?: string;
  roomsAvailable?: number;
  rules?: string[];
}

export interface City {
  name: string;
  listingCount: number;
}

export interface NotificationItem {
  _id: string;
  title: string;
  body: string;
  type: 'info' | 'listing' | 'review' | 'visit' | 'system';
  read: boolean;
  data?: Record<string, any>;
  createdAt: string;
}

export interface FavoriteItem {
  _id: string;
  propertyId: PropertyListing;
  createdAt: string;
}

// ── Navigation ──────────────────────────────────
export type RootStackParamList = {
  MainTabs: undefined;
  Login: undefined;
  Register: undefined;
  ListingDetail: { id: string };
  EditProfile: undefined;
  Aadhaar: undefined;
  AddListing: { editId?: string };
  Notifications: undefined;
};

export type TabParamList = {
  Home: undefined;
  Search: { city?: string; gender?: string; budget?: string };
  Favorites: undefined;
  Profile: undefined;
};
