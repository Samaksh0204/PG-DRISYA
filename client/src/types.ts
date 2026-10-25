export type Role = 'guest' | 'tenant' | 'owner' | 'admin';

export type OccupancyType = 'single' | 'double' | 'triple' | 'dorm';
export type GenderPreference = 'male' | 'female' | 'coed';
export type SubscriptionTier = 'free' | 'starter' | 'growth' | 'elite';
export type ListingStatus = 'active' | 'inactive' | 'pending_review' | 'rejected' | 'deleted';

export interface Amenity {
  key: string;
  label: string;
  icon: string;
}

export interface CategoryRatings {
  cleanliness?: number;
  accuracy?: number;
  safety?: number;
  food?: number;
  value?: number;
}

export interface Review {
  id: string;
  author: string;
  authorId?: string | null;
  authorAvatar: string;
  rating: number;
  ratings?: CategoryRatings;
  date: string;
  text: string;
  verifiedStay: boolean;
  photos?: string[];
  ownerReply?: { text: string; date: string } | null;
  propertyId?: string;
  propertyTitle?: string;
}

export interface Owner {
  id: string;
  name: string;
  avatar: string;
  phone?: string;
  joinedYear: number;
  verified: boolean;
  responseRate: number;
  responseTime: string;
  rating: number;
  reviewCount: number;
  listingCount: number;
  bio: string;
}

export interface ViewerInfo {
  isOwner: boolean;
  hasReviewed: boolean;
  canReview: boolean;
  hasStayed: boolean;
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
  views: number;
  status: ListingStatus;
  moderationNote?: string;
  roomsAvailable: number;
  rules: string[];
  createdAt?: string;
}

export interface City {
  id: string;
  name: string;
  state: string;
  listingCount: number;
  image: string;
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
  participantDeleted?: boolean;
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

export interface NotificationItem {
  _id: string;
  title: string;
  body: string;
  type: 'info' | 'listing' | 'review' | 'visit' | 'booking' | 'message' | 'report' | 'account' | 'system';
  read: boolean;
  data?: Record<string, any>;
  createdAt: string;
}

export type VisitStatus = 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'completed';
export type BookingStatus = 'pending' | 'accepted' | 'declined' | 'cancelled' | 'completed';

export interface PropertySummary {
  _id: string;
  title: string;
  city: string;
  locality: string;
  photos: string[];
  price: number;
  status?: ListingStatus;
  roomsAvailable?: number;
}

export interface PersonSummary {
  _id: string;
  fullName: string;
  avatar?: string;
  phone?: string;
  emailVerified?: boolean;
}

export interface Visit {
  _id: string;
  propertyId: PropertySummary | null;
  tenantId: PersonSummary | string;
  ownerId: string;
  date: string;
  timeSlot: string;
  message: string;
  status: VisitStatus;
  createdAt: string;
}

export interface Booking {
  _id: string;
  propertyId: PropertySummary | null;
  tenantId: PersonSummary | string;
  ownerId: string;
  moveInDate: string;
  durationMonths: number;
  occupants: number;
  message: string;
  monthlyRent: number;
  deposit: number;
  status: BookingStatus;
  instant: boolean;
  cancelledBy?: string;
  statusReason?: string;
  createdAt: string;
}

export interface UserProfile {
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
  budgetMin: number;
  budgetMax: number;
  preferredLocality: string;
  verified: boolean;
  emailVerified: boolean;
  aadhaarVerified: boolean;
  createdAt: string;
}

export interface PublicProfile {
  id: string;
  fullName: string;
  role: Role;
  avatar: string;
  city: string;
  bio: string;
  verified: boolean;
  responseRate: number;
  responseTime: string;
  createdAt: string;
  rating: number;
  reviewCount: number;
  listingCount: number;
}

export interface SiteStats {
  activeListings: number;
  verifiedListings: number;
  cities: number;
  reviews: number;
  avgRating: number;
}

export type ReportReason = 'fake_listing' | 'inaccurate' | 'scam' | 'harassment' | 'unsafe' | 'offensive' | 'discrimination' | 'other';
export type ReportTarget = 'listing' | 'user' | 'review' | 'message';
