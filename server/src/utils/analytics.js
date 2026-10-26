const crypto = require('crypto');
const AnalyticsEvent = require('../models/AnalyticsEvent');

const EVENTS = ['search', 'listing_view', 'visit_requested', 'booking_requested', 'message_sent', 'signup'];
const PLATFORMS = ['web', 'ios', 'android'];

// Both apps send `X-Client-Platform`; anything else counts as "unknown".
function platformOf(req) {
  const p = String(req.headers['x-client-platform'] || '').toLowerCase();
  return PLATFORMS.includes(p) ? p : 'unknown';
}

function actorOf(userId) {
  if (!userId) return '';
  const key = process.env.ANALYTICS_SALT || process.env.JWT_SECRET || 'analytics';
  return crypto.createHmac('sha256', key).update(String(userId)).digest('hex').slice(0, 20);
}

// Fire-and-forget: analytics must never slow down or break a request.
function track(req, name, props = {}, userId) {
  if (!EVENTS.includes(name)) return;
  AnalyticsEvent.create({ name, platform: platformOf(req), actor: actorOf(userId ?? req.user?._id), props }).catch((err) => {
    if (process.env.NODE_ENV !== 'test') console.warn('[analytics] write failed:', err.message);
  });
}

module.exports = { track, platformOf, actorOf, EVENTS };
