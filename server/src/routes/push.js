const express = require('express');
const PushToken = require('../models/PushToken');
const { auth } = require('../middleware/auth');
const { writeLimiter } = require('../middleware/rateLimiters');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { isExpoToken } = require('../services/push');

const router = express.Router();
const MAX_DEVICES = 10;

// POST /api/push/register { token, platform } — called by the app after sign-in.
router.post(
  '/register',
  auth,
  writeLimiter,
  asyncHandler(async (req, res) => {
    const { token, platform = 'unknown' } = req.body;
    if (!isExpoToken(token)) throw new AppError('A valid Expo push token is required', 400);
    const plat = ['ios', 'android', 'web'].includes(platform) ? platform : 'unknown';
    // The same phone can switch accounts: the token always follows the latest sign-in.
    await PushToken.updateOne({ token }, { $set: { userId: req.user._id, platform: plat } }, { upsert: true });
    // Keep only the most recent devices per account.
    const extra = await PushToken.find({ userId: req.user._id }).sort({ updatedAt: -1 }).skip(MAX_DEVICES).select('_id');
    if (extra.length) await PushToken.deleteMany({ _id: { $in: extra.map((t) => t._id) } });
    res.json({ registered: true });
  })
);

// POST /api/push/unregister { token } — called on sign-out so the device stops getting this account's alerts.
router.post(
  '/unregister',
  auth,
  asyncHandler(async (req, res) => {
    const { token } = req.body;
    if (typeof token !== 'string') throw new AppError('token is required', 400);
    await PushToken.deleteOne({ token, userId: req.user._id });
    res.json({ registered: false });
  })
);

module.exports = router;
