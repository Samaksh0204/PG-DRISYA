const express = require('express');
const Property = require('../models/Property');
const Review = require('../models/Review');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// The homepage asks for these on every visit; recount at most once a minute.
const TTL_MS = process.env.NODE_ENV === 'test' ? 0 : 60_000;
let cached = { at: 0, body: null };

// GET /api/stats — real, live numbers for the homepage (no invented figures).
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    if (cached.body && Date.now() - cached.at < TTL_MS) return res.json(cached.body);
    const [activeListings, verifiedListings, cityAgg, reviewAgg] = await Promise.all([
      Property.countDocuments({ status: 'active' }),
      Property.countDocuments({ status: 'active', verified: true }),
      Property.aggregate([{ $match: { status: 'active' } }, { $group: { _id: { $toLower: '$city' } } }, { $count: 'n' }]),
      Review.aggregate([{ $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }]),
    ]);
    cached = { at: Date.now(), body: {
      activeListings,
      verifiedListings,
      cities: cityAgg[0]?.n || 0,
      reviews: reviewAgg[0]?.count || 0,
      avgRating: reviewAgg[0] ? Math.round(reviewAgg[0].avg * 10) / 10 : 0,
    } };
    res.json(cached.body);
  })
);

module.exports = router;
