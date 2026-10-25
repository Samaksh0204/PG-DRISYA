const { api, connect, clearDb, disconnect, makeUser, makeProperty, dateIn } = require('../helpers');
const Property = require('../../src/models/Property');
const Visit = require('../../src/models/Visit');
const Booking = require('../../src/models/Booking');
const Notification = require('../../src/models/Notification');
const Message = require('../../src/models/Message');

beforeAll(() => connect('reviews_social'));
beforeEach(clearDb);
afterAll(disconnect);

async function stayed(tenant, property) {
  return Booking.create({ propertyId: property._id, tenantId: tenant._id, ownerId: property.ownerId, moveInDate: dateIn(-30), durationMonths: 3, monthlyRent: property.price, status: 'completed' });
}

describe('reviews', () => {
  test('cannot review without a completed visit or stay', async () => {
    const owner = await makeUser('owner');
    const tenant = await makeUser('tenant');
    const p = await makeProperty(owner.user);
    const res = await api().post('/api/reviews').set(tenant.auth).send({ propertyId: p._id.toString(), rating: 5, text: 'Fake!' });
    expect(res.status).toBe(403);
    expect((await api().get(`/api/reviews/eligibility/${p._id}`).set(tenant.auth)).body.canReview).toBe(false);
  });

  test('after a completed visit: review allowed but not marked as a verified stay', async () => {
    const owner = await makeUser('owner');
    const tenant = await makeUser('tenant');
    const p = await makeProperty(owner.user);
    await Visit.create({ propertyId: p._id, tenantId: tenant.user._id, ownerId: owner.user._id, date: dateIn(-1), timeSlot: '10:00 AM', status: 'completed' });
    const res = await api().post('/api/reviews').set(tenant.auth).send({ propertyId: p._id.toString(), rating: 4, text: 'Nice', ratings: { cleanliness: 5, food: 3 } });
    expect(res.status).toBe(201);
    expect(res.body.review).toMatchObject({ rating: 4, verifiedStay: false, ratings: { cleanliness: 5, food: 3 }, author: tenant.user.fullName });
    expect(await Notification.exists({ userId: owner.user._id, type: 'review' })).toBeTruthy();
  });

  test('stay → verified review; property rating is recomputed from real reviews', async () => {
    const owner = await makeUser('owner');
    const p = await makeProperty(owner.user);
    const t1 = await makeUser('tenant');
    const t2 = await makeUser('tenant');
    await stayed(t1.user, p);
    await stayed(t2.user, p);
    const r1 = await api().post('/api/reviews').set(t1.auth).send({ propertyId: p._id.toString(), rating: 5 });
    expect(r1.body.review.verifiedStay).toBe(true);
    await api().post('/api/reviews').set(t2.auth).send({ propertyId: p._id.toString(), rating: 2 });
    expect(await Property.findById(p._id)).toMatchObject({ rating: 3.5, reviewCount: 2 });

    expect((await api().post('/api/reviews').set(t1.auth).send({ propertyId: p._id.toString(), rating: 1 })).status).toBe(409);
    expect((await api().get(`/api/reviews/${p._id}`)).body.reviews).toHaveLength(2);

    // Author deletes their review → rating recalculated
    expect((await api().delete(`/api/reviews/${r1.body.review.id}`).set(t2.auth)).status).toBe(403);
    expect((await api().delete(`/api/reviews/${r1.body.review.id}`).set(t1.auth)).status).toBe(200);
    expect(await Property.findById(p._id)).toMatchObject({ rating: 2, reviewCount: 1 });
  });

  test('validation and owner self-review', async () => {
    const owner = await makeUser('owner');
    const tenant = await makeUser('tenant');
    const p = await makeProperty(owner.user);
    await stayed(tenant.user, p);
    const post = async (auth, body) => (await api().post('/api/reviews').set(auth).send({ propertyId: p._id.toString(), ...body })).status;
    expect(await post(tenant.auth, { rating: 6 })).toBe(400);
    expect(await post(tenant.auth, { rating: 3.5 })).toBe(400);
    expect(await post(tenant.auth, { rating: 4, ratings: { safety: 9 } })).toBe(400);
    expect(await post(tenant.auth, { rating: 4, photos: ['http://x.com/a.jpg'] })).toBe(400);
    expect(await post(owner.auth, { rating: 5 })).toBe(403);
  });

  test('owner can reply publicly; others cannot', async () => {
    const owner = await makeUser('owner');
    const tenant = await makeUser('tenant');
    const p = await makeProperty(owner.user);
    await stayed(tenant.user, p);
    const id = (await api().post('/api/reviews').set(tenant.auth).send({ propertyId: p._id.toString(), rating: 3, text: 'Food was cold' })).body.review.id;
    expect((await api().post(`/api/reviews/${id}/reply`).set(tenant.auth).send({ text: 'hi' })).status).toBe(403);
    expect((await api().post(`/api/reviews/${id}/reply`).set(owner.auth).send({ text: '' })).status).toBe(400);
    const res = await api().post(`/api/reviews/${id}/reply`).set(owner.auth).send({ text: 'Sorry! We fixed the kitchen heater.' });
    expect(res.body.review.ownerReply.text).toBe('Sorry! We fixed the kitchen heater.');
    const mine = await api().get('/api/reviews/owner/mine').set(owner.auth);
    expect(mine.body.reviews[0]).toMatchObject({ propertyTitle: 'Test PG', ownerReply: { text: 'Sorry! We fixed the kitchen heater.' } });
    const detail = await api().get(`/api/properties/${p._id}`);
    expect(detail.body.reviews[0].ownerReply.text).toMatch(/heater/);
    expect(detail.body.owner).toMatchObject({ rating: 3, reviewCount: 1 });
  });
});

describe('favorites (wishlist)', () => {
  test('toggle on/off, list with details, ids', async () => {
    const owner = await makeUser('owner');
    const tenant = await makeUser('tenant');
    const p = await makeProperty(owner.user);
    expect((await api().post('/api/favorites/toggle').set(tenant.auth).send({ propertyId: p._id.toString() })).body.saved).toBe(true);
    expect((await api().get('/api/favorites/ids').set(tenant.auth)).body.ids).toEqual([p._id.toString()]);
    expect((await api().get('/api/favorites').set(tenant.auth)).body.favorites[0].propertyId.title).toBe('Test PG');
    expect((await api().post('/api/favorites/toggle').set(tenant.auth).send({ propertyId: p._id.toString() })).body.saved).toBe(false);
    expect((await api().get('/api/favorites/ids').set(tenant.auth)).body.ids).toEqual([]);
  });

  test('cannot save missing or deleted listings; deleted ones disappear from the list', async () => {
    const owner = await makeUser('owner');
    const tenant = await makeUser('tenant');
    expect((await api().post('/api/favorites/toggle').set(tenant.auth).send({ propertyId: '507f1f77bcf86cd799439011' })).status).toBe(404);
    expect((await api().post('/api/favorites/toggle').set(tenant.auth).send({ propertyId: { $ne: null } })).status).toBe(400);
    const p = await makeProperty(owner.user);
    await api().post('/api/favorites/toggle').set(tenant.auth).send({ propertyId: p._id.toString() });
    await Property.updateOne({ _id: p._id }, { status: 'deleted' });
    expect((await api().get('/api/favorites').set(tenant.auth)).body.favorites).toHaveLength(0);
  });

  test('requires login', async () => {
    expect((await api().get('/api/favorites')).status).toBe(401);
  });
});

describe('messages', () => {
  test('send, group into conversations, unread count, mark read', async () => {
    const owner = await makeUser('owner');
    const tenant = await makeUser('tenant');
    const p = await makeProperty(owner.user);
    const send = (from, to, text, propertyId = p._id.toString()) => api().post('/api/messages').set(from.auth).send({ receiverId: to.user._id.toString(), propertyId, text });

    expect((await send(tenant, owner, 'Is a room free?')).status).toBe(201);
    await send(tenant, owner, 'For next month');
    await send(owner, tenant, 'Yes, one room');

    // only one unread "new message" notification per sender
    expect(await Notification.countDocuments({ userId: owner.user._id, type: 'message' })).toBe(1);

    const convos = (await api().get('/api/messages/conversations').set(owner.auth)).body.conversations;
    expect(convos).toHaveLength(1);
    expect(convos[0]).toMatchObject({ propertyTitle: 'Test PG', participantName: tenant.user.fullName, unread: 2, lastMessage: 'Yes, one room' });
    expect(convos[0].messages.map((m) => m.text)).toEqual(['Is a room free?', 'For next month', 'Yes, one room']);
    expect((await api().get('/api/messages/unread-count').set(owner.auth)).body.count).toBe(2);

    await api().put('/api/messages/read').set(owner.auth).send({ propertyId: p._id.toString(), senderId: tenant.user._id.toString() });
    expect((await api().get('/api/messages/unread-count').set(owner.auth)).body.count).toBe(0);
    expect(await Notification.countDocuments({ userId: owner.user._id, type: 'message', read: false })).toBe(0);
  });

  test('general (no listing) messages work', async () => {
    const a = await makeUser('tenant');
    const b = await makeUser('owner');
    expect((await api().post('/api/messages').set(a.auth).send({ receiverId: b.user._id.toString(), text: 'Hello' })).status).toBe(201);
    const convos = (await api().get('/api/messages/conversations').set(b.auth)).body.conversations;
    expect(convos[0]).toMatchObject({ propertyId: null, propertyTitle: 'General' });
  });

  test('validation', async () => {
    const a = await makeUser('tenant');
    const b = await makeUser('owner');
    const post = async (body) => (await api().post('/api/messages').set(a.auth).send(body)).status;
    expect(await post({ receiverId: a.user._id.toString(), text: 'me' })).toBe(400);
    expect(await post({ receiverId: b.user._id.toString(), text: '   ' })).toBe(400);
    expect(await post({ receiverId: b.user._id.toString(), text: 'x'.repeat(2001) })).toBe(400);
    expect(await post({ receiverId: '507f1f77bcf86cd799439011', text: 'hi' })).toBe(404);
    expect(await post({ receiverId: b.user._id.toString(), text: 'hi', propertyId: 'bad' })).toBe(400);
    expect(await Message.countDocuments()).toBe(0);
  });
});
