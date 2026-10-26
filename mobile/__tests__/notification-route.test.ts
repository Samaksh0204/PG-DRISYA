import { routeForNotification } from '../src/navigation/notificationRoute';

describe('routeForNotification (push taps and the Notifications list)', () => {
  test('a message push opens that chat directly', () => {
    expect(routeForNotification({ data: { type: 'message', senderId: 'u2', senderName: 'Ravi', propertyId: 'p1', propertyTitle: 'Sunrise PG' } }, 'tenant'))
      .toEqual({ name: 'Chat', params: { participantId: 'u2', participantName: 'Ravi', propertyId: 'p1', propertyTitle: 'Sunrise PG' } });
  });

  test('a message without a sender opens the inbox', () => {
    expect(routeForNotification({ type: 'message', title: 'New message from Ravi' }, 'tenant')).toEqual({ name: 'MainTabs', params: { screen: 'Inbox' } });
  });

  test('booking and visit requests go to the host inbox for hosts, to trips for tenants', () => {
    expect(routeForNotification({ title: 'New booking request', data: { type: 'booking', propertyId: 'p1' } }, 'owner')).toEqual({ name: 'HostRequests', params: undefined });
    expect(routeForNotification({ title: 'Booking accepted', data: { type: 'booking', propertyId: 'p1' } }, 'tenant')).toEqual({ name: 'Trips', params: undefined });
    expect(routeForNotification({ title: 'Visit confirmed', data: { type: 'visit' } }, 'tenant')).toEqual({ name: 'Trips', params: undefined });
  });

  test('other types fall back to the listing, then the notifications list', () => {
    expect(routeForNotification({ title: 'The owner replied to your review', data: { type: 'review', propertyId: 'p9' } }, 'tenant')).toEqual({ name: 'ListingDetail', params: { id: 'p9' } });
    expect(routeForNotification({ title: 'Identity verified', data: { type: 'account', identityStatus: 'verified' } }, 'tenant')).toEqual({ name: 'Aadhaar', params: undefined });
    expect(routeForNotification({ title: 'Hello', data: { type: 'info' } }, 'tenant')).toEqual({ name: 'Notifications', params: undefined });
  });
});
