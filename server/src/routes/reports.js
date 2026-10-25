const express = require('express');
const Report = require('../models/Report');
const Property = require('../models/Property');
const User = require('../models/User');
const Review = require('../models/Review');
const Message = require('../models/Message');
const { auth } = require('../middleware/auth');
const { writeLimiter } = require('../middleware/rateLimiters');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { notify } = require('../utils/notify');
const { isObjectId } = require('../utils/validators');

const router = express.Router();
const { REPORT_REASONS, REPORT_TARGETS } = Report;
const TARGET_MODELS = { listing: Property, user: User, review: Review, message: Message };

// POST /api/reports — report a listing, user, review, or message
router.post(
  '/',
  auth,
  writeLimiter,
  asyncHandler(async (req, res) => {
    const { targetType, targetId, reason, details = '' } = req.body;
    if (!REPORT_TARGETS.includes(targetType)) throw new AppError(`targetType must be one of: ${REPORT_TARGETS.join(', ')}`, 400);
    if (!isObjectId(targetId)) throw new AppError('A valid targetId is required', 400);
    if (!REPORT_REASONS.includes(reason)) throw new AppError(`reason must be one of: ${REPORT_REASONS.join(', ')}`, 400);
    if (typeof details !== 'string' || details.length > 1000) throw new AppError('details must be at most 1000 characters', 400);
    if (targetType === 'user' && targetId === req.user._id.toString()) throw new AppError('You cannot report yourself', 400);

    const target = await TARGET_MODELS[targetType].findById(targetId).select('_id');
    if (!target) throw new AppError('The item you reported was not found', 404);

    const dup = await Report.exists({ reporterId: req.user._id, targetType, targetId, status: 'open' });
    if (dup) throw new AppError('You have already reported this. Our team is reviewing it.', 409);

    const report = await Report.create({ reporterId: req.user._id, targetType, targetId, reason, details: details.trim() });

    const admins = await User.find({ role: 'admin' }).select('_id').limit(20);
    await Promise.all(
      admins.map((a) => notify(a._id, 'New report', `A ${targetType} was reported for "${reason.replace('_', ' ')}".`, 'report', { reportId: report._id }))
    );
    res.status(201).json({ report: { id: report._id, status: report.status } });
  })
);

// GET /api/reports/mine — my reports and their status
router.get(
  '/mine',
  auth,
  asyncHandler(async (req, res) => {
    const reports = await Report.find({ reporterId: req.user._id }).sort({ createdAt: -1 }).limit(100);
    res.json({ reports });
  })
);

module.exports = router;
