const express = require('express');
const Review = require('../models/Review');
const Property = require('../models/Property');
const { auth } = require('../middleware/auth');

const router = express.Router();

// GET /api/reviews/:propertyId
router.get('/:propertyId', async (req, res, next) => {
  try {
    const reviews = await Review.find({ propertyId: req.params.propertyId })
      .populate('userId', 'fullName avatar')
      .sort({ createdAt: -1 });
    res.json({
      reviews: reviews.map((r) => ({
        id: r._id,
        author: r.userId?.fullName || 'Anonymous',
        authorAvatar: r.userId?.avatar || '',
        rating: r.rating,
        text: r.text,
        date: r.createdAt,
        verifiedStay: r.verifiedStay,
        photos: r.photos,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/reviews
router.post('/', auth, async (req, res, next) => {
  try {
    const { propertyId, rating, text, photos } = req.body;
    if (!propertyId || !rating) return res.status(400).json({ message: 'propertyId and rating are required' });

    const numericRating = Number(rating);
    if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ message: 'rating must be a number between 1 and 5' });
    }

    const property = await Property.findById(propertyId);
    if (!property) return res.status(404).json({ message: 'Property not found' });

    // Duplicate-review guard — one review per user per property
    const existing = await Review.findOne({ propertyId, userId: req.user._id });
    if (existing) {
      return res.status(409).json({ message: 'You have already reviewed this property' });
    }

    const review = await Review.create({
      propertyId,
      userId: req.user._id,
      rating: numericRating,
      text: text || '',
      photos: photos || [],
    });

    // Update property average rating
    const agg = await Review.aggregate([
      { $match: { propertyId: review.propertyId } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    if (agg.length) {
      await Property.findByIdAndUpdate(propertyId, {
        rating: Math.round(agg[0].avg * 10) / 10,
        reviewCount: agg[0].count,
      });
    }

    res.status(201).json({ review });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
