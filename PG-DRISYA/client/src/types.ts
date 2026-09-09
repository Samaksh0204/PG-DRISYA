export type Role = 'guest' | 'tenant' | 'owner' | 'admin';

export type VerificationStatus = 'unverified' | 'submitted' | 'under_review' | 'verified' | 'rejected';

export type OccupancyType = 'single' | 'double' | 'triple' | 'dorm';

export type GenderPreference = 'male' | 'female' | 'coed';

export type SubscriptionTier = 'free' | 'starter' | 'growth' | 'elite';

export type BookingType = 'instant' | 'request';

export interface Amenity {
  key: string;
  label: string;
  icon: string;
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
  id: string;
  name: string;
  state: string;
  listingCount: number;
  image: string;
}

export interface Inquiry {
  id: string;
  listingId: string;
  tenantName: string;
  date: string;
  status: 'pending' | 'responded' | 'visit_scheduled' | 'booked' | 'declined';
  moveInDate: string;
  message: string;
}

export interface Conversation {
  id: string;
  listingId: string;
  listingTitle: string;
  listingImage: string;
  participantId: string;
  participantName: string;
  participantAvatar: string;
  participantRole: Role;
  lastMessage: string;
  lastMessageTime: string;
  unread: number;
  messages: Message[];
}

export interface Message {
  id: string;
  sender: 'me' | 'them';
  text: string;
  time: string;
  read: boolean;
}

export interface WishlistCollection {
  id: string;
  name: string;
  listingIds: string[];
}

// ── New production types ──────────────────────────────

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
