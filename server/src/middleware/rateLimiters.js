const rateLimit = require('express-rate-limit');
const { hashIp } = require('../utils/audit');

// Limits are disabled under NODE_ENV=test so the test suite can make many requests.
const skip = () => process.env.NODE_ENV === 'test' && process.env.RATE_LIMIT_IN_TESTS !== 'true';

// Log when a limit trips (hashed IP only) so scraping or abuse shows up in the logs.
function onLimit(name) {
  return (req, res, _next, options) => {
    if (process.env.NODE_ENV !== 'test') {
      console.warn(`[rate-limit] ${name} ${req.method} ${req.baseUrl}${req.path} ip=${hashIp(req.ip)}${req.user ? ` user=${req.user._id}` : ''}`);
    }
    res.status(options.statusCode).json(options.message);
  };
}

// Signed-in requests are counted per account (so a shared campus/office IP isn't
// punished for one heavy user); anonymous ones per IP.
const byUserOrIp = (req) => (req.user ? `u:${req.user._id}` : `ip:${rateLimit.ipKeyGenerator ? rateLimit.ipKeyGenerator(req.ip) : req.ip}`);

const make = (name, windowMs, max, message, extra = {}) =>
  rateLimit({ windowMs, max, standardHeaders: true, legacyHeaders: false, skip, message: { message }, handler: onLimit(name), ...extra });

// Login/register — slows credential stuffing & brute force.
const authLimiter = make('auth', 15 * 60 * 1000, 20, 'Too many attempts. Please try again in a few minutes.');
// Password reset / verification emails — stop email bombing.
const emailLimiter = make('email', 15 * 60 * 1000, 5, 'Too many email requests. Please try again later.');
// General writes (reviews, visits, bookings, favorites, reports).
const writeLimiter = make('write', 60 * 1000, 60, 'Too many requests. Please slow down.');
// Uploads cost money on Cloudinary.
const uploadLimiter = make('upload', 15 * 60 * 1000, 30, 'Too many uploads. Please try again later.');
// Public forms (expert request) — anonymous, so tight.
const publicFormLimiter = make('public-form', 60 * 60 * 1000, 10, 'Too many submissions. Please try again later.');

// Search is the most expensive public query and the easiest to scrape.
const searchLimiter = make('search', 60 * 1000, 60, 'Too many searches. Please wait a moment and try again.');
// Listing pages: generous for people, a ceiling for bulk extraction.
const listingDetailLimiter = make('listing-detail', 10 * 60 * 1000, 300, 'Too many listing views. Please wait a few minutes.');
// Public profiles expose host listings — same idea.
const profileLimiter = make('profile', 10 * 60 * 1000, 150, 'Too many profile views. Please wait a few minutes.');
// Chat: 30 messages a minute per account is plenty for a person, too few for spam.
const messageLimiter = make('message', 60 * 1000, 30, "You're sending messages too quickly. Please wait a moment.", { keyGenerator: byUserOrIp });
// Polling the inbox/thread every few seconds stays well under this.
const messageReadLimiter = make('message-read', 60 * 1000, 120, 'Too many requests. Please slow down.', { keyGenerator: byUserOrIp });
// Identity verification sessions cost money with most providers.
const identityLimiter = make('identity', 60 * 60 * 1000, 5, 'Too many verification attempts. Please try again in an hour.', { keyGenerator: byUserOrIp });
// Provider webhooks are signed; this only stops floods.
const webhookLimiter = make('webhook', 60 * 1000, 120, 'Too many requests.');

module.exports = {
  authLimiter, emailLimiter, writeLimiter, uploadLimiter, publicFormLimiter,
  searchLimiter, listingDetailLimiter, profileLimiter, messageLimiter, messageReadLimiter, identityLimiter, webhookLimiter,
};
