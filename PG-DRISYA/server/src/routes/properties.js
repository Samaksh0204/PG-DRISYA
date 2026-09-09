const express = require('express');
const Property = require('../models/Property');
const User = require('../models/User');
const Review = require('../models/Review');
const Notification = require('../models/Notification');
const { auth, requireRole, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// ── Helpers ────────────────────────────────────────
const VALID_GENDERS = ['male', 'female', 'coed'];
const VALID_OCCUPANCIES = ['single', 'double', 'triple', 'dorm'];
const VALID_SORTS = ['price_asc', 'price_desc', 'rating', 'newest', 'views'];

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parsePositiveNum(val) {
  const n = Number(val);
  return !isNaN(n) && n >= 0 ? n : null;
}

// GET /api/properties — public listing with search/filter/sort/pagination
router.get('/', async (req, res, next) => {
  try {
    const { city, locality, search, gender, minPrice, maxPrice, amenities, occupancy, sort, featured, page = 1, limit = 20 } = req.query;
    const filter = { status: 'active' };

    if (city) filter.city = new RegExp(escapeRegex(String(city)), 'i');
    if (locality) filter.locality = new RegExp(escapeRegex(String(locality)), 'i');
    if (search) {
      const safe = escapeRegex(String(search));
      filter.$or = [
        { title: new RegExp(safe, 'i') },
        { city: new RegExp(safe, 'i') },
        { locality: new RegExp(safe, 'i') },
        { description: new RegExp(safe, 'i') },
      ];
    }
    if (gender && gender !== 'all') {
      if (VALID_GENDERS.includes(gender)) filter.genderPreference = gender;
    }
    if (occupancy) {
      if (VALID_OCCUPANCIES.includes(occupancy)) filter.occupancy = occupancy;
    }
    if (featured === 'true') filter.featured = true;
    if (minPrice || maxPrice) {
      filter.price = {};
      const min = parsePositiveNum(minPrice);
      const max = parsePositiveNum(maxPrice);
      if (min !== null) filter.price.$gte = min;
      if (max !== null) filter.price.$lte = max;
      if (Object.keys(filter.price).length === 0) delete filter.price;
    }
    if (amenities) {
      const list = String(amenities).split(',').map((a) => a.trim()).filter(Boolean);
      if (list.length) filter.amenities = { $all: list };
    }

    let sortObj = { featured: -1, rating: -1 };
    if (VALID_SORTS.includes(sort)) {
      if (sort === 'price_asc') sortObj = { price: 1 };
      else if (sort === 'price_desc') sortObj = { price: -1 };
      else if (sort === 'rating') sortObj = { rating: -1 };
      else if (sort === 'newest') sortObj = { createdAt: -1 };
      else if (sort === 'views') sortObj = { views: -1 };
    }

    const pageNum = Math.max(1, Math.floor(Number(page)) || 1);
    const limitNum = Math.min(100, Math.max(1, Math.floor(Number(limit)) || 20));
    const skip = (pageNum - 1) * limitNum;
    const [properties, total] = await Promise.all([
      Property.find(filter).sort(sortObj).skip(skip).limit(limitNum),
      Property.countDocuments(filter),
    ]);

    res.json({ properties, total, page: pageNum, pages: Math.ceil(total / limitNum) });
  } catch (err) {
    next(err);
  }
});

// GET /api/properties/owner/mine — owner's listings (MUST be before /:id)
router.get('/owner/mine', auth, requireRole('owner', 'admin'), async (req, res, next) => {
  try {
    const properties = await Property.find({ ownerId: req.user._id }).sort({ createdAt: -1 });
    res.json({ properties });
  } catch (err) {
    next(err);
  }
});

// GET /api/properties/cities — unique cities with counts
router.get('/cities', async (req, res, next) => {
  try {
    const result = await Property.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$city', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    res.json(result.map((r) => ({ name: r._id, listingCount: r.count })));
  } catch (err) {
    next(err);
  }
});

// GET /api/properties/owner/analytics — owner dashboard stats (MUST be before /:id)
router.get('/owner/analytics', auth, requireRole('owner', 'admin'), async (req, res, next) => {
  try {
    const ownerId = req.user._id;
    const properties = await Property.find({ ownerId });

    const totalListings = properties.length;
    const activeListings = properties.filter((p) => p.status === 'active').length;
    const totalViews = properties.reduce((sum, p) => sum + (p.views || 0), 0);
    const totalRooms = properties.reduce((sum, p) => sum + (p.roomsAvailable || 0), 0);
    const avgRating = properties.length
      ? +(properties.reduce((sum, p) => sum + (p.rating || 0), 0) / properties.length).toFixed(1)
      : 0;
    const totalReviews = properties.reduce((sum, p) => sum + (p.reviewCount || 0), 0);

    const propertyStats = properties.map((p) => ({
      id: p._id,
      title: p.title,
      city: p.city,
      views: p.views || 0,
      rating: p.rating || 0,
      reviewCount: p.reviewCount || 0,
      roomsAvailable: p.roomsAvailable || 0,
      status: p.status,
      price: p.price,
    }));

    const Visit = require('../models/Visit');
    const propertyIds = properties.map((p) => p._id);
    const visitCounts = await Visit.aggregate([
      { $match: { propertyId: { $in: propertyIds } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const visits = { pending: 0, confirmed: 0, completed: 0, cancelled: 0 };
    visitCounts.forEach((v) => { if (visits.hasOwnProperty(v._id)) visits[v._id] = v.count; });

    res.json({
      totalListings,
      activeListings,
      totalViews,
      totalRooms,
      avgRating,
      totalReviews,
      visits,
      propertyStats,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/properties/:id — single property with owner info
router.get('/:id', async (req, res, next) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid property ID' });
    }
    // Atomic view counter — no read-increment-save race condition
    const property = await Property.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    );
    if (!property) return res.status(404).json({ message: 'Property not found' });

    const owner = await User.findById(property.ownerId).select('-password');
    const reviews = await Review.find({ propertyId: property._id })
      .populate('userId', 'fullName avatar')
      .sort({ createdAt: -1 })
      .limit(20);

    // Get owner's listing count
    const ownerListingCount = await Property.countDocuments({ ownerId: property.ownerId, status: 'active' });

    const ownerProfile = owner ? {
      ...owner.toProfile(),
      listingCount: ownerListingCount,
    } : null;

    res.json({
      property,
      owner: ownerProfile,
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

// Fields an owner can set when creating a listing
const ALLOWED_PROPERTY_CREATE = [
  'title', 'city', 'locality', 'price', 'deposit', 'occupancy',
  'genderPreference', 'amenities', 'description', 'photos',
  'instantBook', 'roomsAvailable', 'rules', 'moveInDate',
  'distanceFromLandmark', 'lat', 'lng',
];

// POST /api/properties — create (owner only)
router.post('/', auth, requireRole('owner', 'admin'), async (req, res, next) => {
  try {
    const data = { ownerId: req.user._id };
    for (const key of ALLOWED_PROPERTY_CREATE) {
      if (req.body[key] !== undefined) data[key] = req.body[key];
    }
    const property = await Property.create(data);

    // Notify all tenants in the same city about new listing
    const tenants = await User.find({ role: 'tenant', city: new RegExp(escapeRegex(property.city), 'i') }).select('_id');
    if (tenants.length > 0) {
      const notifications = tenants.map((t) => ({
        userId: t._id,
        title: 'New PG Added',
        body: `"${property.title}" is now available in ${property.city}`,
        type: 'listing',
        data: { propertyId: property._id },
      }));
      await Notification.insertMany(notifications);
    }

    res.status(201).json({ property });
  } catch (err) {
    next(err);
  }
});

// PUT /api/properties/:id — update (owner only, whitelisted fields)
// Fields an owner can update. Excludes system-managed fields like ownerId,
// views, rating, reviewCount, featured, verified, status (status has its own
// controlled path via DELETE, and featured/verified would let an owner
// self-promote their own listing if left open).
const ALLOWED_PROPERTY_UPDATES = [
  'title', 'city', 'locality', 'price', 'deposit', 'occupancy',
  'genderPreference', 'amenities', 'description', 'photos',
  'instantBook', 'roomsAvailable', 'rules', 'moveInDate',
  'distanceFromLandmark', 'lat', 'lng', 'virtualTour',
];

router.put('/:id', auth, requireRole('owner', 'admin'), async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: 'Property not found' });
    if (property.ownerId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not your property' });
    }
    // Only allow known fields — prevents mass-assignment of ownerId, views, rating, etc.
    const updates = {};
    for (const key of ALLOWED_PROPERTY_UPDATES) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    const updated = await Property.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });
    res.json({ property: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/properties/:id — deactivate (owner only)
router.delete('/:id', auth, requireRole('owner', 'admin'), async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: 'Property not found' });
    if (property.ownerId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not your property' });
    }
    property.status = 'inactive';
    await property.save();
    res.json({ message: 'Property deactivated' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
