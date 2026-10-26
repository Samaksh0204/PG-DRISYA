const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Property = require('../models/Property');
const Visit = require('../models/Visit');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const Favorite = require('../models/Favorite');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const { auth } = require('../middleware/auth');
const { authLimiter, emailLimiter } = require('../middleware/rateLimiters');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { isEmail, isNonEmptyString, passwordProblem } = require('../utils/validators');
const { createOneTimeToken, hashToken, signAuthToken } = require('../utils/tokens');
const { sendMail } = require('../utils/mailer');
const { isPlausibleAadhaar, hashAadhaar } = require('../utils/aadhaar');
const { flags, appUrl } = require('../config/env');
const { deleteAccount } = require('../services/accountDeletion');

const { audit } = require('../utils/audit');

const { track } = require('../utils/analytics');

const router = express.Router();
const BCRYPT_ROUNDS = process.env.NODE_ENV === 'test' ? 4 : 10;
const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour
const VERIFY_TTL_MS = 48 * 60 * 60 * 1000; // 48 hours

async function sendVerificationEmail(user) {
  const { token, hash } = createOneTimeToken();
  await User.updateOne(
    { _id: user._id },
    { emailVerifyTokenHash: hash, emailVerifyExpires: new Date(Date.now() + VERIFY_TTL_MS) }
  );
  await sendMail({
    to: user.email,
    subject: 'Confirm your email for PG Drisya',
    text: `Hi ${user.fullName},\n\nPlease confirm your email address so owners and tenants know they can reach you.`,
    actionUrl: `${appUrl()}/#/verify-email?token=${token}`,
    actionLabel: 'Confirm email',
  });
}

// POST /api/auth/register
router.post(
  '/register',
  authLimiter,
  asyncHandler(async (req, res) => {
    const { fullName, email, password, phone, role, city, gender, acceptTerms } = req.body;
    if (!isNonEmptyString(fullName, 100)) throw new AppError('Please enter your full name', 400);
    if (!isEmail(email)) throw new AppError('Please provide a valid email address', 400);
    const pwProblem = passwordProblem(password);
    if (pwProblem) throw new AppError(pwProblem, 400);
    if (acceptTerms !== true) throw new AppError('You must accept the Terms of Service and Privacy Policy', 400);
    if (phone !== undefined && (typeof phone !== 'string' || phone.length > 20)) throw new AppError('Invalid phone number', 400);

    const normalizedEmail = email.trim().toLowerCase();
    const exists = await User.exists({ email: normalizedEmail });
    if (exists) throw new AppError('An account with this email already exists', 409);

    const user = await User.create({
      fullName: fullName.trim(),
      email: normalizedEmail,
      password: await bcrypt.hash(password, BCRYPT_ROUNDS),
      phone: typeof phone === 'string' ? phone.trim() : '',
      role: role === 'owner' ? 'owner' : 'tenant',
      city: typeof city === 'string' ? city.trim().slice(0, 80) : '',
      gender: ['male', 'female', 'other'].includes(gender) ? gender : '',
      acceptedTermsAt: new Date(),
      lastLoginAt: new Date(),
    });

    await sendVerificationEmail(user);
    track(req, 'signup', { role: user.role }, user._id);
    res.status(201).json({ token: signAuthToken(user), user: user.toProfile() });
  })
);

// POST /api/auth/login
router.post(
  '/login',
  authLimiter,
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
      throw new AppError('Email and password are required', 400);
    }
    // Same message for unknown email and wrong password (no account enumeration).
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new AppError('Invalid email or password', 401);
    }
    if (user.suspended) throw new AppError('This account has been suspended. Contact support.', 403);
    user.lastLoginAt = new Date();
    await user.save();
    res.json({ token: signAuthToken(user), user: user.toProfile() });
  })
);

// GET /api/auth/me
router.get('/me', auth, (req, res) => res.json({ user: req.user.toProfile() }));

// PUT /api/auth/profile
router.put(
  '/profile',
  auth,
  asyncHandler(async (req, res) => {
    const allowed = ['fullName', 'phone', 'city', 'gender', 'bio', 'college', 'budgetMin', 'budgetMax', 'preferredLocality', 'avatar'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] === undefined) continue;
      const val = req.body[key];
      if (['budgetMin', 'budgetMax'].includes(key)) {
        const n = Number(val);
        if (!Number.isFinite(n) || n < 0) throw new AppError(`${key} must be a positive number`, 400);
        updates[key] = n;
      } else {
        if (typeof val !== 'string') throw new AppError(`${key} must be text`, 400);
        updates[key] = val.trim();
      }
    }
    if (updates.fullName === '') throw new AppError('Name cannot be empty', 400);
    if (updates.avatar && !/^https:\/\//.test(updates.avatar)) throw new AppError('Avatar must be an https URL', 400);
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    res.json({ user: user.toProfile() });
  })
);

// POST /api/auth/change-password
router.post(
  '/change-password',
  auth,
  authLimiter,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
    if (typeof currentPassword !== 'string' || !(await bcrypt.compare(currentPassword, user.password))) {
      throw new AppError('Current password is incorrect', 400);
    }
    const problem = passwordProblem(newPassword);
    if (problem) throw new AppError(problem, 400);
    if (currentPassword === newPassword) throw new AppError('New password must be different', 400);
    user.password = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    user.tokenVersion = (user.tokenVersion || 0) + 1; // logs out other devices
    await user.save();
    await sendMail({
      to: user.email,
      subject: 'Your PG Drisya password was changed',
      text: `Hi ${user.fullName},\n\nYour password was just changed. If this wasn't you, reset your password immediately and contact support.`,
    });
    await audit(req, 'auth.password_changed', { targetType: 'user', targetId: user._id });
    res.json({ message: 'Password updated', token: signAuthToken(user) });
  })
);

// POST /api/auth/forgot-password — always answers the same way (no account enumeration).
router.post(
  '/forgot-password',
  emailLimiter,
  asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!isEmail(email)) throw new AppError('Please provide a valid email address', 400);
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (user && !user.suspended) {
      const { token, hash } = createOneTimeToken();
      user.passwordResetTokenHash = hash;
      user.passwordResetExpires = new Date(Date.now() + RESET_TTL_MS);
      await user.save();
      await sendMail({
        to: user.email,
        subject: 'Reset your PG Drisya password',
        text: `Hi ${user.fullName},\n\nWe received a request to reset your password. This link expires in 1 hour. If you didn't ask for this, you can ignore this email.`,
        actionUrl: `${appUrl()}/#/reset-password?token=${token}`,
        actionLabel: 'Reset password',
      });
    }
    res.json({ message: 'If an account exists for that email, a reset link has been sent.' });
  })
);

// POST /api/auth/reset-password
router.post(
  '/reset-password',
  authLimiter,
  asyncHandler(async (req, res) => {
    const { token, password } = req.body;
    if (typeof token !== 'string' || token.length < 20) throw new AppError('Invalid or expired reset link', 400);
    const problem = passwordProblem(password);
    if (problem) throw new AppError(problem, 400);
    const user = await User.findOne({
      passwordResetTokenHash: hashToken(token),
      passwordResetExpires: { $gt: new Date() },
    }).select('+passwordResetTokenHash +passwordResetExpires');
    if (!user) throw new AppError('Invalid or expired reset link', 400);
    user.password = await bcrypt.hash(password, BCRYPT_ROUNDS);
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpires = undefined;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    // Clicking a link sent to the inbox proves ownership of the email.
    user.emailVerified = true;
    await user.save();
    await audit(req, 'auth.password_reset', { actorId: user._id, targetType: 'user', targetId: user._id });
    res.json({ message: 'Password has been reset. You can now log in.' });
  })
);

// POST /api/auth/verify-email
router.post(
  '/verify-email',
  asyncHandler(async (req, res) => {
    const { token } = req.body;
    if (typeof token !== 'string' || token.length < 20) throw new AppError('Invalid or expired verification link', 400);
    const user = await User.findOne({
      emailVerifyTokenHash: hashToken(token),
      emailVerifyExpires: { $gt: new Date() },
    });
    if (!user) throw new AppError('Invalid or expired verification link', 400);
    user.emailVerified = true;
    user.emailVerifyTokenHash = undefined;
    user.emailVerifyExpires = undefined;
    await user.save();
    res.json({ message: 'Email confirmed', user: user.toProfile() });
  })
);

// POST /api/auth/resend-verification
router.post(
  '/resend-verification',
  auth,
  emailLimiter,
  asyncHandler(async (req, res) => {
    if (req.user.emailVerified) return res.json({ message: 'Email already confirmed' });
    await sendVerificationEmail(req.user);
    res.json({ message: 'Verification email sent' });
  })
);

// POST /api/auth/become-owner — "Become a host": a tenant account starts listing.
router.post(
  '/become-owner',
  auth,
  asyncHandler(async (req, res) => {
    if (req.user.role === 'admin') throw new AppError('Admins cannot switch roles', 400);
    if (req.user.role !== 'owner') {
      req.user.role = 'owner';
      await req.user.save();
    }
    res.json({ token: signAuthToken(req.user), user: req.user.toProfile() });
  })
);

// GET /api/auth/export — download all personal data (DPDP Act right to access).
router.get(
  '/export',
  auth,
  asyncHandler(async (req, res) => {
    const uid = req.user._id;
    const [listings, visits, bookings, reviews, favorites, messages, notifications] = await Promise.all([
      Property.find({ ownerId: uid }).lean(),
      Visit.find({ $or: [{ tenantId: uid }, { ownerId: uid }] }).lean(),
      Booking.find({ $or: [{ tenantId: uid }, { ownerId: uid }] }).lean(),
      Review.find({ userId: uid }).lean(),
      Favorite.find({ userId: uid }).lean(),
      Message.find({ $or: [{ senderId: uid }, { receiverId: uid }] }).lean(),
      Notification.find({ userId: uid }).lean(),
    ]);
    res.setHeader('Content-Disposition', 'attachment; filename="pgdrisya-my-data.json"');
    res.json({
      exportedAt: new Date().toISOString(),
      profile: req.user.toProfile(),
      listings,
      visits,
      bookings,
      reviews,
      favorites,
      messages,
      notifications,
    });
  })
);

// DELETE /api/auth/me — permanently delete the account (password required).
router.delete(
  '/me',
  auth,
  authLimiter,
  asyncHandler(async (req, res) => {
    const { password } = req.body || {};
    const user = await User.findById(req.user._id);
    if (typeof password !== 'string' || !(await bcrypt.compare(password, user.password))) {
      throw new AppError('Password is incorrect', 400);
    }
    if (user.role === 'admin' && (await User.countDocuments({ role: 'admin' })) <= 1) {
      throw new AppError('You are the only admin. Make someone else an admin first.', 400);
    }
    const email = user.email;
    const name = user.fullName;
    await audit(req, 'auth.account_deleted', { targetType: 'user', targetId: user._id });
    await deleteAccount(user._id);
    await sendMail({
      to: email,
      subject: 'Your PG Drisya account has been deleted',
      text: `Hi ${name},\n\nYour account and personal data have been deleted. We're sorry to see you go.`,
    });
    res.json({ message: 'Account deleted' });
  })
);

// POST /api/auth/verify-aadhaar
// SIMULATED and OFF by default. Collecting Aadhaar numbers needs UIDAI authorisation
// (AUA/KUA) or DigiLocker/licensed-KYC integration — enable only for demos.
// It never grants the "verified" badge; only an admin can do that.
router.post(
  '/verify-aadhaar',
  auth,
  asyncHandler(async (req, res) => {
    if (!flags.aadhaarSimulation()) {
      throw new AppError('ID verification is not available yet. Our team verifies hosts manually for now.', 403);
    }
    const { aadhaarNumber } = req.body;
    if (typeof aadhaarNumber !== 'string' || !/^\d{12}$/.test(aadhaarNumber)) {
      throw new AppError('Valid 12-digit Aadhaar number is required', 400);
    }
    if (!isPlausibleAadhaar(aadhaarNumber)) throw new AppError('This is not a valid Aadhaar number', 400);

    const aadhaarHash = hashAadhaar(aadhaarNumber);
    const duplicate = await User.exists({ aadhaarHash, _id: { $ne: req.user._id } });
    if (duplicate) throw new AppError('This Aadhaar number is already linked to another account', 409);

    const user = await User.findByIdAndUpdate(
      req.user._id,
      // Development-only demo; flags.aadhaarSimulation() is always false in production.
      { aadhaarHash, aadhaarLast4: aadhaarNumber.slice(-4), aadhaarVerified: true, aadhaarVerificationMode: 'simulated', identityStatus: 'verified', identityVerifiedAt: new Date(), identityProvider: 'simulation' },
      { new: true }
    );
    res.json({ verified: true, simulated: true, user: user.toProfile() });
  })
);

module.exports = router;
