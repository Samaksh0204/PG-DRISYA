// Cloudinary is replaced with a fake so uploads can be tested without real credentials.
jest.mock('../../src/config/cloudinary', () => ({
  uploader: {
    upload_stream: (opts, cb) => {
      const { Writable } = require('stream');
      return new Writable({
        write(_chunk, _enc, next) { next(); },
        final(done) { cb(null, { secure_url: `https://res.cloudinary.com/demo/${opts.folder}/img.jpg` }); done(); },
      });
    },
  },
}));

const { api, connect, clearDb, disconnect, makeUser, makeProperty, dateIn, PASSWORD } = require('../helpers');
const Property = require('../../src/models/Property');
const Booking = require('../../src/models/Booking');
const Notification = require('../../src/models/Notification');

beforeAll(() => connect('upload_deletion'));
beforeEach(clearDb);
afterAll(disconnect);

const PNG = Buffer.from('89504e470d0a1a0a', 'hex');

test('uploads images into a per-user folder and returns https URLs', async () => {
  const { user, auth } = await makeUser('owner');
  const res = await api().post('/api/upload').set(auth)
    .attach('images', PNG, { filename: 'a.png', contentType: 'image/png' })
    .attach('images', PNG, { filename: 'b.png', contentType: 'image/png' });
  expect(res.status).toBe(200);
  expect(res.body.urls).toHaveLength(2);
  expect(res.body.urls[0]).toContain(`pgdrisya/owner/${user._id}`);
});

test('avatar upload', async () => {
  const { auth } = await makeUser('tenant');
  const res = await api().post('/api/upload/avatar').set(auth).attach('avatar', PNG, { filename: 'me.png', contentType: 'image/png' });
  expect(res.body.url).toMatch(/^https:\/\/res\.cloudinary\.com/);
  expect((await api().post('/api/upload/avatar').set(auth)).status).toBe(400);
});

test('files over 5 MB are rejected', async () => {
  const { auth } = await makeUser('owner');
  const big = Buffer.alloc(5 * 1024 * 1024 + 10);
  const res = await api().post('/api/upload').set(auth).attach('images', big, { filename: 'big.jpg', contentType: 'image/jpeg' });
  expect(res.status).toBe(400);
  expect(res.body.message).toMatch(/5MB/);
});

test('deleting a tenant with an accepted booking cancels it, frees the room and tells the owner', async () => {
  const owner = await makeUser('owner');
  const tenant = await makeUser('tenant');
  const p = await makeProperty(owner.user, { roomsAvailable: 0 });
  const b = await Booking.create({ propertyId: p._id, tenantId: tenant.user._id, ownerId: owner.user._id, moveInDate: dateIn(5), durationMonths: 3, monthlyRent: 1, status: 'accepted' });
  const res = await api().delete('/api/auth/me').set(tenant.auth).send({ password: PASSWORD });
  expect(res.status).toBe(200);
  expect(await Booking.findById(b._id)).toMatchObject({ status: 'cancelled', cancelledBy: 'system' });
  expect((await Property.findById(p._id)).roomsAvailable).toBe(1);
  expect(await Notification.exists({ userId: owner.user._id, title: 'Booking cancelled' })).toBeTruthy();
});
