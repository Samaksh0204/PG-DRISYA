const { api, connect, clearDb, disconnect, makeUser, makeProperty, PASSWORD, outbox, tokenFromUrl } = require('../helpers');
const User = require('../../src/models/User');
const Property = require('../../src/models/Property');
const Favorite = require('../../src/models/Favorite');
const Visit = require('../../src/models/Visit');
const Notification = require('../../src/models/Notification');

beforeAll(() => connect('auth'));
beforeEach(clearDb);
afterAll(disconnect);

const signup = (overrides = {}) =>
  api().post('/api/auth/register').send({ fullName: 'Asha Rao', email: 'asha@example.com', password: 'Secret123', acceptTerms: true, ...overrides });

describe('register', () => {
  test('creates a tenant, returns a token, and sends a verification email', async () => {
    const res = await signup();
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user).toMatchObject({ email: 'asha@example.com', role: 'tenant', emailVerified: false });
    expect(res.body.user.password).toBeUndefined();
    expect(outbox[0].subject).toMatch(/Confirm your email/);
    const stored = await User.findOne({ email: 'asha@example.com' });
    expect(stored.password).not.toBe('Secret123');
    expect(stored.acceptedTermsAt).toBeInstanceOf(Date);
  });

  test('can register as owner but never as admin', async () => {
    expect((await signup({ role: 'owner' })).body.user.role).toBe('owner');
    expect((await signup({ email: 'b@example.com', role: 'admin' })).body.user.role).toBe('tenant');
  });

  test.each([
    [{ fullName: '' }, /full name/],
    [{ email: 'bad' }, /valid email/],
    [{ password: 'short1' }, /at least 8/],
    [{ password: 'noNumbersHere' }, /letter and one number/],
    [{ acceptTerms: false }, /Terms of Service/],
  ])('rejects invalid input %o', async (override, msg) => {
    const res = await signup(override);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(msg);
  });

  test('duplicate email (case-insensitive) is rejected', async () => {
    await signup();
    const res = await signup({ email: 'ASHA@example.com' });
    expect(res.status).toBe(409);
  });
});

describe('login', () => {
  test('works with correct credentials and records last login', async () => {
    const { user } = await makeUser('tenant');
    const res = await api().post('/api/auth/login').send({ email: user.email.toUpperCase(), password: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(user._id.toString());
    expect((await User.findById(user._id)).lastLoginAt).toBeInstanceOf(Date);
  });

  test('same error for wrong password and unknown email', async () => {
    const { user } = await makeUser('tenant');
    const a = await api().post('/api/auth/login').send({ email: user.email, password: 'Wrong1234' });
    const b = await api().post('/api/auth/login').send({ email: 'nobody@x.com', password: 'Wrong1234' });
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    expect(a.body.message).toBe(b.body.message);
  });

  test('NoSQL injection attempt is neutralised', async () => {
    await makeUser('tenant');
    const res = await api().post('/api/auth/login').send({ email: { $gt: '' }, password: { $gt: '' } });
    expect(res.status).toBe(400);
  });

  test('suspended users cannot log in or use old tokens', async () => {
    const { user, auth } = await makeUser('tenant');
    await User.updateOne({ _id: user._id }, { suspended: true });
    expect((await api().post('/api/auth/login').send({ email: user.email, password: PASSWORD })).status).toBe(403);
    expect((await api().get('/api/auth/me').set(auth)).status).toBe(403);
  });
});

describe('profile', () => {
  test('me requires a token', async () => {
    expect((await api().get('/api/auth/me')).status).toBe(401);
    expect((await api().get('/api/auth/me').set('Authorization', 'Bearer junk')).status).toBe(401);
  });

  test('partial update keeps other fields (regression: edit page used to wipe them)', async () => {
    const { user, auth } = await makeUser('tenant', { city: 'Indore', bio: 'Hello', college: 'IIT' });
    const res = await api().put('/api/auth/profile').set(auth).send({ phone: '9999999999' });
    expect(res.status).toBe(200);
    const after = await User.findById(user._id);
    expect(after).toMatchObject({ phone: '9999999999', city: 'Indore', bio: 'Hello', college: 'IIT' });
  });

  test('cannot change role, email or verified via profile', async () => {
    const { user, auth } = await makeUser('tenant');
    await api().put('/api/auth/profile').set(auth).send({ role: 'admin', email: 'x@y.com', verified: true });
    const after = await User.findById(user._id);
    expect(after.role).toBe('tenant');
    expect(after.verified).toBe(false);
    expect(after.email).toBe(user.email);
  });

  test('validates values', async () => {
    const { auth } = await makeUser('tenant');
    expect((await api().put('/api/auth/profile').set(auth).send({ budgetMin: -5 })).status).toBe(400);
    expect((await api().put('/api/auth/profile').set(auth).send({ fullName: '' })).status).toBe(400);
    expect((await api().put('/api/auth/profile').set(auth).send({ gender: 'robot' })).status).toBe(400);
    expect((await api().put('/api/auth/profile').set(auth).send({ avatar: 'javascript:alert(1)' })).status).toBe(400);
  });
});

describe('passwords', () => {
  test('change password: needs current password, logs out old tokens, returns a new one', async () => {
    const { auth } = await makeUser('tenant');
    expect((await api().post('/api/auth/change-password').set(auth).send({ currentPassword: 'nope', newPassword: 'Newpass123' })).status).toBe(400);
    const res = await api().post('/api/auth/change-password').set(auth).send({ currentPassword: PASSWORD, newPassword: 'Newpass123' });
    expect(res.status).toBe(200);
    expect((await api().get('/api/auth/me').set(auth)).status).toBe(401);
    expect((await api().get('/api/auth/me').set('Authorization', `Bearer ${res.body.token}`)).status).toBe(200);
    expect(outbox.some((m) => /password was changed/.test(m.subject))).toBe(true);
  });

  test('forgot → reset full flow; link works once; old sessions end', async () => {
    const { user, auth } = await makeUser('tenant', { emailVerified: false });
    const res = await api().post('/api/auth/forgot-password').send({ email: user.email });
    expect(res.status).toBe(200);
    const mail = outbox.find((m) => /Reset your/.test(m.subject));
    expect(mail.actionUrl).toContain('/#/reset-password?token=');
    const token = tokenFromUrl(mail.actionUrl);

    const stored = await User.findById(user._id).select('+passwordResetTokenHash');
    expect(stored.passwordResetTokenHash).not.toBe(token); // only the hash is stored

    expect((await api().post('/api/auth/reset-password').send({ token, password: 'weak' })).status).toBe(400);
    expect((await api().post('/api/auth/reset-password').send({ token, password: 'Brandnew123' })).status).toBe(200);
    expect((await api().post('/api/auth/reset-password').send({ token, password: 'Another123' })).status).toBe(400);
    expect((await api().get('/api/auth/me').set(auth)).status).toBe(401);
    expect((await api().post('/api/auth/login').send({ email: user.email, password: 'Brandnew123' })).status).toBe(200);
    expect((await User.findById(user._id)).emailVerified).toBe(true);
  });

  test('forgot password does not reveal whether an account exists', async () => {
    const res = await api().post('/api/auth/forgot-password').send({ email: 'ghost@example.com' });
    expect(res.status).toBe(200);
    expect(outbox).toHaveLength(0);
  });

  test('expired reset links are rejected', async () => {
    const { user } = await makeUser('tenant');
    await api().post('/api/auth/forgot-password').send({ email: user.email });
    const token = tokenFromUrl(outbox[0].actionUrl);
    await User.updateOne({ _id: user._id }, { passwordResetExpires: new Date(Date.now() - 1000) });
    expect((await api().post('/api/auth/reset-password').send({ token, password: 'Brandnew123' })).status).toBe(400);
  });
});

describe('email verification', () => {
  test('verify link confirms the email', async () => {
    const res = await signup();
    const token = tokenFromUrl(outbox[0].actionUrl);
    const v = await api().post('/api/auth/verify-email').send({ token });
    expect(v.status).toBe(200);
    expect(v.body.user.emailVerified).toBe(true);
    expect((await api().post('/api/auth/verify-email').send({ token })).status).toBe(400);
    const again = await api().post('/api/auth/resend-verification').set('Authorization', `Bearer ${res.body.token}`);
    expect(again.body.message).toMatch(/already/);
  });

  test('resend sends a fresh link', async () => {
    const { auth } = await makeUser('tenant', { emailVerified: false });
    const res = await api().post('/api/auth/resend-verification').set(auth);
    expect(res.status).toBe(200);
    expect(outbox).toHaveLength(1);
  });
});

describe('become a host', () => {
  test('tenant becomes owner and receives a token with the new role', async () => {
    const { auth } = await makeUser('tenant');
    const res = await api().post('/api/auth/become-owner').set(auth);
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('owner');
    const create = await api().post('/api/properties').set('Authorization', `Bearer ${res.body.token}`).send({ title: 'My PG', city: 'Indore', price: 5000 });
    expect(create.status).toBe(201);
  });
});

describe('data export and account deletion', () => {
  test('export returns my data as a download', async () => {
    const { user, auth } = await makeUser('owner');
    await makeProperty(user);
    const res = await api().get('/api/auth/export').set(auth);
    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toMatch(/attachment/);
    expect(res.body.profile.email).toBe(user.email);
    expect(res.body.listings).toHaveLength(1);
  });

  test('delete requires the password and cleans up related data', async () => {
    const { user: owner, auth } = await makeUser('owner');
    const { user: tenant } = await makeUser('tenant');
    const prop = await makeProperty(owner);
    await Favorite.create({ userId: owner._id, propertyId: prop._id });
    await Visit.create({ propertyId: prop._id, tenantId: tenant._id, ownerId: owner._id, date: '2030-01-01', timeSlot: '10:00 AM' });

    expect((await api().delete('/api/auth/me').set(auth).send({ password: 'wrong' })).status).toBe(400);
    const res = await api().delete('/api/auth/me').set(auth).send({ password: PASSWORD });
    expect(res.status).toBe(200);

    expect(await User.findById(owner._id)).toBeNull();
    expect((await Property.findById(prop._id)).status).toBe('deleted');
    expect(await Favorite.countDocuments({ userId: owner._id })).toBe(0);
    expect((await Visit.findOne({ propertyId: prop._id })).status).toBe('cancelled');
    expect(await Notification.exists({ userId: tenant._id, type: 'visit' })).toBeTruthy();
    expect((await api().get('/api/auth/me').set(auth)).status).toBe(401);
    expect(outbox.some((m) => /has been deleted/.test(m.subject))).toBe(true);
  });

  test('the last admin cannot delete themselves', async () => {
    const { auth } = await makeUser('admin');
    const res = await api().delete('/api/auth/me').set(auth).send({ password: PASSWORD });
    expect(res.status).toBe(400);
  });
});

describe('aadhaar (simulated)', () => {
  test('disabled by default', async () => {
    const { auth } = await makeUser('tenant');
    const res = await api().post('/api/auth/verify-aadhaar').set(auth).send({ aadhaarNumber: '234567890124' });
    expect(res.status).toBe(403);
  });

  test('when enabled: validates, blocks duplicates, never grants the verified badge', async () => {
    process.env.AADHAAR_SIMULATION = 'true';
    try {
      const a = await makeUser('tenant');
      const b = await makeUser('tenant');
      expect((await api().post('/api/auth/verify-aadhaar').set(a.auth).send({ aadhaarNumber: '234567890123' })).status).toBe(400);
      const ok = await api().post('/api/auth/verify-aadhaar').set(a.auth).send({ aadhaarNumber: '234567890124' });
      expect(ok.status).toBe(200);
      expect(ok.body.user).toMatchObject({ aadhaarVerified: true, identityStatus: 'verified', verified: false });
      // Identity digits are not echoed back to clients.
      expect(ok.body.user.aadhaarLast4).toBeUndefined();
      expect((await api().post('/api/auth/verify-aadhaar').set(b.auth).send({ aadhaarNumber: '234567890124' })).status).toBe(409);
    } finally {
      delete process.env.AADHAAR_SIMULATION;
    }
  });
});
