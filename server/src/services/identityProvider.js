// Identity-verification provider adapter.
//
// Drisya never collects Aadhaar numbers, OTPs or biometrics itself. Verification is
// done on an authorised provider's own pages (e.g. DigiLocker through a licensed
// partner, or a licensed KYC provider). We create a session server-side, send the
// user to the provider's consent page, and the provider tells us the outcome through
// a signed webhook. Only that webhook (or an admin's manual review) can mark a user
// verified.
//
// Configuration (server env only — never in the web or mobile bundles):
//   IDV_PROVIDER         "http" for a real provider; "mock" for development/tests only
//   IDV_API_BASE_URL     provider API base, e.g. https://api.provider.example/v1
//   IDV_API_KEY          provider API key (secret)
//   IDV_WEBHOOK_SECRET   shared secret used to sign webhooks (secret)
//   IDV_RETURN_URL       where the provider sends the user afterwards (defaults to APP_URL)
//
// The "http" adapter speaks a small generic contract (below). Most providers differ in
// field names; adjust createSession()/parseWebhook() to the provider you sign with.
const crypto = require('crypto');
const { appUrl } = require('../config/env');

const MAX_WEBHOOK_AGE_MS = 5 * 60 * 1000;
const FINAL_STATUSES = ['verified', 'rejected', 'failed', 'cancelled', 'expired'];

function returnUrl() {
  return (process.env.IDV_RETURN_URL || `${appUrl()}/#/profile/edit?tab=identity`).replace(/\s/g, '');
}

function signPayload(secret, timestamp, rawBody) {
  return crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
}

// Header format: x-idv-timestamp: <unix ms>, x-idv-signature: sha256=<hex>
function verifySignature(secret, headers, rawBody) {
  if (!secret || !rawBody) return false;
  const ts = Number(headers['x-idv-timestamp']);
  const sig = String(headers['x-idv-signature'] || '').replace(/^sha256=/, '');
  if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > MAX_WEBHOOK_AGE_MS) return false; // replay protection
  if (!/^[a-f0-9]{64}$/.test(sig)) return false;
  const expected = signPayload(secret, ts, rawBody.toString('utf8'));
  return crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'));
}

// Keep only the fields we act on; anything else the provider sends (names, DOB,
// partial numbers…) is dropped here and never stored or logged.
function parseWebhook(body) {
  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId.slice(0, 200) : '';
  const status = FINAL_STATUSES.includes(body?.status) ? body.status : '';
  const reason = typeof body?.reason === 'string' ? body.reason.replace(/[^a-z0-9_-]/gi, '').slice(0, 60) : '';
  return { sessionId, status, reason };
}

function httpProvider({ baseUrl, apiKey, webhookSecret }) {
  return {
    name: 'http',
    async createSession({ reference }) {
      const res = await fetch(`${baseUrl.replace(/\/$/, '')}/sessions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference, purpose: 'identity_verification', document: 'aadhaar', redirectUrl: returnUrl() }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) throw new Error(`provider responded ${res.status}`);
      const data = await res.json();
      if (typeof data?.id !== 'string' || typeof data?.url !== 'string' || !/^https:\/\//.test(data.url)) {
        throw new Error('provider returned an unexpected response');
      }
      return { sessionId: data.id, redirectUrl: data.url };
    },
    verifyWebhook: (headers, rawBody) => verifySignature(webhookSecret, headers, rawBody),
    parseWebhook,
  };
}

// Development / test stand-in. It still requires a signed webhook to finish, so the
// full flow can be exercised end to end. Refuses to load in production.
function mockProvider({ webhookSecret }) {
  return {
    name: 'mock',
    async createSession({ reference }) {
      const sessionId = `mock_${reference}_${crypto.randomBytes(6).toString('hex')}`;
      return { sessionId, redirectUrl: `https://idv.mock.invalid/session/${sessionId}` };
    },
    verifyWebhook: (headers, rawBody) => verifySignature(webhookSecret, headers, rawBody),
    parseWebhook,
  };
}

// Returns the configured provider, or null when verification is unavailable.
function getProvider(env = process.env) {
  const kind = (env.IDV_PROVIDER || '').trim();
  const webhookSecret = env.IDV_WEBHOOK_SECRET || '';
  if (!kind || !webhookSecret) return null;
  if (kind === 'mock') return env.NODE_ENV === 'production' ? null : mockProvider({ webhookSecret });
  if (kind === 'http') {
    if (!env.IDV_API_BASE_URL || !env.IDV_API_KEY || !/^https:\/\//.test(env.IDV_API_BASE_URL)) return null;
    return httpProvider({ baseUrl: env.IDV_API_BASE_URL, apiKey: env.IDV_API_KEY, webhookSecret });
  }
  return null;
}

module.exports = { getProvider, verifySignature, signPayload, parseWebhook, FINAL_STATUSES };
