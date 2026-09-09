const express = require('express');
const Notification = require('../models/Notification');
const { auth } = require('../middleware/auth');

const router = express.Router();

// GET /api/notifications — user's notifications
router.get('/', auth, async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find({ userId: req.user._id }).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Notification.countDocuments({ userId: req.user._id }),
      Notification.countDocuments({ userId: req.user._id, read: false }),
    ]);

    res.json({ notifications, total, unreadCount, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

// PUT /api/notifications/read-all — mark all as read
router.put('/read-all', auth, async (req, res, next) => {
  try {
    await Notification.updateMany({ userId: req.user._id, read: false }, { read: true });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// PUT /api/notifications/:id/read — mark one as read
router.put('/:id/read', auth, async (req, res, next) => {
  try {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { read: true },
      { new: true }
    );
    if (!notif) return res.status(404).json({ message: 'Notification not found' });
    res.json({ notification: notif });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
