// Where a notification should take the user — shared by the Notifications list and
// by tapping a phone push, so both open the same screen.
import type { RootStackParamList, Role } from '../types';

export interface NotificationLike {
  type?: string;
  title?: string;
  body?: string;
  data?: Record<string, any> | null;
}

export type Destination = { [K in keyof RootStackParamList]: { name: K; params: RootStackParamList[K] } }[keyof RootStackParamList];

export function routeForNotification(n: NotificationLike, role: Role | undefined): Destination | null {
  const data = n.data || {};
  const type = n.type || data.type;
  const text = `${n.title || ''} ${n.body || ''}`;
  const host = role === 'owner' || role === 'admin';

  if (type === 'message') {
    // Push payloads name the sender, so open that chat directly; the in-app list falls back to the inbox.
    if (data.senderId) {
      return {
        name: 'Chat',
        params: { participantId: String(data.senderId), participantName: data.senderName || 'Messages', propertyId: data.propertyId || null, propertyTitle: data.propertyTitle || undefined },
      };
    }
    return { name: 'MainTabs', params: { screen: 'Inbox' } };
  }
  if (type === 'booking' || type === 'visit') {
    const incoming = /request|instant booking|cancelled by the tenant/i.test(text);
    return host && incoming ? { name: 'HostRequests', params: undefined } : { name: 'Trips', params: undefined };
  }
  if (type === 'listing' && /your listing/i.test(n.title || '')) return { name: 'HostDashboard', params: undefined };
  if (type === 'review' && host && !data.propertyId) return { name: 'HostDashboard', params: undefined };
  if (type === 'account' && data.identityStatus) return { name: 'Aadhaar', params: undefined };
  if (data.inquiryId && role === 'admin') return { name: 'Admin', params: undefined };
  if (data.reportId && role === 'admin') return { name: 'Admin', params: undefined };
  if (data.propertyId) return { name: 'ListingDetail', params: { id: String(data.propertyId) } };
  return { name: 'Notifications', params: undefined };
}
