const rateLimit = require('express-rate-limit');

// Limits are disabled under NODE_ENV=test so the test suite can make many requests.
const skip = () => process.env.NODE_ENV === 'test' && process.env.RATE_LIMIT_IN_TESTS !== 'true';

const make = (windowMs, max, message) =>
  rateLimit({ windowMs, max, standardHeaders: true, legacyHeaders: false, skip, message: { message } });

// Login/register — slows credential stuffing & brute force.
const authLimiter = make(15 * 60 * 1000, 20, 'Too many attempts. Please try again in a few minutes.');
// Password reset / verification emails — stop email bombing.
const emailLimiter = make(15 * 60 * 1000, 5, 'Too many email requests. Please try again later.');
// General writes (messages, reviews, visits, bookings, favorites, reports).
const writeLimiter = make(60 * 1000, 60, 'Too many requests. Please slow down.');
// Uploads cost money on Cloudinary.
const uploadLimiter = make(15 * 60 * 1000, 30, 'Too many uploads. Please try again later.');
// Public forms (expert request) — anonymous, so tight.
const publicFormLimiter = make(60 * 60 * 1000, 10, 'Too many submissions. Please try again later.');

module.exports = { authLimiter, emailLimiter, writeLimiter, uploadLimiter, publicFormLimiter };
