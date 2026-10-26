const express = require('express');
const Favorite = require('../models/Favorite');
const Property = require('../models/Property');
const { auth } = require('../middleware/auth');
const { writeLimiter } = require('../middleware/rateLimiters');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { isObjectId } = require('../utils/validators');
const { publicProperty } = require('../utils/serializers');

const router = express.Router();

// GET /api/favorites — saved listings with full details (wishlist page)
router.get(
  '/',
  auth,
  asyncHandler(async (req, res) => {
    const favs = await Favorite.find({ userId: req.user._id })
      .populate('propertyId')
      .sort({ createdAt: -1 })
      .limit(500);
    res.json({
      favorites: favs
        .filter((f) => f.propertyId && f.propertyId.status !== 'deleted')
        .map((f) => ({ _id: f._id, createdAt: f.createdAt, propertyId: publicProperty(f.propertyId) })),
    });
  })
);

// GET /api/favorites/ids
router.get(
  '/ids',
  auth,
  asyncHandler(async (req, res) => {
    const favs = await Favorite.find({ userId: req.user._id }).select('propertyId').limit(500);
    res.json({ ids: favs.map((f) => f.propertyId.toString()) });
  })
);

// POST /api/favorites/toggle
router.post(
  '/toggle',
  auth,
  writeLimiter,
  asyncHandler(async (req, res) => {
    const { propertyId } = req.body;
    if (!isObjectId(propertyId)) throw new AppError('A valid propertyId is required', 400);

    const removed = await Favorite.findOneAndDelete({ userId: req.user._id, propertyId });
    if (removed) return res.json({ saved: false });

    const exists = await Property.exists({ _id: propertyId, status: 'active' });
    if (!exists) throw new AppError('Property not found', 404);
    try {
      await Favorite.create({ userId: req.user._id, propertyId });
    } catch (err) {
      if (err.code !== 11000) throw err; // double-click race: already saved
    }
    res.json({ saved: true });
  })
);

module.exports = router;
