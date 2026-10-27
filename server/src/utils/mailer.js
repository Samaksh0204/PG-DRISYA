// Email sending. Uses SMTP when SMTP_HOST is configured (any provider: Gmail
// app password, Brevo, SendGrid SMTP, Amazon SES SMTP, Zoho...).
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
    console.error('[mail] send failed:', err.message);
    return { queued: false, reason: 'send_failed' };
  }
}

// Checks the SMTP login once at startup so a wrong password (e.g. a normal Gmail
// password instead of an app password) shows up in the logs right away.
async function verifyMailer() {
  const t = getTransporter();
  if (!t) {
    console.warn('[mail] SMTP_HOST is not set: confirmation and password-reset emails will NOT be sent.');
    return false;
  }
  try {
    await t.verify();
    console.log(`[mail] SMTP ready (${process.env.SMTP_HOST})`);
    return true;
  } catch (err) {
    console.error(`[mail] SMTP login failed (${process.env.SMTP_HOST}): ${err.message}. Check SMTP_USER / SMTP_PASS (Gmail needs an app password).`);
    return false;
  }
}

module.exports = { sendMail, verifyMailer, outbox };
