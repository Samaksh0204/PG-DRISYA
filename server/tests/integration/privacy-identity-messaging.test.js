// Privacy of listing/host data, identity verification, and private messaging.
const { api, connect, clearDb, disconnect, makeUser, makeProperty, dateIn } = require('../helpers');
const User = require('../../src/models/User');
const AuditLog = require('../../src/models/AuditLog');
const IdentityVerification = require('../../src/models/IdentityVerification');
const { signPayload } = require('../../src/services/identityProvider');

beforeAll(() => connect('privacy_identity_messaging'));
beforeEach(clearDb);
afterAll(disconnect);

const EXACT = { lat: 22.724355, lng: 75.883937 };

async function confirmedVisit(owner, tenant, property) {
  const v = await api().post('/api/visits').set(tenant.auth).send({ propertyId: property._id.toString(), date: dateIn(2), timeSlot: '10:00 AM' });
  await api().put(`/api/visits/${v.body.visit._id}/status`).set(owner.auth).send({ status: 'confirmed' });
}

describe('listing and host privacy', () => {
  test('search and listing pages never include host contact details or internal fields', async () => {
    const owner = await makeUser('owner');
    const p = await makeProperty(owner.user, { ...EXACT, moderationNote: 'internal: checked docs' });
    const search = await api().get('/api/properties');
    const detail = await api().get(`/api/properties/${p._id}`);
    const blob = JSON.stringify([search.body, detail.body]);
    expect(blob).not.toContain(owner.user.phone);
    expect(blob).not.toContain(owner.user.email);
    expect(blob).not.toContain('internal: checked docs');
    expect(detail.body.owner.phone).toBeUndefined();
    expect(detail.body.owner.email).toBeUndefined();
    expect(search.body.properties[0].moderationNote).toBeUndefined();
  });

  test('public map position is approximate; exact only after a confirmed visit', async () => {
    const owner = await makeUser('owner');
    const tenant = await makeUser('tenant');
    const p = await makeProperty(owner.user, EXACT);

    const anon = (await api().get(`/api/properties/${p._id}`)).body.property;
    expect(anon.lat).toBe(22.72);
    expect(anon.lng).toBe(75.88);
    expect(anon.exactLocation).toBe(false);
    expect((await api().get('/api/properties')).body.properties[0].lat).toBe(22.72);

    const ownView = (await api().get(`/api/properties/${p._id}`).set(owner.auth)).body.property;
    expect(ownView.lat).toBe(EXACT.lat);

    await confirmedVisit(owner, tenant, p);
    const tenantView = (await api().get(`/api/properties/${p._id}`).set(tenant.auth)).body;
    expect(tenantView.property.lat).toBe(EXACT.lat);
    expect(tenantView.property.exactLocation).toBe(true);
    expect(tenantView.owner.phone).toBe(owner.user.phone);
  });

  test('public profiles and wishlists use the public listing shape', async () => {
    const owner = await makeUser('owner');
    const tenant = await makeUser('tenant');
    const p = await makeProperty(owner.user, { ...EXACT, moderationNote: 'secret note' });
    await api().post('/api/favorites/toggle').set(tenant.auth).send({ propertyId: p._id.toString() });
    const fav = (await api().get('/api/favorites').set(tenant.auth)).body.favorites[0].propertyId;
    expect(fav.moderationNote).toBeUndefined();
    expect(fav.lat).toBe(22.72);
    const profile = (await api().get(`/api/users/${owner.user._id}`)).body;
    expect(JSON.stringify(profile)).not.toContain(owner.user.phone);
    expect(profile.listings[0].moderationNote).toBeUndefined();
  });

  test("hosts see a tenant's phone only once the visit is confirmed", async () => {
    const owner = await makeUser('owner');
    const tenant = await makeUser('tenant');
    const p = await makeProperty(owner.user);
    const v = await api().post('/api/visits').set(tenant.auth).send({ propertyId: p._id.toString(), date: dateIn(2), timeSlot: '10:00 AM' });
    let list = (await api().get('/api/visits/owner').set(owner.auth)).body.visits;
    expect(list[0].tenantId.fullName).toBe(tenant.user.fullName);
    expect(list[0].tenantId.phone).toBeUndefined();
    await api().put(`/api/visits/${v.body.visit._id}/status`).set(owner.auth).send({ status: 'confirmed' });
    list = (await api().get('/api/visits/owner').set(owner.auth)).body.visits;
    expect(list[0].tenantId.phone).toBe(tenant.user.phone);
  });

  test("users cannot change another user's listing or visit", async () => {
    const owner = await makeUser('owner');
    const otherOwner = await makeUser('owner');
    const tenant = await makeUser('tenant');
    const stranger = await makeUser('tenant');
    const p = await makeProperty(owner.user);
    expect((await api().put(`/api/properties/${p._id}`).set(otherOwner.auth).send({ price: 1 })).status).toBe(403);
    const v = await api().post('/api/visits').set(tenant.auth).send({ propertyId: p._id.toString(), date: dateIn(2), timeSlot: '10:00 AM' });
    expect((await api().put(`/api/visits/${v.body.visit._id}/status`).set(stranger.auth).send({ status: 'cancelled' })).status).toBe(404);
    expect((await api().put(`/api/visits/${v.body.visit._id}/status`).set(tenant.auth).send({ status: 'confirmed' })).status).toBe(403);
  });

  test('search page size is capped', async () => {
    const owner = await makeUser('owner');
    await Promise.all(Array.from({ length: 55 }, () => makeProperty(owner.user)));
    const res = await api().get('/api/properties?limit=1000');
    expect(res.body.properties).toHaveLength(50);
    expect((await api().get('/api/properties?page=500')).status).toBe(400);
  });
});

describe('identity verification', () => {
  afterEach(() => {
    delete process.env.IDV_PROVIDER;
    delete process.env.IDV_WEBHOOK_SECRET;
  });

  test('reports "unavailable" honestly when no provider is configured', async () => {
    const u = await makeUser('tenant');
    const status = (await api().get('/api/identity/status').set(u.auth)).body;
    expect(status).toMatchObject({ status: 'unverified', available: false });
    const start = await api().post('/api/identity/start').set(u.auth);
    expect(start.status).toBe(503);
    expect(start.body.code).toBe('IDV_UNAVAILABLE');
  });

  test('users cannot mark themselves verified through the profile API', async () => {
    const u = await makeUser('tenant');
    await api().put('/api/auth/profile').set(u.auth).send({ identityStatus: 'verified', aadhaarVerified: true, verified: true });
    const fresh = await User.findById(u.user._id);
    expect(fresh.identityStatus).toBe('unverified');
    expect(fresh.verified).toBe(false);
    expect((await api().get('/api/auth/me').set(u.auth)).body.user.aadhaarVerified).toBe(false);
  });

  test('provider flow: start → signed webhook verifies; bad or replayed signatures are rejected', async () => {
    process.env.IDV_PROVIDER = 'mock';
    process.env.IDV_WEBHOOK_SECRET = 'whsec_test_0123456789';
    const u = await makeUser('tenant');
    const start = await api().post('/api/identity/start').set(u.auth);
    expect(start.status).toBe(201);
    expect(start.body.redirectUrl).toMatch(/^https:\/\//);
    expect((await api().get('/api/identity/status').set(u.auth)).body.status).toBe('pending');

    const attempt = await IdentityVerification.findOne({ userId: u.user._id });
    const body = JSON.stringify({ sessionId: attempt.providerRef, status: 'verified', aadhaarNumber: '999999999999', name: 'Leak Test' });
    const send = (sig, ts = Date.now()) => api().post('/api/identity/webhook').set('Content-Type', 'application/json')
      .set('x-idv-timestamp', String(ts)).set('x-idv-signature', `sha256=${sig}`).send(body);

    expect((await send('0'.repeat(64))).status).toBe(401);
    const old = Date.now() - 10 * 60 * 1000;
    expect((await send(signPayload(process.env.IDV_WEBHOOK_SECRET, old, body), old)).status).toBe(401);

    const ts = Date.now();
    expect((await send(signPayload(process.env.IDV_WEBHOOK_SECRET, ts, body), ts)).status).toBe(200);
    const status = (await api().get('/api/identity/status').set(u.auth)).body;
    expect(status.status).toBe('verified');

    // Provider retries are acknowledged without re-applying.
    const ts2 = Date.now();
    expect((await send(signPayload(process.env.IDV_WEBHOOK_SECRET, ts2, body), ts2)).body.duplicate).toBe(true);

    // Nothing from the provider payload beyond the outcome is stored or logged.
    const stored = JSON.stringify([await IdentityVerification.find().lean(), await AuditLog.find().lean(), await User.findById(u.user._id).lean()]);
    expect(stored).not.toContain('999999999999');
    expect(stored).not.toContain('Leak Test');

    // Badge appears on the public profile only now.
    expect((await api().get(`/api/users/${u.user._id}`)).body.user.identityVerified).toBe(true);
  });

  test('verification records are private; only admins can review, never themselves', async () => {
    const u = await makeUser('tenant');
    const other = await makeUser('tenant');
    const admin = await makeUser('admin');
    expect((await api().get(`/api/identity/admin/${u.user._id}`).set(other.auth)).status).toBe(403);
    expect((await api().post(`/api/identity/admin/${u.user._id}/review`).set(u.auth).send({ decision: 'verified' })).status).toBe(403);
    expect((await api().post(`/api/identity/admin/${admin.user._id}/review`).set(admin.auth).send({ decision: 'verified' })).status).toBe(403);

    const res = await api().post(`/api/identity/admin/${u.user._id}/review`).set(admin.auth).send({ decision: 'verified', reason: 'documents checked in person' });
    expect(res.body.status).toBe('verified');
    expect(await AuditLog.exists({ action: 'identity.admin_verified', targetId: u.user._id.toString() })).toBeTruthy();
    // Identity verification is separate from the admin "verified host" flag.
    expect((await User.findById(u.user._id)).verified).toBe(false);
  });
});

describe('private messaging', () => {
  async function pair() {
    const owner = await makeUser('owner');
    const tenant = await makeUser('tenant');
    const p = await makeProperty(owner.user);
    return { owner, tenant, p };
  }
  const send = (from, to, text, extra = {}) => api().post('/api/messages').set(from.auth).send({ receiverId: to.user._id.toString(), text, ...extra });

  test('thread is paginated and identical for both participants', async () => {
    const { owner, tenant, p } = await pair();
    for (let i = 1; i <= 35; i++) {
      await send(i % 2 ? tenant : owner, i % 2 ? owner : tenant, `m${i}`, { propertyId: p._id.toString() });
    }
    const q = (who, other, extra = '') => api().get(`/api/messages/thread?with=${other.user._id}&propertyId=${p._id}${extra}`).set(who.auth);
    const first = (await q(tenant, owner)).body;
    expect(first.messages).toHaveLength(30);
    expect(first.hasMore).toBe(true);
    expect(first.messages.at(-1).text).toBe('m35');
    const older = (await q(tenant, owner, `&before=${encodeURIComponent(first.messages[0].time)}`)).body;
    expect(older.messages.map((m) => m.text)).toEqual(['m1', 'm2', 'm3', 'm4', 'm5']);
    expect(older.hasMore).toBe(false);
    // The other participant (e.g. on another device/platform) sees the same history.
    const ownerView = (await q(owner, tenant)).body.messages.map((m) => m.text);
    expect(ownerView).toEqual(first.messages.map((m) => m.text));
    // Polling for new messages only.
    await send(owner, tenant, 'new one', { propertyId: p._id.toString() });
    const since = (await q(tenant, owner, `&after=${encodeURIComponent(first.messages.at(-1).time)}`)).body.messages;
    expect(since.map((m) => m.text)).toEqual(['new one']);
  });

  test("an outsider can't read a conversation by changing ids", async () => {
    const { owner, tenant, p } = await pair();
    const outsider = await makeUser('tenant');
    await send(tenant, owner, 'private hello', { propertyId: p._id.toString() });
    const res = await api().get(`/api/messages/thread?with=${owner.user._id}&propertyId=${p._id}`).set(outsider.auth);
    expect(res.status).toBe(200);
    expect(res.body.messages).toHaveLength(0);
    const convos = (await api().get('/api/messages/conversations').set(outsider.auth)).body.conversations;
    expect(convos).toHaveLength(0);
    expect((await api().get(`/api/messages/thread?with=${owner.user._id}`)).status).toBe(401);
  });

  test('retried sends with the same clientId are stored once', async () => {
    const { owner, tenant } = await pair();
    const clientId = 'c_abcdef123456';
    const a = await send(tenant, owner, 'hi', { clientId });
    const b = await send(tenant, owner, 'hi', { clientId });
    expect(a.status).toBe(201);
    expect(b.status).toBe(200);
    expect(b.body.duplicate).toBe(true);
    expect(String(b.body.message._id)).toBe(String(a.body.message._id));
    expect((await send(tenant, owner, 'x', { clientId: 'bad id!' })).status).toBe(400);
  });

  test('blocking stops messages both ways and can be undone', async () => {
    const { owner, tenant } = await pair();
    await api().post('/api/messages/block').set(owner.auth).send({ userId: tenant.user._id.toString() });
    expect((await send(tenant, owner, 'hello?')).status).toBe(403);
    expect((await send(owner, tenant, 'hi')).status).toBe(403);
    const thread = (await api().get(`/api/messages/thread?with=${tenant.user._id}`).set(owner.auth)).body;
    expect(thread.blockedByMe).toBe(true);
    await api().delete(`/api/messages/block/${tenant.user._id}`).set(owner.auth);
    expect((await send(tenant, owner, 'hello again')).status).toBe(201);
  });

  test('sharing contact details is allowed but flagged, and content is stored as plain text', async () => {
    const { owner, tenant } = await pair();
    const res = await send(tenant, owner, 'call me on 98765 43210');
    expect(res.status).toBe(201);
    expect(res.body.warning).toBe('contact_info');
    const html = await send(tenant, owner, '<img src=x onerror=alert(1)>');
    expect(html.body.message.text).toBe('<img src=x onerror=alert(1)>');
    expect(html.body.warning).toBeUndefined();
  });
});
