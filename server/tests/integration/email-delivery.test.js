// "Resend confirmation email" must not claim success when nothing was sent.
jest.mock('../../src/utils/mailer', () => {
  const actual = jest.requireActual('../../src/utils/mailer');
  return { ...actual, sendMail: jest.fn(async () => ({ queued: true })) };
});

const { api, connect, clearDb, disconnect, makeUser } = require('../helpers');
const mailer = require('../../src/utils/mailer');

beforeAll(() => connect('email_delivery'));
beforeEach(clearDb);
afterAll(disconnect);

test('resend reports success only when the email was handed to the mail server', async () => {
  const { auth, user } = await makeUser('tenant', { emailVerified: false });

  mailer.sendMail.mockResolvedValueOnce({ queued: true });
  const ok = await api().post('/api/auth/resend-verification').set(auth);
  expect(ok.status).toBe(200);
  expect(ok.body.message).toContain(user.email);

  mailer.sendMail.mockResolvedValueOnce({ queued: false, reason: 'not_configured' });
  const off = await api().post('/api/auth/resend-verification').set(auth);
  expect(off.status).toBe(503);
  expect(off.body.message).toMatch(/isn't set up/);

  mailer.sendMail.mockResolvedValueOnce({ queued: false, reason: 'send_failed' });
  const failed = await api().post('/api/auth/resend-verification').set(auth);
  expect(failed.status).toBe(503);
  expect(failed.body.message).toMatch(/couldn't send/);
});

test('sendMail says why nothing was sent in production without SMTP', async () => {
  const { sendMail } = jest.requireActual('../../src/utils/mailer');
  const prev = { env: process.env.NODE_ENV, host: process.env.SMTP_HOST };
  process.env.NODE_ENV = 'production';
  delete process.env.SMTP_HOST;
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  try {
    await expect(sendMail({ to: 'a@b.com', subject: 's', text: 't' })).resolves.toEqual({ queued: false, reason: 'not_configured' });
  } finally {
    warn.mockRestore();
    process.env.NODE_ENV = prev.env;
    if (prev.host !== undefined) process.env.SMTP_HOST = prev.host;
  }
});
