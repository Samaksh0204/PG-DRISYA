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
  // No phone: host numbers are never sent to tenants (contact is in-app messages only).
  joinedYear: number;
  verified: boolean;
  identityVerified?: boolean;
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
  // false = lat/lng are rounded to ~1 km (public view); true for owner / confirmed tenants.
  exactLocation?: boolean;
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
  blockedByMe?: boolean;
  blockedMe?: boolean;
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
  clientId?: string | null;
  // Client-only state for messages that haven't reached the server yet.
  pending?: boolean;
  failed?: boolean;
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
  identityStatus?: IdentityStatus;
  identityVerifiedAt?: string | null;
  createdAt: string;
}

// Identity (Aadhaar) verification through an authorised provider — separate from
// email confirmation and from the admin "Verified" badge on listings/hosts.
export type IdentityStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

export interface IdentityAttempt {
  id: string;
  status: 'pending' | 'verified' | 'rejected' | 'failed' | 'cancelled' | 'expired' | 'revoked';
  provider: string;
  reason: string;
  createdAt: string;
  completedAt: string | null;
}

export interface IdentityState {
  status: IdentityStatus;
  verifiedAt: string | null;
  available: boolean;
  latestAttempt: IdentityAttempt | null;
}

export interface ThreadPage {
  messages: Message[];
  hasMore: boolean;
  participant: { id: string; fullName: string; avatar: string; role: Role; deleted: boolean; suspended: boolean };
  property: { id: string; title: string; photo: string } | null;
  blockedByMe: boolean;
  blockedMe: boolean;
}

export interface PublicProfile {
  id: string;
  fullName: string;
  role: Role;
  avatar: string;
  city: string;
  bio: string;
  verified: boolean;
  identityVerified?: boolean;
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
