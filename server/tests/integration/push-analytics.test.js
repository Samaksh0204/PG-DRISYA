// Phone push notifications and usage analytics.
const { api, connect, clearDb, disconnect, makeUser, makeProperty, dateIn } = require('../helpers');
const PushToken = require('../../src/models/PushToken');
const AnalyticsEvent = require('../../src/models/AnalyticsEvent');

beforeAll(() => connect('push_analytics'));
beforeEach(clearDb);
afterAll(disconnect);

const TOKEN_A = 'ExponentPushToken[aaaaaaaaaaaaaaaaaaaaaa]';
const TOKEN_B = 'ExponentPushToken[bbbbbbbbbbbbbbbbbbbbbb]';
const wait = (ms = 80) => new Promise((r) => setTimeout(r, ms));

describe('push notifications', () => {
  let fetchSpy;
  let sent;
  const realFetch = global.fetch;
  beforeEach(() => {
    process.env.PUSH_IN_TESTS = 'true';
    sent = [];
    fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(async (url, init) => {
      if (String(url).startsWith('https://exp.host/')) {
        const batch = JSON.parse(init.body);
        sent.push(...batch);
        const data = batch.map((m) => (m.to === TOKEN_B ? { status: 'error', details: { error: 'DeviceNotRegistered' } } : { status: 'ok', id: 'x' }));
        return new Response(JSON.stringify({ data }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return realFetch(url, init);
    });
  });
  afterEach(() => {
    fetchSpy.mockRestore();
    delete process.env.PUSH_IN_TESTS;
  });

  test('register validates the token and moves it to the latest account on that phone', async () => {
    const a = await makeUser('tenant');
    const b = await makeUser('tenant');
    expect((await api().post('/api/push/register').set(a.auth).send({ token: 'not-a-token' })).status).toBe(400);
    expect((await api().post('/api/push/register').send({ token: TOKEN_A })).status).toBe(401);
    await api().post('/api/push/register').set(a.auth).send({ token: TOKEN_A, platform: 'android' });
    await api().post('/api/push/register').set(b.auth).send({ token: TOKEN_A, platform: 'android' });
    const rows = await PushToken.find({ token: TOKEN_A });
    expect(rows).toHaveLength(1);
    expect(String(rows[0].userId)).toBe(String(b.user._id));
    // Someone else can't unregister your device.
    await api().post('/api/push/unregister').set(a.auth).send({ token: TOKEN_A });
    expect(await PushToken.countDocuments()).toBe(1);
    await api().post('/api/push/unregister').set(b.auth).send({ token: TOKEN_A });
    expect(await PushToken.countDocuments()).toBe(0);
  });

  test('a visit request pushes to the host, and a message pushes with the sender', async () => {
    const owner = await makeUser('owner');
    const tenant = await makeUser('tenant');
    const p = await makeProperty(owner.user);
    await api().post('/api/push/register').set(owner.auth).send({ token: TOKEN_A, platform: 'ios' });

    await api().post('/api/visits').set(tenant.auth).send({ propertyId: p._id.toString(), date: dateIn(2), timeSlot: '10:00 AM' });
    await wait();
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ to: TOKEN_A, data: { type: 'visit', propertyId: p._id.toString() } });
    expect(JSON.stringify(sent[0])).not.toContain(tenant.user.phone);

    await api().post('/api/messages').set(tenant.auth).send({ receiverId: owner.user._id.toString(), propertyId: p._id.toString(), text: 'Is a room free?' });
    await wait();
    expect(sent[1]).toMatchObject({ to: TOKEN_A, title: tenant.user.fullName, body: 'Is a room free?', data: { type: 'message', senderId: tenant.user._id.toString(), propertyId: p._id.toString() } });
  });

  test('devices Expo reports as unregistered are forgotten', async () => {
    const owner = await makeUser('owner');
    const tenant = await makeUser('tenant');
    await api().post('/api/push/register').set(owner.auth).send({ token: TOKEN_B });
    await api().post('/api/messages').set(tenant.auth).send({ receiverId: owner.user._id.toString(), text: 'hello' });
    await wait(150);
    expect(await PushToken.countDocuments({ token: TOKEN_B })).toBe(0);
  });
});

describe('usage analytics', () => {
  test('records the key actions and reports them to admins only', async () => {
    const owner = await makeUser('owner');
    const tenant = await makeUser('tenant');
    const admin = await makeUser('admin');
    const p = await makeProperty(owner.user, { title: 'Sunrise PG', city: 'Indore' });

    await api().get('/api/properties?search=Sunrise').set('X-Client-Platform', 'android');
    await api().get('/api/properties?search=Sunrise&page=2'); // pagination isn't a new search
    await api().get('/api/properties?search=Nowhere%20Land').set('X-Client-Platform', 'web');
    await api().get(`/api/properties/${p._id}`).set(tenant.auth).set('X-Client-Platform', 'ios');
    await api().get(`/api/properties/${p._id}`).set(owner.auth); // owners viewing their own listing don't count
    await api().post('/api/visits').set(tenant.auth).send({ propertyId: p._id.toString(), date: dateIn(2), timeSlot: '10:00 AM' });
    await api().post('/api/bookings').set(tenant.auth).send({ propertyId: p._id.toString(), moveInDate: dateIn(5), durationMonths: 3 });
    await api().post('/api/messages').set(tenant.auth).send({ receiverId: owner.user._id.toString(), text: 'hi' });
    await api().post('/api/auth/register').send({ fullName: 'New Person', email: `new_${Date.now()}@test.com`, password: 'Password123', role: 'tenant', acceptTerms: true });
    await wait(150);

    expect((await api().get('/api/admin/analytics').set(tenant.auth)).status).toBe(403);
    const r = (await api().get('/api/admin/analytics?days=7').set(admin.auth)).body;
    expect(r.days).toBe(7);
    expect(r.totals.search.count).toBe(2);
    expect(r.totals.listing_view).toEqual({ count: 1, users: 1 });
    expect(r.totals.visit_requested.count).toBe(1);
    expect(r.totals.booking_requested.count).toBe(1);
    expect(r.totals.message_sent.count).toBe(1);
    expect(r.totals.signup.count).toBe(1);
    expect(r.platforms).toMatchObject({ android: 1, web: 1, ios: 1 });
    expect(r.topSearches.map((s) => s.term)).toEqual(expect.arrayContaining(['sunrise', 'nowhere land']));
    expect(r.zeroResultSearches.terms).toEqual([{ term: 'nowhere land', count: 1 }]);
    expect(r.topListings[0]).toMatchObject({ title: 'Sunrise PG', views: 1 });
    expect(r.funnel).toMatchObject({ listingViews: 1, visitRequests: 1, bookingRequests: 1, viewToVisitPct: 100 });

    // No raw ids, names or emails are stored with events.
    const stored = JSON.stringify(await AnalyticsEvent.find().lean());
    expect(stored).not.toContain(tenant.user._id.toString());
    expect(stored).not.toContain(tenant.user.email);
  });
});
