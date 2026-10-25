const express = require('express');
const Notification = require('../models/Notification');
const { auth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

const router = express.Router();

// GET /api/notifications — user's notifications
router.get(
  '/',
  auth,
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find({ userId: req.user._id }).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Notification.countDocuments({ userId: req.user._id }),
      Notification.countDocuments({ userId: req.user._id, read: false }),
    ]);

    res.json({ notifications, total, unreadCount, page, pages: Math.ceil(total / limit) });
  })
);

// PUT /api/notifications/read-all — mark all as read
router.put(
  '/read-all',
  auth,
  asyncHandler(async (req, res) => {
    await Notification.updateMany({ userId: req.user._id, read: false }, { read: true });
    res.json({ success: true });
  })
);

// PUT /api/notifications/:id/read — mark one as read
router.put(
  '/:id/read',
  auth,
  asyncHandler(async (req, res) => {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { read: true },
      { new: true }
    );
    if (!notif) throw new AppError('Notification not found', 404);
    res.json({ notification: notif });
  })
);

module.exports = router;
