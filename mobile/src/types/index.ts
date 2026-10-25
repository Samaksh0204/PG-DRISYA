export type Role = 'guest' | 'tenant' | 'owner' | 'admin';
export type OccupancyType = 'single' | 'double' | 'triple' | 'dorm';
export type GenderPreference = 'male' | 'female' | 'coed';

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
  emailVerified: boolean;
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
  ownerReply?: { text: string; date: string } | null;
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
  status: string;
  moderationNote?: string;
  roomsAvailable: number;
  rules: string[];
}

export interface City {
  name: string;
  listingCount: number;
}

export interface NotificationItem {
  _id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  data?: Record<string, any>;
  createdAt: string;
}

export interface FavoriteItem {
  _id: string;
  propertyId: PropertyListing;
  createdAt: string;
}

export interface PropertySummary {
  _id: string;
  title: string;
  city: string;
  locality: string;
  photos: string[];
  price: number;
}

export interface PersonSummary {
  _id: string;
  fullName: string;
  avatar?: string;
  phone?: string;
}

export interface Visit {
  _id: string;
  propertyId: PropertySummary | null;
  tenantId: PersonSummary | string;
  date: string;
  timeSlot: string;
  message: string;
  status: string;
}

export interface Booking {
  _id: string;
  propertyId: PropertySummary | null;
  tenantId: PersonSummary | string;
  moveInDate: string;
  durationMonths: number;
  occupants: number;
  message: string;
  monthlyRent: number;
  deposit: number;
  status: string;
  instant: boolean;
  statusReason?: string;
}

export interface Conversation {
  id: string;
  propertyId: string | null;
  propertyTitle: string;
  participantId: string;
  participantName: string;
  participantAvatar: string;
  participantDeleted?: boolean;
  lastMessage: string;
  lastMessageTime: string;
  unread: number;
  messages: { id: string; sender: 'me' | 'them'; text: string; time: string; read: boolean }[];
}

// ── Navigation ──────────────────────────────────
export type RootStackParamList = {
  MainTabs: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ListingDetail: { id: string };
  EditProfile: undefined;
  AccountSettings: undefined;
  Aadhaar: undefined;
  AddListing: { editId?: string };
  Notifications: undefined;
  Trips: undefined;
  HostRequests: undefined;
  HostDashboard: undefined;
  Chat: { conversationId?: string; participantId: string; participantName: string; propertyId?: string | null; propertyTitle?: string };
  BookVisit: { propertyId: string; title: string };
  RequestBooking: { propertyId: string; title: string; price: number; deposit: number; instantBook: boolean; moveInDate?: string };
  WriteReview: { propertyId: string; title: string };
  Report: { targetType: 'listing' | 'user' | 'review' | 'message'; targetId: string; label: string };
};

export type TabParamList = {
  Home: undefined;
  Search: { city?: string; gender?: string; budget?: string };
  Favorites: undefined;
  Inbox: undefined;
  Profile: undefined;
};
