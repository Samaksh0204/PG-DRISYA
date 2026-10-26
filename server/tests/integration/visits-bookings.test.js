const { api, connect, clearDb, disconnect, makeUser, makeProperty, dateIn, outbox } = require('../helpers');
const Property = require('../../src/models/Property');
const Notification = require('../../src/models/Notification');
const Booking = require('../../src/models/Booking');

beforeAll(() => connect('visits_bookings'));
beforeEach(clearDb);
afterAll(disconnect);

async function setup(propOverrides = {}) {
  const owner = await makeUser('owner');
  const tenant = await makeUser('tenant');
  const property = await makeProperty(owner.user, propOverrides);
  return { owner, tenant, property };
}

describe('visits', () => {
  const visit = (p, extra = {}) => ({ propertyId: p._id.toString(), date: dateIn(2), timeSlot: '10:00 AM', ...extra });

  test('tenant books a visit; owner is notified', async () => {
    const { owner, tenant, property } = await setup();
    const res = await api().post('/api/visits').set(tenant.auth).send(visit(property, { message: 'Evening works too' }));
    expect(res.status).toBe(201);
    expect(res.body.visit.status).toBe('pending');
    expect(await Notification.exists({ userId: owner.user._id, type: 'visit' })).toBeTruthy();
    expect((await api().get('/api/visits/mine').set(tenant.auth)).body.visits).toHaveLength(1);
    const ownerList = await api().get('/api/visits/owner').set(owner.auth);
    expect(ownerList.body.visits[0].tenantId.fullName).toBe(tenant.user.fullName);
    expect(ownerList.body.visits[0].tenantId.email).toBeUndefined();
  });

  test('validation: past/far dates, bad slot, own property, inactive property', async () => {
    const { owner, tenant, property } = await setup();
    const post = async (auth, body) => (await api().post('/api/visits').set(auth).send(body)).status;
    expect(await post(tenant.auth, visit(property, { date: dateIn(-1) }))).toBe(400);
    expect(await post(tenant.auth, visit(property, { date: dateIn(61) }))).toBe(400);
    expect(await post(tenant.auth, visit(property, { date: '2026-02-30' }))).toBe(400);
    expect(await post(tenant.auth, visit(property, { timeSlot: '25:00' }))).toBe(400);
    expect(await post(owner.auth, visit(property))).toBe(400);
    const paused = await makeProperty(owner.user, { status: 'inactive' });
    expect(await post(tenant.auth, visit(paused))).toBe(404);
  });

  test('no double booking of a slot and one upcoming visit per tenant per property', async () => {
    const { property, tenant } = await setup();
    const other = await makeUser('tenant');
    expect((await api().post('/api/visits').set(tenant.auth).send(visit(property))).status).toBe(201);
    expect((await api().post('/api/visits').set(other.auth).send(visit(property))).status).toBe(409);
    expect((await api().post('/api/visits').set(tenant.auth).send(visit(property, { timeSlot: '11:00 AM' }))).status).toBe(409);
  });

  test('status transitions and permissions', async () => {
    const { owner, tenant, property } = await setup();
    const stranger = await makeUser('tenant');
    const id = (await api().post('/api/visits').set(tenant.auth).send(visit(property))).body.visit._id;
    const put = async (auth, status) => (await api().put(`/api/visits/${id}/status`).set(auth).send({ status })).status;

    expect(await put(tenant.auth, 'confirmed')).toBe(403);
    expect(await put(stranger.auth, 'cancelled')).toBe(404);
    expect(await put(owner.auth, 'completed')).toBe(400); // pending → completed not allowed
    expect(await put(owner.auth, 'confirmed')).toBe(200);
    expect(await put(owner.auth, 'completed')).toBe(400); // visit date is in the future
    expect(await put(tenant.auth, 'cancelled')).toBe(200);
    expect(await put(owner.auth, 'confirmed')).toBe(400); // terminal
    expect(await Notification.exists({ userId: owner.user._id, title: 'Visit cancelled' })).toBeTruthy();
  });
});

describe('bookings (request to book)', () => {
  const req = (p, extra = {}) => ({ propertyId: p._id.toString(), moveInDate: dateIn(10), durationMonths: 6, ...extra });

  test('request → owner accepts → room count goes down; emails and notifications sent', async () => {
    const { owner, tenant, property } = await setup({ roomsAvailable: 2, price: 9000, deposit: 18000 });
    const res = await api().post('/api/bookings').set(tenant.auth).send(req(property, { message: 'Student at DAVV' }));
    expect(res.status).toBe(201);
    expect(res.body.booking).toMatchObject({ status: 'pending', monthlyRent: 9000, deposit: 18000, instant: false });
    expect(outbox.some((m) => /New booking request/.test(m.subject))).toBe(true);

    const id = res.body.booking._id;
    const accepted = await api().put(`/api/bookings/${id}/status`).set(owner.auth).send({ status: 'accepted' });
    expect(accepted.body.booking.status).toBe('accepted');
    expect((await Property.findById(property._id)).roomsAvailable).toBe(1);
    expect(await Notification.exists({ userId: tenant.user._id, title: 'Booking accepted' })).toBeTruthy();

    // Even after acceptance the host's number is not shared (contact is in-app only)
    const detail = await api().get(`/api/properties/${property._id}`).set(tenant.auth);
    expect(detail.body.owner.phone).toBeUndefined();
    expect(JSON.stringify(detail.body)).not.toContain(owner.user.phone);
    expect(detail.body.viewer.hasStayed).toBe(true);
  });

  test('instant book confirms immediately while rooms remain', async () => {
    const { tenant, property } = await setup({ instantBook: true, roomsAvailable: 1 });
    const res = await api().post('/api/bookings').set(tenant.auth).send(req(property));
    expect(res.body.booking).toMatchObject({ status: 'accepted', instant: true });
    expect((await Property.findById(property._id)).roomsAvailable).toBe(0);
    const other = await makeUser('tenant');
    expect((await api().post('/api/bookings').set(other.auth).send(req(property))).status).toBe(409); // sold out
  });

  test('cannot accept when no rooms are left', async () => {
    const { owner, tenant, property } = await setup({ roomsAvailable: 1 });
    const t2 = await makeUser('tenant');
    const b1 = (await api().post('/api/bookings').set(tenant.auth).send(req(property))).body.booking._id;
    const b2 = (await api().post('/api/bookings').set(t2.auth).send(req(property))).body.booking._id;
    expect((await api().put(`/api/bookings/${b1}/status`).set(owner.auth).send({ status: 'accepted' })).status).toBe(200);
    expect((await api().put(`/api/bookings/${b2}/status`).set(owner.auth).send({ status: 'accepted' })).status).toBe(409);
  });

  test('cancelling an accepted booking frees the room again', async () => {
    const { owner, tenant, property } = await setup({ roomsAvailable: 1 });
    const id = (await api().post('/api/bookings').set(tenant.auth).send(req(property))).body.booking._id;
    await api().put(`/api/bookings/${id}/status`).set(owner.auth).send({ status: 'accepted' });
    const res = await api().put(`/api/bookings/${id}/status`).set(tenant.auth).send({ status: 'cancelled', reason: 'Found a place closer to college' });
    expect(res.body.booking).toMatchObject({ status: 'cancelled', cancelledBy: 'tenant', statusReason: 'Found a place closer to college' });
    expect((await Property.findById(property._id)).roomsAvailable).toBe(1);
  });

  test('an unconfirmed email cannot request a booking', async () => {
    const { property } = await setup();
    const unverified = await makeUser('tenant', { emailVerified: false });
    const res = await api().post('/api/bookings').set(unverified.auth).send(req(property));
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/confirm your email/);
  });

  test('validation and duplicates', async () => {
    const { owner, tenant, property } = await setup();
    const post = async (auth, body) => (await api().post('/api/bookings').set(auth).send(body)).status;
    expect(await post(tenant.auth, req(property, { moveInDate: dateIn(-2) }))).toBe(400);
    expect(await post(tenant.auth, req(property, { moveInDate: dateIn(200) }))).toBe(400);
    expect(await post(tenant.auth, req(property, { durationMonths: 0 }))).toBe(400);
    expect(await post(tenant.auth, req(property, { durationMonths: 2.5 }))).toBe(400);
    expect(await post(tenant.auth, req(property, { occupants: 9 }))).toBe(400);
    expect(await post(owner.auth, req(property))).toBe(400);
    expect(await post(tenant.auth, req(property))).toBe(201);
    expect(await post(tenant.auth, req(property))).toBe(409);
  });

  test('permissions and transitions', async () => {
    const { owner, tenant, property } = await setup();
    const stranger = await makeUser('owner');
    const id = (await api().post('/api/bookings').set(tenant.auth).send(req(property))).body.booking._id;
    const put = async (auth, status) => (await api().put(`/api/bookings/${id}/status`).set(auth).send({ status })).status;
    expect(await put(tenant.auth, 'accepted')).toBe(403);
    expect(await put(stranger.auth, 'declined')).toBe(404);
    expect(await put(owner.auth, 'completed')).toBe(400);
    expect(await put(owner.auth, 'declined')).toBe(200);
    expect(await put(owner.auth, 'accepted')).toBe(400);
  });

  test('completing is only allowed after move-in', async () => {
    const { owner, tenant, property } = await setup();
    const b = await Booking.create({ propertyId: property._id, tenantId: tenant.user._id, ownerId: owner.user._id, moveInDate: dateIn(-1), durationMonths: 3, monthlyRent: 1, status: 'accepted' });
    expect((await api().put(`/api/bookings/${b._id}/status`).set(owner.auth).send({ status: 'completed' })).status).toBe(200);
    const future = await Booking.create({ propertyId: property._id, tenantId: tenant.user._id, ownerId: owner.user._id, moveInDate: dateIn(5), durationMonths: 3, monthlyRent: 1, status: 'accepted' });
    expect((await api().put(`/api/bookings/${future._id}/status`).set(owner.auth).send({ status: 'completed' })).status).toBe(400);
  });

  test('lists for tenant and owner', async () => {
    const { owner, tenant, property } = await setup();
    await api().post('/api/bookings').set(tenant.auth).send(req(property));
    expect((await api().get('/api/bookings/mine').set(tenant.auth)).body.bookings[0].propertyId.title).toBe('Test PG');
    expect((await api().get('/api/bookings/owner').set(owner.auth)).body.bookings[0].tenantId.fullName).toBe(tenant.user.fullName);
    expect((await api().get('/api/bookings/owner').set(tenant.auth)).status).toBe(403);
  });
});
