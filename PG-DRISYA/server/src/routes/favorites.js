const express = require('express');
const Favorite = require('../models/Favorite');
const { auth } = require('../middleware/auth');

const router = express.Router();

// GET /api/favorites — user's favorites
router.get('/', auth, async (req, res, next) => {
  try {
    const favs = await Favorite.find({ userId: req.user._id })
      .populate('propertyId', 'title city locality price photos rating reviewCount genderPreference occupancy distanceFromLandmark featured verified instantBook deposit')
      .sort({ createdAt: -1 });
    res.json({ favorites: favs.filter((f) => f.propertyId) });
  } catch (err) {
    next(err);
  }
});

// GET /api/favorites/ids — just the property IDs (for quick lookup)
router.get('/ids', auth, async (req, res, next) => {
  try {
    const favs = await Favorite.find({ userId: req.user._id }).select('propertyId');
    res.json({ ids: favs.map((f) => f.propertyId.toString()) });
  } catch (err) {
    next(err);
  }
});

// GET /api/favorites/collections — list user's collections with counts
router.get('/collections', auth, async (req, res, next) => {
  try {
    const collections = await Favorite.aggregate([
      { $match: { userId: req.user._id } },
      { $addFields: { collection: { $ifNull: ['$collection', 'All Saved'] } } },
      { $group: { _id: '$collection', count: { $sum: 1 }, lastAdded: { $max: '$createdAt' } } },
      { $sort: { lastAdded: -1 } },
    ]);
    res.json({
      collections: collections.map((c) => ({
        name: c._id,
        count: c.count,
        lastAdded: c.lastAdded,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/favorites/collection/:name — get favorites in a specific collection
router.get('/collection/:name', auth, async (req, res, next) => {
  try {
    const favs = await Favorite.find({ userId: req.user._id, collection: req.params.name })
      .populate('propertyId', 'title city locality price photos rating reviewCount genderPreference occupancy distanceFromLandmark featured verified instantBook deposit')
      .sort({ createdAt: -1 });
    res.json({ favorites: favs.filter((f) => f.propertyId) });
  } catch (err) {
    next(err);
  }
});

// POST /api/favorites/toggle
router.post('/toggle', auth, async (req, res, next) => {
  try {
    const { propertyId, collection } = req.body;
    if (!propertyId) return res.status(400).json({ message: 'propertyId is required' });

    const existing = await Favorite.findOne({ userId: req.user._id, propertyId });
    if (existing) {
      await Favorite.deleteOne({ _id: existing._id });
      res.json({ saved: false });
    } else {
      const collName = (collection && typeof collection === 'string') ? collection.trim().slice(0, 50) : 'All Saved';
      await Favorite.create({ userId: req.user._id, propertyId, collection: collName });
      res.json({ saved: true, collection: collName });
    }
  } catch (err) {
    next(err);
  }
});

// PUT /api/favorites/move — move a favorite to a different collection
router.put('/move', auth, async (req, res, next) => {
  try {
    const { propertyId, collection } = req.body;
    if (!propertyId || !collection) {
      return res.status(400).json({ message: 'propertyId and collection are required' });
    }
    const fav = await Favorite.findOneAndUpdate(
      { userId: req.user._id, propertyId },
      { collection: String(collection).trim().slice(0, 50) },
      { new: true }
    );
    if (!fav) return res.status(404).json({ message: 'Favorite not found' });
    res.json({ favorite: fav });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/favorites/collection/:name — delete an entire collection (moves items to "All Saved")
router.delete('/collection/:name', auth, async (req, res, next) => {
  try {
    if (req.params.name === 'All Saved') {
      return res.status(400).json({ message: 'Cannot delete the default collection' });
    }
    await Favorite.updateMany(
      { userId: req.user._id, collection: req.params.name },
      { collection: 'All Saved' }
    );
    res.json({ message: 'Collection removed, items moved to All Saved' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
