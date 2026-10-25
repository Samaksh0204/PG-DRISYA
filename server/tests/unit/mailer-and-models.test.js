const mongoose = require('mongoose');
const { sendMail, outbox } = require('../../src/utils/mailer');
const User = require('../../src/models/User');
const Property = require('../../src/models/Property');
const Booking = require('../../src/models/Booking');
const Review = require('../../src/models/Review');

describe('mailer (test mode)', () => {
  beforeEach(() => { outbox.length = 0; });

  test('captures messages instead of sending them', async () => {
    await sendMail({ to: 'a@b.com', subject: 'Hi', text: 'Body', actionUrl: 'https://x.com/r?token=1', actionLabel: 'Go' });
    expect(outbox).toHaveLength(1);
    expect(outbox[0]).toMatchObject({ to: 'a@b.com', subject: 'Hi', actionUrl: 'https://x.com/r?token=1' });
    expect(outbox[0].text).toContain('Go: https://x.com/r?token=1');
  });

  test('escapes HTML in user-controlled text', async () => {
    await sendMail({ to: 'a@b.com', subject: 'x', text: '<script>alert(1)</script>' });
    expect(outbox[0].html).not.toContain('<script>');
    expect(outbox[0].html).toContain('&lt;script&gt;');
  });
});

// Schema validation runs without a database connection.
describe('model validation', () => {
  const id = () => new mongoose.Types.ObjectId();

  test('User public profile never exposes email, phone or password', () => {
    const u = new User({ fullName: 'A B', email: 'a@b.com', password: 'hash', phone: '999' });
    const pub = u.toPublicProfile();
    expect(pub.email).toBeUndefined();
    expect(pub.phone).toBeUndefined();
    expect(JSON.stringify(pub)).not.toContain('hash');
    expect(u.toProfile().email).toBe('a@b.com');
    expect(pub.avatar).toMatch(/^https:\/\/ui-avatars\.com/);
  });

  test('Property rejects zero price, too many photos and bad coordinates', () => {
    const p = new Property({ ownerId: id(), title: 'T', city: 'C', price: 0, photos: new Array(16).fill('https://x'), lat: 200 });
    const err = p.validateSync();
    expect(Object.keys(err.errors)).toEqual(expect.arrayContaining(['price', 'photos', 'lat']));
  });

  test('Booking requires valid date format and duration range', () => {
    const b = new Booking({ propertyId: id(), tenantId: id(), ownerId: id(), moveInDate: '01/02/2026', durationMonths: 40, monthlyRent: 1 });
    const err = b.validateSync();
    expect(Object.keys(err.errors)).toEqual(expect.arrayContaining(['moveInDate', 'durationMonths']));
  });

  test('Review rating bounds', () => {
    expect(new Review({ propertyId: id(), userId: id(), rating: 6 }).validateSync().errors.rating).toBeDefined();
    expect(new Review({ propertyId: id(), userId: id(), rating: 5 }).validateSync()).toBeUndefined();
  });
});
