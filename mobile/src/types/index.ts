// Mirrors client/src/types.ts so both apps read the same server responses.
export type Role = 'guest' | 'tenant' | 'owner' | 'admin';
export type OccupancyType = 'single' | 'double' | 'triple' | 'dorm';
export type GenderPreference = 'male' | 'female' | 'coed';
export type ListingStatus = 'active' | 'inactive' | 'pending_review' | 'rejected' | 'deleted';
export type ReportReason = 'fake_listing' | 'inaccurate' | 'scam' | 'harassment' | 'unsafe' | 'offensive' | 'discrimination' | 'other';
export type ReportTarget = 'listing' | 'user' | 'review' | 'message';

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
  budgetMin: number;
  budgetMax: number;
  preferredLocality: string;
  verified: boolean;
  emailVerified: boolean;
  responseRate: number;
  responseTime: string;
  aadhaarVerified: boolean;
  identityStatus?: IdentityStatus;
  identityVerifiedAt?: string | null;
  createdAt: string;
}

// Identity (Aadhaar) verification through an authorised provider — separate from
// email confirmation and from the admin "Verified" badge on listings/hosts.
export type IdentityStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

export interface IdentityState {
  status: IdentityStatus;
  verifiedAt: string | null;
  available: boolean;
  latestAttempt: { id: string; status: string; provider: string; reason: string; createdAt: string; completedAt: string | null } | null;
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
  // false = lat/lng rounded to ~1 km (public view); true for owner / confirmed tenants.
  exactLocation?: boolean;
}

export interface ListingPage {
  listings: PropertyListing[];
  total: number;
  page: number;
  pages: number;
}

export interface City {
  name: string;
  listingCount: number;
}

export interface SiteStats {
  activeListings: number;
  verifiedListings: number;
  cities: number;
  reviews: number;
  avgRating: number;
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

export interface NotificationItem {
  _id: string;
  title: string;
  body: string;
  type: 'info' | 'listing' | 'review' | 'visit' | 'booking' | 'message' | 'report' | 'account' | 'system';
  read: boolean;
  data?: Record<string, any>;
  createdAt: string;
}

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

export type VisitStatus = 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'completed';
export type BookingStatus = 'pending' | 'accepted' | 'declined' | 'cancelled' | 'completed';

export interface Visit {
  _id: string;
  propertyId: PropertySummary | null;
  tenantId: PersonSummary | string;
  ownerId?: string;
  date: string;
  timeSlot: string;
  message: string;
  status: VisitStatus;
  createdAt?: string;
}

export interface Booking {
  _id: string;
  propertyId: PropertySummary | null;
  tenantId: PersonSummary | string;
  ownerId?: string;
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
  createdAt?: string;
}

export interface ChatMessage {
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

export interface ThreadPage {
  messages: ChatMessage[];
  hasMore: boolean;
  participant: { id: string; fullName: string; avatar: string; role: Role; deleted: boolean; suspended: boolean };
  property: { id: string; title: string; photo: string } | null;
  blockedByMe: boolean;
  blockedMe: boolean;
}

export interface Conversation {
  id: string;
  propertyId: string | null;
  propertyTitle: string;
  propertyImage: string;
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
  messages: ChatMessage[];
}

export interface AdminStats {
  users: number;
  owners: number;
  activeListings: number;
  pendingListings: number;
  openReports: number;
  newInquiries: number;
  pendingBookings: number;
  reviews: number;
}

export interface AdminListing extends PropertyListing {
  owner: { _id: string; fullName: string; email: string; phone?: string; verified?: boolean } | null;
}

export interface AdminUser extends User {
  suspended?: boolean;
  suspendedReason?: string;
  lastLoginAt?: string;
}

export interface AdminReport {
  _id: string;
  targetType: ReportTarget;
  targetId: string;
  reason: ReportReason;
  details?: string;
  status: 'open' | 'resolved' | 'dismissed';
  reporterId?: { fullName: string; email: string } | null;
  target?: { title?: string; fullName?: string; text?: string; status?: string } | null;
  createdAt: string;
}

export type AnalyticsEventName = 'search' | 'listing_view' | 'visit_requested' | 'booking_requested' | 'message_sent' | 'signup';

export interface AnalyticsReport {
  days: number;
  totals: Record<AnalyticsEventName, { count: number; users: number }>;
  daily: { name: AnalyticsEventName; day: string; count: number }[];
  platforms: Partial<Record<'web' | 'ios' | 'android' | 'unknown', number>>;
  topSearches: { term: string; count: number }[];
  zeroResultSearches: { total: number; terms: { term: string; count: number }[] };
  topListings: { propertyId: string; title: string; city: string; views: number }[];
  funnel: { listingViews: number; visitRequests: number; bookingRequests: number; viewToVisitPct: number; viewToBookingPct: number };
}

export interface Inquiry {
  _id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  locality: string;
  budget: number;
  moveInDate: string;
  message: string;
  status: 'new' | 'contacted' | 'closed';
  createdAt: string;
}

// ── Navigation ──────────────────────────────────
import type { NavigatorScreenParams } from '@react-navigation/native';

export type InfoPage = 'trust' | 'pricing' | 'help' | 'privacy' | 'terms';

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<TabParamList> | undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: { token?: string } | undefined;
  VerifyEmail: { token?: string } | undefined;
  ListingDetail: { id: string };
  HostProfile: { id: string; name?: string };
  EditProfile: undefined;
  AccountSettings: undefined;
  Aadhaar: undefined;
  AddListing: { editId?: string };
  Notifications: undefined;
  Trips: undefined;
  HostRequests: undefined;
  HostDashboard: undefined;
  Admin: undefined;
  Expert: undefined;
  Info: { page: InfoPage };
  Chat: { conversationId?: string; participantId: string; participantName: string; propertyId?: string | null; propertyTitle?: string };
  BookVisit: { propertyId: string; title: string };
  RequestBooking: { propertyId: string; title: string; price: number; deposit: number; instantBook: boolean; moveInDate?: string };
  WriteReview: { propertyId: string; title: string };
  Report: { targetType: ReportTarget; targetId: string; label: string };
};

export type SearchParams = {
  q?: string;
  city?: string;
  gender?: string;
  sort?: string;
  featured?: boolean;
  verified?: boolean;
  instantBook?: boolean;
  maxPrice?: string;
};

export type TabParamList = {
  Home: undefined;
  Search: SearchParams | undefined;
  Favorites: undefined;
  Inbox: undefined;
  Profile: undefined;
};
