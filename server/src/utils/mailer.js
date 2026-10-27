// Email sending, in this order of preference:
// - BREVO_API_KEY: Brevo's HTTPS API. Works on hosts that block outgoing SMTP
//   (Render's free plan blocks ports 25/465/587, so SMTP just times out there).
// - SMTP_HOST: any SMTP provider (Gmail app password, Brevo, SendGrid, SES, Zoho...).
// - In tests, messages are captured in `outbox` instead of being sent.
// - Without SMTP in development, emails are printed to the console so links still work.
const nodemailer = require('nodemailer');

const outbox = [];
let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.SMTP_HOST) return null;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  return transporter;
}

const BREVO_URL = 'https://api.brevo.com/v3';

// "PG Drisya <hello@x.com>" → { name: 'PG Drisya', email: 'hello@x.com' }
function parseAddress(from) {
  const m = /^\s*(?:"?([^"<]*?)"?\s*)?<([^>]+)>\s*$/.exec(from);
  return m ? { name: m[1] || undefined, email: m[2].trim() } : { email: from.trim() };
}

async function brevoRequest(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${BREVO_URL}${path}`, {
    method,
    headers: { 'api-key': process.env.BREVO_API_KEY, accept: 'application/json', 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(`Brevo ${res.status}: ${detail.message || res.statusText}`);
  }
  return res;
}

function sendViaBrevo(msg) {
  return brevoRequest('/smtp/email', {
    method: 'POST',
    body: { sender: parseAddress(msg.from), to: [{ email: msg.to }], subject: msg.subject, textContent: msg.text, htmlContent: msg.html },
  });
}

// A timeout means the mail server couldn't be reached at all, which is not a password problem.
function explainSmtpError(err) {
  if (/timeout|ETIMEDOUT|ECONNREFUSED|ENETUNREACH/i.test(`${err.code} ${err.message}`)) {
    return `could not connect to ${process.env.SMTP_HOST} (${err.message}). This host may block outgoing SMTP (Render's free plan does); set BREVO_API_KEY to send over HTTPS instead.`;
  }
  return `${err.message}. Check SMTP_USER / SMTP_PASS (Gmail needs an app password).`;
}

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Best-effort: never throws, so a mail outage can't break a request. Returns
// { queued: true } or { queued: false, reason: 'not_configured' | 'send_failed' } so
// callers can tell people the truth instead of "email sent".
async function sendMail({ to, subject, text, actionUrl, actionLabel }) {
  const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#1f2937">
    <h2 style="color:#102A43">PG Drisya</h2>
    <p style="white-space:pre-line">${escapeHtml(text)}</p>
    ${actionUrl ? `<p><a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:#14B8A6;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">${escapeHtml(actionLabel || 'Open')}</a></p><p style="font-size:12px;color:#6b7280">Or paste this link into your browser: ${escapeHtml(actionUrl)}</p>` : ''}
    <p style="font-size:12px;color:#6b7280">You received this because of activity on your PG Drisya account.</p>
  </div>`;
  const fullText = actionUrl ? `${text}\n\n${actionLabel || 'Link'}: ${actionUrl}` : text;
  const msg = { from: process.env.MAIL_FROM || 'PG Drisya <no-reply@pgdrisya.local>', to, subject, text: fullText, html };

  if (process.env.NODE_ENV === 'test') {
    outbox.push({ ...msg, actionUrl });
    return { queued: true };
  }
  if (process.env.BREVO_API_KEY) {
    try {
      await sendViaBrevo(msg);
      return { queued: true };
    } catch (err) {
      console.error('[mail] send failed:', err.message);
      return { queued: false, reason: 'send_failed' };
    }
  }
  const t = getTransporter();
  if (!t) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`\n[mail:dev] To: ${to}\nSubject: ${subject}\n${fullText}\n`);
      return { queued: false, reason: 'not_configured', printed: true };
    }
    console.warn(`[mail] SMTP not configured; dropped email "${subject}" to ${to}`);
    return { queued: false, reason: 'not_configured' };
  }
  try {
    await t.sendMail(msg);
    return { queued: true };
  } catch (err) {
    console.error('[mail] send failed:', explainSmtpError(err));
    return { queued: false, reason: 'send_failed' };
  }
}

// Checks the mail setup once at startup so a wrong key or password (e.g. a normal Gmail
// password instead of an app password) shows up in the logs right away.
async function verifyMailer() {
  if (process.env.BREVO_API_KEY) {
    try {
      await brevoRequest('/account');
      console.log(`[mail] Brevo API ready (sending as ${parseAddress(process.env.MAIL_FROM || '').email || 'MAIL_FROM not set!'})`);
      return true;
    } catch (err) {
      console.error(`[mail] Brevo API check failed: ${err.message}. Check BREVO_API_KEY.`);
      return false;
    }
  }
  const t = getTransporter();
  if (!t) {
    console.warn('[mail] Neither BREVO_API_KEY nor SMTP_HOST is set: confirmation and password-reset emails will NOT be sent.');
    return false;
  }
  try {
    await t.verify();
    console.log(`[mail] SMTP ready (${process.env.SMTP_HOST})`);
    return true;
  } catch (err) {
    console.error(`[mail] SMTP check failed: ${explainSmtpError(err)}`);
    return false;
  }
}

module.exports = { sendMail, verifyMailer, outbox, parseAddress };
