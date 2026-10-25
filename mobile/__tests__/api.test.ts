import AsyncStorage from '@react-native-async-storage/async-storage';
import { request, setToken, setUnauthorizedHandler, login, register, mapProperty, sendMessage, fetchListingDetail } from '../src/services/api';

const json = (status: number, body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));

describe('mobile api client', () => {
  let fetchMock: jest.SpyInstance;
  beforeEach(async () => {
    await AsyncStorage.clear();
    setUnauthorizedHandler(null);
    fetchMock = jest.spyOn(global, 'fetch');
  });
  afterEach(() => fetchMock.mockRestore());

  test('uses the configured base URL and bearer token', async () => {
    await setToken('tok');
    fetchMock.mockImplementation(() => json(200, { ok: 1 }));
    await request('/x');
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.test/api/x');
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer tok');
  });

  test('server error message is surfaced', async () => {
    fetchMock.mockImplementation(() => json(409, { message: 'Slot taken' }));
    await expect(request('/visits', { method: 'POST', body: '{}' })).rejects.toMatchObject({ message: 'Slot taken', status: 409 });
  });

  test('network failure → friendly message', async () => {
    fetchMock.mockImplementation(() => Promise.reject(new TypeError('Network request failed')));
    await expect(request('/x')).rejects.toThrow(/Could not reach the server/);
  });

  test('expired session triggers the sign-out handler', async () => {
    await setToken('old');
    const handler = jest.fn();
    setUnauthorizedHandler(handler);
    fetchMock.mockImplementation(() => json(401, { message: 'Session expired' }));
    await expect(request('/auth/me')).rejects.toThrow();
    expect(handler).toHaveBeenCalled();
  });

  test('login and register store the token; register sends terms consent', async () => {
    fetchMock.mockImplementation(() => json(200, { token: 'T1', user: { id: 'u1' } }));
    await login('a@b.com', 'Secret123');
    expect(await AsyncStorage.getItem('drisya_token')).toBe('T1');
    await register({ fullName: 'A', email: 'a@b.com', password: 'Secret123', role: 'tenant', acceptTerms: true });
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).acceptTerms).toBe(true);
  });

  test('sendMessage drops a null propertyId', async () => {
    fetchMock.mockImplementation(() => json(201, { message: {} }));
    await sendMessage({ receiverId: 'u2', text: 'hi', propertyId: null });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ receiverId: 'u2', text: 'hi' });
  });

  test('listing detail maps owner (no email) and viewer info', async () => {
    fetchMock.mockImplementation(() => json(200, {
      property: { _id: 'p1', title: 'T', price: 5000, roomsAvailable: 0 },
      owner: { id: 'o1', fullName: 'Owner', createdAt: '2025-01-01' },
      reviews: [{ id: 'r1', rating: 5 }],
      viewer: { isOwner: false, canReview: true, hasReviewed: false, hasStayed: false },
    }));
    const d = await fetchListingDetail('p1');
    expect(d.property.roomsAvailable).toBe(0);
    expect(d.owner).toMatchObject({ id: 'o1', name: 'Owner', joinedYear: 2025 });
    expect(d.owner?.phone).toBeUndefined();
    expect(d.reviews[0].author).toBe('Former member');
    expect(d.viewer?.canReview).toBe(true);
  });

  test('mapProperty defaults', () => {
    expect(mapProperty({ _id: '1', title: 'x', price: 1 })).toMatchObject({ id: '1', rules: [], amenities: [], status: 'active', instantBook: false });
  });
});
