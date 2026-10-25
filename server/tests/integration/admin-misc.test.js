const { api, connect, clearDb, disconnect, makeUser, makeProperty, outbox } = require('../helpers');
const Property = require('../../src/models/Property');
const Review = require('../../src/models/Review');
const Notification = require('../../src/models/Notification');
const Report = require('../../src/models/Report');
const User = require('../../src/models/User');

beforeAll(() => connect('admin_misc'));
beforeEach(clearDb);
afterAll(disconnect);

describe('reports', () => {
  test('user reports a listing; admins are notified; duplicates blocked', async () => {
    const owner = await makeUser('owner');
    const tenant = await makeUser('tenant');
    const admin = await makeUser('admin');
    const p = await makeProperty(owner.user);
    const body = { targetType: 'listing', targetId: p._id.toString(), reason: 'fake_listing', details: 'Photos are from another website' };
    expect((await api().post('/api/reports').set(tenant.auth).send(body)).status).toBe(201);
    expect(await Notification.exists({ userId: admin.user._id, type: 'report' })).toBeTruthy();
    expect((await api().post('/api/reports').set(tenant.auth).send(body)).status).toBe(409);
    expect((await api().get('/api/reports/mine').set(tenant.auth)).body.reports).toHaveLength(1);
  });

  test('validation', async () => {
    const tenant = await makeUser('tenant');
    const post = async (body) => (await api().post('/api/reports').set(tenant.auth).send(body)).status;
    expect(await post({ targetType: 'planet', targetId: '507f1f77bcf86cd799439011', reason: 'other' })).toBe(400);
    expect(await post({ targetType: 'listing', targetId: '507f1f77bcf86cd799439011', reason: 'boring' })).toBe(400);
    expect(await post({ targetType: 'listing', targetId: '507f1f77bcf86cd799439011', reason: 'other' })).toBe(404);
    expect(await post({ targetType: 'user', targetId: tenant.user._id.toString(), reason: 'other' })).toBe(400);
  });
});

describe('admin', () => {
  test('non-admins are blocked from every admin route', async () => {
    const owner = await makeUser('owner');
    for (const path of ['/api/admin/stats', '/api/admin/listings', '/api/admin/users', '/api/admin/reports', '/api/admin/inquiries']) {
      expect((await api().get(path).set(owner.auth)).status).toBe(403);
      expect((await api().get(path)).status).toBe(401);
    }
  });

  test('moderation queue: approve publishes and notifies; reject needs a reason', async () => {
    const admin = await makeUser('admin');
    const owner = await makeUser('owner');
    await makeUser('tenant', { city: 'Indore' });
    const p = await makeProperty(owner.user, { status: 'pending_review' });
    const p2 = await makeProperty(owner.user, { status: 'pending_review', title: 'Second' });

    const queue = await api().get('/api/admin/listings?status=pending_review').set(admin.auth);
    expect(queue.body.total).toBe(2);
    expect(queue.body.listings[0].ownerId.email).toBe(owner.user.email);

    const approve = await api().patch(`/api/admin/listings/${p._id}`).set(admin.auth).send({ action: 'approve' });
    expect(approve.body.listing.status).toBe('active');
    expect(await Notification.exists({ userId: owner.user._id, title: 'Your listing is live' })).toBeTruthy();
    expect(await Notification.countDocuments({ type: 'listing', title: 'New PG in your city' })).toBe(1);
    expect(outbox.some((m) => m.subject === 'Your listing is live')).toBe(true);

    expect((await api().patch(`/api/admin/listings/${p2._id}`).set(admin.auth).send({ action: 'reject' })).status).toBe(400);
    const rej = await api().patch(`/api/admin/listings/${p2._id}`).set(admin.auth).send({ action: 'reject', note: 'Add real photos' });
    expect(rej.body.listing).toMatchObject({ status: 'rejected', moderationNote: 'Add real photos' });

    const ver = await api().patch(`/api/admin/listings/${p._id}`).set(admin.auth).send({ action: 'verify' });
    expect(ver.body.listing.verified).toBe(true);
    const feat = await api().patch(`/api/admin/listings/${p._id}`).set(admin.auth).send({ action: 'feature' });
    expect(feat.body.listing.featured).toBe(true);
    expect((await api().patch(`/api/admin/listings/${p._id}`).set(admin.auth).send({ action: 'explode' })).status).toBe(400);
  });

  test('suspending a user logs them out and pauses their listings', async () => {
    const admin = await makeUser('admin');
    const owner = await makeUser('owner');
    const p = await makeProperty(owner.user);
    const res = await api().patch(`/api/admin/users/${owner.user._id}`).set(admin.auth).send({ suspended: true, reason: 'Scam reports' });
    expect(res.body.user.suspended).toBe(true);
    expect((await api().get('/api/auth/me').set(owner.auth)).status).toBe(401);
    expect((await Property.findById(p._id)).status).toBe('inactive');
    expect((await api().patch(`/api/admin/users/${admin.user._id}`).set(admin.auth).send({ suspended: true })).status).toBe(400);

    const verify = await api().patch(`/api/admin/users/${owner.user._id}`).set(admin.auth).send({ verified: true, suspended: false });
    expect(verify.body.user).toMatchObject({ verified: true, suspended: false });
    const search = await api().get(`/api/admin/users?q=${encodeURIComponent(owner.user.email)}`).set(admin.auth);
    expect(search.body.users).toHaveLength(1);
  });

  test('resolving a report can remove the content', async () => {
    const admin = await makeUser('admin');
    const owner = await makeUser('owner');
    const tenant = await makeUser('tenant');
    const p = await makeProperty(owner.user, { rating: 1, reviewCount: 1 });
    const review = await Review.create({ propertyId: p._id, userId: tenant.user._id, rating: 1, text: 'abusive text' });
    const reporter = await makeUser('tenant');
    await api().post('/api/reports').set(reporter.auth).send({ targetType: 'review', targetId: review._id.toString(), reason: 'offensive' });

    const list = await api().get('/api/admin/reports').set(admin.auth);
    expect(list.body.reports[0].target.text).toBe('abusive text');
    const id = list.body.reports[0]._id;
    const res = await api().patch(`/api/admin/reports/${id}`).set(admin.auth).send({ status: 'resolved', removeContent: true, note: 'Removed' });
    expect(res.body.report.status).toBe('resolved');
    expect(await Review.findById(review._id)).toBeNull();
    expect(await Property.findById(p._id)).toMatchObject({ rating: 0, reviewCount: 0 });
    expect(await Notification.exists({ userId: reporter.user._id, title: 'Update on your report' })).toBeTruthy();
    expect((await Report.findById(id)).resolvedBy.toString()).toBe(admin.user._id.toString());
  });

  test('stats', async () => {
    const admin = await makeUser('admin');
    const owner = await makeUser('owner');
    await makeProperty(owner.user);
    await makeProperty(owner.user, { status: 'pending_review' });
    const res = await api().get('/api/admin/stats').set(admin.auth);
    expect(res.body).toMatchObject({ users: 2, owners: 1, activeListings: 1, pendingListings: 1, openReports: 0 });
  });
});

describe('expert inquiries', () => {
  test('public form saves a request and notifies admins; admin can update it', async () => {
    const admin = await makeUser('admin');
    expect((await api().post('/api/inquiries').send({ name: 'Ravi' })).status).toBe(400);
    expect((await api().post('/api/inquiries').send({ name: 'Ravi', email: 'bad' })).status).toBe(400);
    const res = await api().post('/api/inquiries').send({ name: 'Ravi', phone: '+91 98765 43210', city: 'Indore', budget: 8000, moveInDate: '2030-01-01' });
    expect(res.status).toBe(201);
    expect(await Notification.exists({ userId: admin.user._id, title: 'New Expert request' })).toBeTruthy();
    const list = await api().get('/api/admin/inquiries').set(admin.auth);
    expect(list.body.inquiries[0]).toMatchObject({ name: 'Ravi', city: 'Indore', status: 'new' });
    const upd = await api().patch(`/api/admin/inquiries/${list.body.inquiries[0]._id}`).set(admin.auth).send({ status: 'contacted' });
    expect(upd.body.inquiry.status).toBe('contacted');
  });
});

describe('public profiles, stats, notifications, health', () => {
  test('public host profile hides contact details', async () => {
    const owner = await makeUser('owner', { bio: 'I run 2 PGs' });
    await makeProperty(owner.user);
    await makeProperty(owner.user, { status: 'pending_review' });
    const res = await api().get(`/api/users/${owner.user._id}`);
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ fullName: owner.user.fullName, bio: 'I run 2 PGs', listingCount: 1 });
    expect(res.body.user.email).toBeUndefined();
    expect(res.body.user.phone).toBeUndefined();
    expect(res.body.listings).toHaveLength(1);
    await User.updateOne({ _id: owner.user._id }, { suspended: true });
    expect((await api().get(`/api/users/${owner.user._id}`)).status).toBe(404);
  });

  test('stats are computed from real data', async () => {
    const owner = await makeUser('owner');
    const tenant = await makeUser('tenant');
    const p = await makeProperty(owner.user, { city: 'Indore', verified: true });
    await makeProperty(owner.user, { city: 'indore' });
    await makeProperty(owner.user, { city: 'Bhopal' });
    await makeProperty(owner.user, { city: 'Pune', status: 'pending_review' });
    await Review.create({ propertyId: p._id, userId: tenant.user._id, rating: 4 });
    const res = await api().get('/api/stats');
    expect(res.body).toEqual({ activeListings: 3, verifiedListings: 1, cities: 2, reviews: 1, avgRating: 4 });
  });

  test('notifications: list, unread count, mark one, mark all; cannot touch others', async () => {
    const a = await makeUser('tenant');
    const b = await makeUser('tenant');
    const n1 = await Notification.create({ userId: a.user._id, title: 'One', body: 'x' });
    await Notification.create({ userId: a.user._id, title: 'Two', body: 'y' });
    const nb = await Notification.create({ userId: b.user._id, title: 'Theirs', body: 'z' });
    const list = await api().get('/api/notifications').set(a.auth);
    expect(list.body).toMatchObject({ total: 2, unreadCount: 2 });
    expect((await api().put(`/api/notifications/${nb._id}/read`).set(a.auth)).status).toBe(404);
    await api().put(`/api/notifications/${n1._id}/read`).set(a.auth);
    expect((await api().get('/api/notifications').set(a.auth)).body.unreadCount).toBe(1);
    await api().put('/api/notifications/read-all').set(a.auth);
    expect((await api().get('/api/notifications').set(a.auth)).body.unreadCount).toBe(0);
  });

  test('health reports database status; unknown routes are 404; bad JSON is 400', async () => {
    const h = await api().get('/api/health');
    expect(h.body).toMatchObject({ status: 'ok', db: 'up' });
    expect((await api().get('/api/nope')).status).toBe(404);
    const bad = await api().post('/api/auth/login').set('Content-Type', 'application/json').send('{"email":');
    expect(bad.status).toBe(400);
  });

  test('security headers are set and x-powered-by is hidden', async () => {
    const res = await api().get('/api/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  test('CORS: allowed origin passes, unknown origin is refused', async () => {
    const ok = await api().get('/api/health').set('Origin', 'http://localhost:5173');
    expect(ok.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    const bad = await api().get('/api/health').set('Origin', 'https://evil.example');
    expect(bad.status).toBe(403);
  });

  test('upload requires login and rejects non-images', async () => {
    expect((await api().post('/api/upload')).status).toBe(401);
    const { auth } = await makeUser('owner');
    const res = await api().post('/api/upload').set(auth).attach('images', Buffer.from('not an image'), { filename: 'x.txt', contentType: 'text/plain' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Only JPEG/);
  });
});
