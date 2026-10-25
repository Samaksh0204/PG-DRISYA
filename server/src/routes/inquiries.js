const express = require('express');
const Inquiry = require('../models/Inquiry');
const User = require('../models/User');
const { optionalAuth } = require('../middleware/auth');
const { publicFormLimiter } = require('../middleware/rateLimiters');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { notify } = require('../utils/notify');
const { isEmail, isNonEmptyString, isISODate } = require('../utils/validators');

const router = express.Router();

// POST /api/inquiries — "Drisya Expert" assisted search request (public form)
router.post(
  '/',
  publicFormLimiter,
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { name, email = '', phone = '', city = '', locality = '', budget, moveInDate = '', message = '' } = req.body;
    if (!isNonEmptyString(name, 100)) throw new AppError('Please enter your name', 400);
    const hasEmail = typeof email === 'string' && email.trim() !== '';
    const hasPhone = typeof phone === 'string' && phone.replace(/\D/g, '').length >= 10;
    if (!hasEmail && !hasPhone) throw new AppError('Please give an email or a 10-digit phone number so we can reach you', 400);
    if (hasEmail && !isEmail(email)) throw new AppError('Please enter a valid email', 400);
    if (moveInDate && !isISODate(moveInDate)) throw new AppError('Invalid move-in date', 400);
    for (const [k, v, max] of [['city', city, 80], ['locality', locality, 120], ['message', message, 2000], ['phone', phone, 20]]) {
      if (typeof v !== 'string' || v.length > max) throw new AppError(`${k} is too long`, 400);
    }
    const budgetNum = budget === undefined || budget === '' ? 0 : Number(budget);
    if (!Number.isFinite(budgetNum) || budgetNum < 0) throw new AppError('Budget must be a positive number', 400);

    const inquiry = await Inquiry.create({
      userId: req.user?._id,
      name: name.trim(),
      email: hasEmail ? email.trim() : '',
      phone: phone.trim(),
      city: city.trim(),
      locality: locality.trim(),
      budget: budgetNum,
      moveInDate,
      message: message.trim(),
    });

    const admins = await User.find({ role: 'admin' }).select('_id').limit(20);
    await Promise.all(admins.map((a) => notify(a._id, 'New Expert request', `${inquiry.name} is looking for a PG in ${inquiry.city || 'an unspecified city'}.`, 'system', { inquiryId: inquiry._id })));
    res.status(201).json({ message: "Thanks! We'll contact you within one working day.", id: inquiry._id });
  })
);

module.exports = router;
