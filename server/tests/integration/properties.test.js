const { api, connect, clearDb, disconnect, makeUser, makeProperty, dateIn } = require('../helpers');
const Property = require('../../src/models/Property');
const Visit = require('../../src/models/Visit');
const Notification = require('../../src/models/Notification');

beforeAll(() => connect('properties'));
beforeEach(clearDb);
afterAll(disconnect);

const newListing = { title: 'Sunrise PG', city: 'Indore', locality: 'Palasia', price: 7000, deposit: 10000, amenities: ['wifi'], rules: ['No smoking'], photos: ['https://img.example.com/1.jpg'] };

describe('create & moderation', () => {
  test('tenant cannot create; owner listing goes to review', async () => {
    const tenant = await makeUser('tenant');
    expect((await api().post('/api/properties').set(tenant.auth).send(newListing)).status).toBe(403);

    const owner = await makeUser('owner');
    const res = await api().post('/api/properties').set(owner.auth).send(newListing);
    expect(res.status).toBe(201);
    expect(res.body.property.status).toBe('pending_review');

    // Not public yet
    expect((await api().get('/api/properties')).body.total).toBe(0);
    expect((await api().get(`/api/properties/${res.body.property._id}`)).status).toBe(404);
    // But the owner sees it
    expect((await api().get(`/api/properties/${res.body.property._id}`).set(owner.auth)).status).toBe(200);
    expect((await api().get('/api/properties/owner/mine').set(owner.auth)).body.properties).toHaveLength(1);
  });

  test('with moderation off, listing is live immediately and notifies tenants in that city (capped)', async () => {
    process.env.LISTING_MODERATION = 'false';
    try {
      const owner = await makeUser('owner');
      await makeUser('tenant', { city: 'indore' });
      await makeUser('tenant', { city: 'Bhopal' });
      const res = await api().post('/api/properties').set(owner.auth).send(newListing);
      expect(res.body.property.status).toBe('active');
      expect(await Notification.countDocuments({ type: 'listing' })).toBe(1);
    } finally {
      delete process.env.LISTING_MODERATION;
    }
  });

  test('owners cannot set system fields (featured, verified, views, rating, status)', async () => {
    const owner = await makeUser('owner');
    const res = await api().post('/api/properties').set(owner.auth).send({ ...newListing, featured: true, verified: true, views: 999, rating: 5, status: 'active', ownerId: '507f1f77bcf86cd799439011' });
    expect(res.body.property).toMatchObject({ featured: false, verified: false, views: 0, rating: 0, status: 'pending_review', ownerId: owner.user._id.toString() });
  });

  test('input validation', async () => {
    const owner = await makeUser('owner');
    const bad = async (body) => (await api().post('/api/properties').set(owner.auth).send({ ...newListing, ...body })).status;
    expect(await bad({ price: 0 })).toBe(400);
    expect(await bad({ title: '' })).toBe(400);
    expect(await bad({ photos: ['http://insecure.com/a.jpg'] })).toBe(400);
    expect(await bad({ amenities: 'wifi' })).toBe(400);
    expect(await bad({ moveInDate: '2026-02-31' })).toBe(400);
    expect(await bad({ lat: 120 })).toBe(400);
  });
});

describe('search', () => {
  beforeEach(async () => {
    const { user } = await makeUser('owner');
    await makeProperty(user, { title: 'Cheap Boys PG', price: 4000, genderPreference: 'male', amenities: ['wifi'], city: 'Indore' });
    await makeProperty(user, { title: 'Premium Girls PG', price: 12000, genderPreference: 'female', amenities: ['wifi', 'ac'], verified: true, rating: 4.8, city: 'Indore' });
    await makeProperty(user, { title: 'Bhopal Coed', price: 7000, genderPreference: 'coed', city: 'Bhopal', instantBook: true });
    await makeProperty(user, { title: 'Paused PG', status: 'inactive' });
    await makeProperty(user, { title: 'Pending PG', status: 'pending_review' });
  });

  test('only active listings are returned', async () => {
    const res = await api().get('/api/properties');
    expect(res.body.total).toBe(3);
  });

  test('filters: city, gender, price range, amenities, verified, instantBook, search text', async () => {
    const q = async (qs) => (await api().get(`/api/properties?${qs}`)).body.properties.map((p) => p.title);
    expect(await q('city=indore')).toHaveLength(2);
    expect(await q('gender=female')).toEqual(['Premium Girls PG']);
    expect(await q('minPrice=5000&maxPrice=8000')).toEqual(['Bhopal Coed']);
    expect(await q('amenities=wifi,ac')).toEqual(['Premium Girls PG']);
    expect(await q('verified=true')).toEqual(['Premium Girls PG']);
    expect(await q('instantBook=true')).toEqual(['Bhopal Coed']);
    expect(await q('search=boys')).toEqual(['Cheap Boys PG']);
    expect(await q('search=.*')).toEqual([]); // regex is escaped
    expect(await q('gender=robot')).toHaveLength(3); // invalid filters ignored
  });

  test('sorting and pagination', async () => {
    const asc = (await api().get('/api/properties?sort=price_asc')).body.properties.map((p) => p.price);
    expect(asc).toEqual([4000, 7000, 12000]);
    const desc = (await api().get('/api/properties?sort=price_desc')).body.properties.map((p) => p.price);
    expect(desc).toEqual([12000, 7000, 4000]);
    const page2 = await api().get('/api/properties?limit=2&page=2&sort=price_asc');
    expect(page2.body).toMatchObject({ page: 2, pages: 2, total: 3 });
    expect(page2.body.properties.map((p) => p.price)).toEqual([12000]);
  });

  test('cities endpoint groups case-insensitively', async () => {
    const { user } = await makeUser('owner');
    await makeProperty(user, { city: 'indore' });
    const res = await api().get('/api/properties/cities');
    expect(res.body.find((c) => c.name.toLowerCase() === 'indore').listingCount).toBe(3);
  });
});

describe('detail page', () => {
  test('counts views for visitors, not for the owner; invalid id is 400', async () => {
    const owner = await makeUser('owner');
    const p = await makeProperty(owner.user);
    await api().get(`/api/properties/${p._id}`);
    await api().get(`/api/properties/${p._id}`).set(owner.auth);
    expect((await Property.findById(p._id)).views).toBe(1);
    expect((await api().get('/api/properties/not-an-id')).status).toBe(400);
    expect((await api().get('/api/properties/507f1f77bcf86cd799439011')).status).toBe(404);
  });

  test("owner's email is never public; phone only after a confirmed visit", async () => {
    const owner = await makeUser('owner');
    const tenant = await makeUser('tenant');
    const p = await makeProperty(owner.user);

    const anon = await api().get(`/api/properties/${p._id}`);
    expect(anon.body.owner.email).toBeUndefined();
    expect(anon.body.owner.phone).toBeUndefined();
    expect(anon.body.viewer).toBeNull();

    const before = await api().get(`/api/properties/${p._id}`).set(tenant.auth);
    expect(before.body.owner.phone).toBeUndefined();
    expect(before.body.viewer).toMatchObject({ isOwner: false, canReview: false, hasReviewed: false });

    await Visit.create({ propertyId: p._id, tenantId: tenant.user._id, ownerId: owner.user._id, date: dateIn(1), timeSlot: '10:00 AM', status: 'confirmed' });
    const after = await api().get(`/api/properties/${p._id}`).set(tenant.auth);
    // Host numbers are never shared, even after a confirmed visit.
    expect(after.body.owner.phone).toBeUndefined();
    expect(JSON.stringify(after.body)).not.toContain(owner.user.phone);
  });
});

describe('update, pause, delete', () => {
  test('only the owner (or admin) can edit; whitelist applies', async () => {
    const owner = await makeUser('owner');
    const other = await makeUser('owner');
    const admin = await makeUser('admin');
    const p = await makeProperty(owner.user);
    expect((await api().put(`/api/properties/${p._id}`).set(other.auth).send({ title: 'Hacked' })).status).toBe(403);
    const res = await api().put(`/api/properties/${p._id}`).set(owner.auth).send({ title: 'Renamed', featured: true });
    expect(res.body.property).toMatchObject({ title: 'Renamed', featured: false });
    expect((await api().put(`/api/properties/${p._id}`).set(admin.auth).send({ price: 9000 })).body.property.price).toBe(9000);
  });

  test('editing a rejected listing resubmits it for review', async () => {
    const owner = await makeUser('owner');
    const p = await makeProperty(owner.user, { status: 'rejected', moderationNote: 'Blurry photos' });
    const res = await api().put(`/api/properties/${p._id}`).set(owner.auth).send({ photos: ['https://img.example.com/sharp.jpg'] });
    expect(res.body.property).toMatchObject({ status: 'pending_review', moderationNote: '' });
  });

  test('pause and resume; cannot pause while pending or rejected', async () => {
    const owner = await makeUser('owner');
    const p = await makeProperty(owner.user);
    expect((await api().patch(`/api/properties/${p._id}/status`).set(owner.auth).send({ status: 'inactive' })).body.property.status).toBe('inactive');
    expect((await api().get(`/api/properties/${p._id}`)).status).toBe(404);
    expect((await api().patch(`/api/properties/${p._id}/status`).set(owner.auth).send({ status: 'active' })).body.property.status).toBe('active');
    expect((await api().patch(`/api/properties/${p._id}/status`).set(owner.auth).send({ status: 'deleted' })).status).toBe(400);
    const pending = await makeProperty(owner.user, { status: 'pending_review' });
    expect((await api().patch(`/api/properties/${pending._id}/status`).set(owner.auth).send({ status: 'active' })).status).toBe(400);
  });

  test('soft delete hides the listing everywhere', async () => {
    const owner = await makeUser('owner');
    const p = await makeProperty(owner.user);
    expect((await api().delete(`/api/properties/${p._id}`).set(owner.auth)).status).toBe(200);
    expect((await api().get(`/api/properties/${p._id}`)).status).toBe(404);
    expect((await api().get('/api/properties/owner/mine').set(owner.auth)).body.properties).toHaveLength(0);
    expect((await api().delete(`/api/properties/${p._id}`).set(owner.auth)).status).toBe(404);
  });
});
