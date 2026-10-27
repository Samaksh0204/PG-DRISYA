import { describe, expect, test, vi, beforeEach } from 'vitest';
import { request, setToken, getToken, clearToken, setUnauthorizedHandler, mapProperty, mapReview, searchListings, ApiError, sendMessage } from '../lib/api';

function mockFetch(status: number, body: unknown) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));
}

describe('api client', () => {
  beforeEach(() => setUnauthorizedHandler(null));

  test('token storage helpers', () => {
    setToken('abc');
    expect(getToken()).toBe('abc');
    clearToken();
    expect(getToken()).toBeNull();
  });

  test('sends the bearer token and JSON content type', async () => {
    setToken('tok123');
    const f = mockFetch(200, { ok: true });
    await request('/x', { method: 'POST', body: JSON.stringify({ a: 1 }) });
    const [url, init] = f.mock.calls[0];
    expect(url).toBe('/api/x');
    expect((init!.headers as Record<string, string>).Authorization).toBe('Bearer tok123');
    expect((init!.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });

  test('turns server errors into ApiError with the server message', async () => {
    mockFetch(409, { message: 'Already booked' });
    await expect(request('/x')).rejects.toMatchObject({ message: 'Already booked', status: 409 });
  });

  test('a sleeping server is woken up and the request retried once', async () => {
    const { onServerWaking } = await import('../lib/api');
    const states: boolean[] = [];
    const off = onServerWaking((w) => states.push(w));
    let calls = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      calls += 1;
      if (url.endsWith('/health')) return new Response('{}', { status: 200 });
      if (calls === 1) return new Response('<html>starting</html>', { status: 503 });
      return new Response(JSON.stringify({ ok: 1 }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });
    await expect(request('/x')).resolves.toEqual({ ok: 1 });
    expect(states).toEqual([true, false]);
    off();
  });

  test('network failure gives a friendly message', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    const err = (await request('/x').catch((e) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.message).toMatch(/Could not reach the server/);
  });

  test('401 with a stored token triggers the session-expired handler', async () => {
    setToken('old');
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    mockFetch(401, { message: 'Session expired' });
    await expect(request('/auth/me')).rejects.toThrow('Session expired');
    expect(handler).toHaveBeenCalledOnce();
  });

  test('401 without a token (wrong password) does not trigger it', async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    mockFetch(401, { message: 'Invalid email or password' });
    await expect(request('/auth/login', { method: 'POST', body: '{}' })).rejects.toThrow();
    expect(handler).not.toHaveBeenCalled();
  });

  test('searchListings drops empty params and maps results', async () => {
    const f = mockFetch(200, { properties: [{ _id: 'p1', title: 'A', price: 5000, photos: [] }], total: 1, page: 1, pages: 1 });
    const res = await searchListings({ search: 'indore', gender: '', minPrice: undefined, page: 1 });
    expect(f.mock.calls[0][0]).toBe('/api/properties?search=indore&page=1');
    expect(res.listings[0]).toMatchObject({ id: 'p1', title: 'A', price: 5000, status: 'active', rules: [] });
  });

  test('sendMessage omits an empty propertyId', async () => {
    const f = mockFetch(201, { message: {} });
    await sendMessage({ receiverId: 'u1', text: 'hi', propertyId: '' });
    expect(JSON.parse(f.mock.calls[0][1]!.body as string)).toEqual({ receiverId: 'u1', text: 'hi' });
  });

  test('mapProperty fills safe defaults and handles populated owners', () => {
    const p = mapProperty({ _id: '1', title: 'T', ownerId: { _id: 'o1' }, price: 1, roomsAvailable: 0 });
    expect(p).toMatchObject({ id: '1', ownerId: 'o1', roomsAvailable: 0, amenities: [], verified: false, instantBook: false });
  });

  test('mapReview labels deleted authors and generates an avatar', () => {
    const r = mapReview({ id: 'r1', rating: 4 });
    expect(r.author).toBe('Former member');
    expect(r.authorAvatar).toMatch(/ui-avatars/);
    expect(r.ownerReply).toBeNull();
  });
});
