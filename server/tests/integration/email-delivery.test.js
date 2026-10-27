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

describe('Brevo HTTPS API (for hosts that block SMTP)', () => {
  const actual = jest.requireActual('../../src/utils/mailer');
  const saved = {};
  beforeEach(() => {
    for (const k of ['NODE_ENV', 'BREVO_API_KEY', 'MAIL_FROM']) saved[k] = process.env[k];
    process.env.NODE_ENV = 'production';
    process.env.BREVO_API_KEY = 'test-key';
    process.env.MAIL_FROM = 'PG Drisya <hello@pgdrisya.com>';
  });
  afterEach(() => {
    for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
    jest.restoreAllMocks();
  });

  test('parses "Name <email>" senders', () => {
    expect(actual.parseAddress('PG Drisya <hello@pgdrisya.com>')).toEqual({ name: 'PG Drisya', email: 'hello@pgdrisya.com' });
    expect(actual.parseAddress('hello@pgdrisya.com')).toEqual({ email: 'hello@pgdrisya.com' });
  });

  test('sends through the API with the key and the verified sender', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(new Response('{"messageId":"1"}', { status: 201 }));
    await expect(actual.sendMail({ to: 'a@b.com', subject: 'Hi', text: 'Body' })).resolves.toEqual({ queued: true });
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.brevo.com/v3/smtp/email');
    expect(opts.headers['api-key']).toBe('test-key');
    const body = JSON.parse(opts.body);
    expect(body.sender).toEqual({ name: 'PG Drisya', email: 'hello@pgdrisya.com' });
    expect(body.to).toEqual([{ email: 'a@b.com' }]);
    expect(body.textContent).toBe('Body');
  });

  test('an API error is reported as send_failed, not success', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response('{"message":"sender not valid"}', { status: 400 }));
    const err = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(actual.sendMail({ to: 'a@b.com', subject: 'Hi', text: 'Body' })).resolves.toEqual({ queued: false, reason: 'send_failed' });
    expect(err.mock.calls[0].join(' ')).toMatch(/sender not valid/);
  });
});
