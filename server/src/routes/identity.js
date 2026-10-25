// Identity (Aadhaar) verification. Separate from email confirmation and from the
// admin "Verified" badge on listings. See services/identityProvider.js.
const express = require('express');
const User = require('../models/User');
const IdentityVerification = require('../models/IdentityVerification');
const { auth, requireRole } = require('../middleware/auth');
const { identityLimiter, webhookLimiter } = require('../middleware/rateLimiters');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { isObjectId } = require('../utils/validators');
const { notify } = require('../utils/notify');
const { audit } = require('../utils/audit');
const { getProvider } = require('../services/identityProvider');

const router = express.Router();
const SESSION_REUSE_MS = 30 * 60 * 1000;

// What the owner of the account sees. No provider payloads, no identity data.
function attemptView(a) {
  if (!a) return null;
  return { id: a._id, status: a.status, provider: a.provider, reason: a.reason, createdAt: a.createdAt, updatedAt: a.updatedAt, completedAt: a.completedAt || null };
}

async function statusFor(user) {
  const latest = await IdentityVerification.findOne({ userId: user._id }).sort({ createdAt: -1 });
  return {
    status: user.identityStatus || 'unverified',
    verifiedAt: user.identityVerifiedAt || null,
    available: !!getProvider(),
    latestAttempt: attemptView(latest),
  };
}

// Apply a final outcome to the attempt and the user. The only places that call this
// are the signed provider webhook and an admin review.
async function applyOutcome(attempt, outcome, reason, reviewedBy = null) {
  attempt.status = outcome;
  attempt.reason = reason || '';
  attempt.completedAt = new Date();
  if (reviewedBy) attempt.reviewedBy = reviewedBy;
  await attempt.save();

  const user = await User.findById(attempt.userId);
  if (!user) return null;
  if (outcome === 'verified') {
    user.identityStatus = 'verified';
    user.identityVerifiedAt = new Date();
    user.identityProvider = attempt.provider;
  } else if (outcome === 'rejected') {
    user.identityStatus = 'rejected';
    user.identityVerifiedAt = undefined;
  } else if (outcome === 'revoked') {
    user.identityStatus = 'unverified';
    user.identityVerifiedAt = undefined;
  } else if (user.identityStatus === 'pending') {
    // failed / cancelled / expired: back to where they were, never downgrade a verified user.
    user.identityStatus = 'unverified';
  }
  await user.save();

  const messages = {
    verified: ['Identity verified', 'Your identity has been verified. A verified badge now shows on your profile.'],
    rejected: ['Identity verification unsuccessful', 'We could not verify your identity. You can try again from Account settings.'],
    failed: ['Identity verification failed', 'Something went wrong with the verification provider. Please try again.'],
    expired: ['Identity verification expired', 'Your verification session expired. Please start again.'],
    revoked: ['Identity verification removed', 'Your identity verification was removed by our team. Contact support if you think this is a mistake.'],
  };
  if (messages[outcome]) await notify(user._id, messages[outcome][0], messages[outcome][1], 'account', { identityStatus: user.identityStatus });
  return user;
}

// GET /api/identity/status
router.get(
  '/status',
  auth,
  asyncHandler(async (req, res) => {
    res.json(await statusFor(req.user));
  })
);

// POST /api/identity/start — create a provider session and return its consent URL.
router.post(
  '/start',
  auth,
  identityLimiter,
  asyncHandler(async (req, res) => {
    const provider = getProvider();
    if (!provider) {
      return res.status(503).json({ code: 'IDV_UNAVAILABLE', message: 'Online ID verification is not available yet.' });
    }
    if (req.user.identityStatus === 'verified') throw new AppError('Your identity is already verified', 409);

    // Re-use a fresh pending session instead of paying for a new one on every tap.
    const recent = await IdentityVerification.findOne({ userId: req.user._id, provider: provider.name, status: 'pending' }).sort({ createdAt: -1 });
    if (recent && Date.now() - recent.createdAt.getTime() < SESSION_REUSE_MS && recent.redirectUrl) {
      return res.json({ status: 'pending', redirectUrl: recent.redirectUrl, attempt: attemptView(recent) });
    }
    if (recent) await applyOutcome(recent, 'expired', 'superseded');

    const attempt = await IdentityVerification.create({ userId: req.user._id, provider: provider.name });
    try {
      const { sessionId, redirectUrl } = await provider.createSession({ reference: attempt._id.toString() });
      attempt.providerRef = sessionId;
      attempt.redirectUrl = redirectUrl;
      await attempt.save();
    } catch (err) {
      attempt.status = 'failed';
      attempt.reason = 'provider_error';
      attempt.completedAt = new Date();
      await attempt.save();
      if (process.env.NODE_ENV !== 'test') console.error('[identity] provider session failed:', err.message);
      await audit(req, 'identity.start_failed', { targetType: 'user', targetId: req.user._id, meta: { provider: provider.name } });
      throw new AppError('The verification service is not responding. Please try again in a few minutes.', 502);
    }

    await User.updateOne({ _id: req.user._id }, { identityStatus: 'pending' });
    await audit(req, 'identity.started', { targetType: 'user', targetId: req.user._id, meta: { provider: provider.name, attemptId: attempt._id.toString() } });
    res.status(201).json({ status: 'pending', redirectUrl: attempt.redirectUrl, attempt: attemptView(attempt) });
  })
);

// POST /api/identity/cancel — the user backs out of a pending attempt.
router.post(
  '/cancel',
  auth,
  asyncHandler(async (req, res) => {
    const attempt = await IdentityVerification.findOne({ userId: req.user._id, status: 'pending' }).sort({ createdAt: -1 });
    if (!attempt) throw new AppError('There is no verification in progress', 404);
    await applyOutcome(attempt, 'cancelled', 'user_cancelled');
    await audit(req, 'identity.cancelled', { targetType: 'user', targetId: req.user._id, meta: { attemptId: attempt._id.toString() } });
    res.json(await statusFor(await User.findById(req.user._id)));
  })
);

// POST /api/identity/webhook — outcome from the provider. Signed + timestamped; the
// raw body is captured in app.js for signature checking.
router.post(
  '/webhook',
  webhookLimiter,
  asyncHandler(async (req, res) => {
    const provider = getProvider();
    if (!provider) return res.status(503).json({ message: 'Not configured' });
    if (!provider.verifyWebhook(req.headers, req.rawBody)) {
      await audit(req, 'identity.webhook_rejected', { actorId: null, meta: { reason: 'bad_signature' } });
      return res.status(401).json({ message: 'Invalid signature' });
    }
    const { sessionId, status, reason } = provider.parseWebhook(req.body);
    if (!sessionId || !status) throw new AppError('sessionId and a final status are required', 400);

    const attempt = await IdentityVerification.findOne({ provider: provider.name, providerRef: sessionId });
    if (!attempt) return res.status(404).json({ message: 'Unknown session' });
    // Providers retry webhooks; a repeat of a finished attempt is acknowledged, not re-applied.
    if (attempt.status !== 'pending') return res.json({ ok: true, duplicate: true });

    await applyOutcome(attempt, status, reason);
    await audit(req, `identity.${status}`, { actorId: null, targetType: 'user', targetId: attempt.userId, meta: { provider: provider.name, attemptId: attempt._id.toString(), reason } });
    res.json({ ok: true });
  })
);

// ── Admin manual review (e.g. documents checked in person). Admins cannot review themselves.
router.get(
  '/admin/:userId',
  auth,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    if (!isObjectId(req.params.userId)) throw new AppError('Invalid user ID', 400);
    const user = await User.findById(req.params.userId);
    if (!user) throw new AppError('User not found', 404);
    const attempts = await IdentityVerification.find({ userId: user._id }).sort({ createdAt: -1 }).limit(20);
    res.json({ status: user.identityStatus || 'unverified', verifiedAt: user.identityVerifiedAt || null, attempts: attempts.map(attemptView) });
  })
);

router.post(
  '/admin/:userId/review',
  auth,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    if (!isObjectId(req.params.userId)) throw new AppError('Invalid user ID', 400);
    if (req.params.userId === req.user._id.toString()) throw new AppError('You cannot review your own identity', 403);
    const { decision, reason = '' } = req.body;
    if (!['verified', 'rejected', 'revoked'].includes(decision)) throw new AppError('decision must be verified, rejected or revoked', 400);
    if (typeof reason !== 'string' || reason.length > 200) throw new AppError('reason must be at most 200 characters', 400);
    const user = await User.findById(req.params.userId);
    if (!user) throw new AppError('User not found', 404);
    if (decision === 'revoked' && user.identityStatus !== 'verified') throw new AppError('This user is not verified', 400);

    // Close any open provider attempt so a late webhook can't overrule the review.
    await IdentityVerification.updateMany({ userId: user._id, status: 'pending' }, { status: 'cancelled', reason: 'admin_review', completedAt: new Date() });
    const attempt = await IdentityVerification.create({ userId: user._id, provider: 'manual', status: 'pending' });
    const updated = await applyOutcome(attempt, decision, reason.trim(), req.user._id);
    await audit(req, `identity.admin_${decision}`, { targetType: 'user', targetId: user._id, meta: { attemptId: attempt._id.toString() } });
    res.json({ status: updated.identityStatus, verifiedAt: updated.identityVerifiedAt || null });
  })
);

module.exports = router;
