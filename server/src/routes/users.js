const express = require('express');
const User = require('../models/User');
const Property = require('../models/Property');
const Review = require('../models/Review');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { isObjectId } = require('../utils/validators');
const { ownerReviewStats } = require('../services/ratings');
const { serializeReview } = require('./properties');

const router = express.Router();

// GET /api/users/:id — public host/tenant profile (no email or phone)
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!isObjectId(req.params.id)) throw new AppError('Invalid user ID', 400);
    const user = await User.findById(req.params.id);
    if (!user || user.suspended) throw new AppError('User not found', 404);

    const listings = await Property.find({ ownerId: user._id, status: 'active' }).sort({ rating: -1 }).limit(24);
    const reviews = listings.length
      ? await Review.find({ propertyId: { $in: listings.map((l) => l._id) } })
          .populate('userId', 'fullName avatar')
          .sort({ createdAt: -1 })
          .limit(20)
      : [];
    const stats = await ownerReviewStats(user._id);
    const titles = new Map(listings.map((l) => [l._id.toString(), l.title]));

    res.json({
      user: { ...user.toPublicProfile(), ...stats, listingCount: listings.length },
      listings,
      reviews: reviews.map((r) => ({ ...serializeReview(r), propertyId: r.propertyId, propertyTitle: titles.get(r.propertyId.toString()) })),
    });
  })
);

module.exports = router;
