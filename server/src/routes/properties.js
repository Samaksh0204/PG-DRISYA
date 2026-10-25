const express = require('express');
const Property = require('../models/Property');
const User = require('../models/User');
const Review = require('../models/Review');
const Notification = require('../models/Notification');
const { auth, requireRole, optionalAuth } = require('../middleware/auth');
const { writeLimiter } = require('../middleware/rateLimiters');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { escapeRegex, pick, isObjectId, isISODate, parsePagination } = require('../utils/validators');
const { flags } = require('../config/env');
const { ownerReviewStats } = require('../services/ratings');
const { canSeeOwnerContact, canReviewProperty, hasStayed } = require('../services/relationships');

const router = express.Router();

const VALID_GENDERS = ['male', 'female', 'coed'];
const VALID_OCCUPANCIES = ['single', 'double', 'triple', 'dorm'];
const VALID_SORTS = ['price_asc', 'price_desc', 'rating', 'newest', 'views'];
const MAX_FANOUT = 500;

// Fields an owner may set. System-managed fields (views, rating, featured, verified,
// status, ownerId) are excluded so owners can't self-promote.
const WRITABLE_PROPERTY_FIELDS = [
  'title', 'description', 'city', 'locality', 'lat', 'lng', 'genderPreference', 'occupancy',
  'price', 'deposit', 'amenities', 'photos', 'rules', 'moveInDate', 'distanceFromLandmark',
  'virtualTour', 'roomsAvailable', 'instantBook',
];

function cleanPropertyInput(body) {
  const data = pick(body, WRITABLE_PROPERTY_FIELDS);
  for (const key of ['amenities', 'rules', 'photos']) {
    if (data[key] !== undefined) {
      if (!Array.isArray(data[key]) || data[key].some((x) => typeof x !== 'string')) {
        throw new AppError(`${key} must be a list of text values`, 400);
      }
      data[key] = data[key].map((s) => s.trim()).filter(Boolean);
    }
  }
  if (data.photos && data.photos.some((u) => !/^https:\/\//.test(u))) {
    throw new AppError('Photos must be https URLs (upload them first)', 400);
  }
  if (data.moveInDate !== undefined && data.moveInDate !== '' && !isISODate(data.moveInDate)) {
    throw new AppError('moveInDate must be YYYY-MM-DD', 400);
  }
  for (const key of ['title', 'description', 'city', 'locality', 'distanceFromLandmark']) {
    if (data[key] !== undefined && typeof data[key] !== 'string') throw new AppError(`${key} must be text`, 400);
  }
  return data;
}

async function fanOutNewListing(property) {
  const tenants = await User.find({ role: 'tenant', city: new RegExp(`^${escapeRegex(property.city)}$`, 'i') })
    .select('_id')
    .limit(MAX_FANOUT);
  if (!tenants.length) return;
  await Notification.insertMany(
    tenants.map((t) => ({
      userId: t._id,
      title: 'New PG in your city',
      body: `"${property.title}" is now available in ${property.city}`,
      type: 'listing',
      data: { propertyId: property._id },
    }))
  );
}

// GET /api/properties — public search with filters, sort, pagination
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { city, locality, search, gender, minPrice, maxPrice, amenities, occupancy, sort, featured, verified } = req.query;
    const filter = { status: 'active' };

    if (city) filter.city = new RegExp(escapeRegex(String(city)), 'i');
    if (locality) filter.locality = new RegExp(escapeRegex(String(locality)), 'i');
    if (search) {
      const safe = new RegExp(escapeRegex(String(search).slice(0, 100)), 'i');
      filter.$or = [{ title: safe }, { city: safe }, { locality: safe }, { description: safe }];
    }
    if (gender && VALID_GENDERS.includes(gender)) filter.genderPreference = gender;
    if (occupancy && VALID_OCCUPANCIES.includes(occupancy)) filter.occupancy = occupancy;
    if (featured === 'true') filter.featured = true;
    if (verified === 'true') filter.verified = true;
    if (req.query.instantBook === 'true') filter.instantBook = true;

    const min = Number(minPrice);
    const max = Number(maxPrice);
    if ((minPrice && Number.isFinite(min) && min >= 0) || (maxPrice && Number.isFinite(max) && max >= 0)) {
      filter.price = {};
      if (minPrice && Number.isFinite(min) && min >= 0) filter.price.$gte = min;
      if (maxPrice && Number.isFinite(max) && max >= 0) filter.price.$lte = max;
    }
    if (amenities) {
      const list = String(amenities).split(',').map((a) => a.trim()).filter(Boolean).slice(0, 20);
      if (list.length) filter.amenities = { $all: list };
    }

    let sortObj = { featured: -1, rating: -1, createdAt: -1 };
    if (VALID_SORTS.includes(sort)) {
      sortObj = {
        price_asc: { price: 1 },
        price_desc: { price: -1 },
        rating: { rating: -1, reviewCount: -1 },
        newest: { createdAt: -1 },
        views: { views: -1 },
      }[sort];
    }

    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20, maxLimit: 100 });
    const [properties, total] = await Promise.all([
      Property.find(filter).sort(sortObj).skip(skip).limit(limit),
      Property.countDocuments(filter),
    ]);
    res.json({ properties, total, page, pages: Math.ceil(total / limit) });
  })
);

// GET /api/properties/owner/mine (must be before /:id)
router.get(
  '/owner/mine',
  auth,
  requireRole('owner', 'admin'),
  asyncHandler(async (req, res) => {
    const properties = await Property.find({ ownerId: req.user._id, status: { $ne: 'deleted' } }).sort({ createdAt: -1 });
    res.json({ properties });
  })
);

// GET /api/properties/cities
router.get(
  '/cities',
  asyncHandler(async (_req, res) => {
    const result = await Property.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: { $toLower: '$city' }, name: { $first: '$city' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    res.json(result.map((r) => ({ name: r.name, listingCount: r.count })));
  })
);

// GET /api/properties/:id — detail with owner card, reviews, and viewer-specific info
router.get(
  '/:id',
  optionalAuth,
  asyncHandler(async (req, res) => {
    if (!isObjectId(req.params.id)) throw new AppError('Invalid property ID', 400);
    const property = await Property.findById(req.params.id);
    if (!property || property.status === 'deleted') throw new AppError('Property not found', 404);

    const viewer = req.user;
    const isOwner = viewer && property.ownerId.equals(viewer._id);
    const isAdmin = viewer && viewer.role === 'admin';
    // Paused / pending / rejected listings are only visible to their owner and admins.
    if (property.status !== 'active' && !isOwner && !isAdmin) throw new AppError('Property not found', 404);

    if (property.status === 'active' && !isOwner) {
      await Property.updateOne({ _id: property._id }, { $inc: { views: 1 } });
      property.views += 1;
    }

    const [owner, reviews, ownerListingCount, stats] = await Promise.all([
      User.findById(property.ownerId),
      Review.find({ propertyId: property._id }).populate('userId', 'fullName avatar').sort({ createdAt: -1 }).limit(50),
      Property.countDocuments({ ownerId: property.ownerId, status: 'active' }),
      ownerReviewStats(property.ownerId),
    ]);

    let ownerProfile = null;
    if (owner) {
      ownerProfile = { ...owner.toPublicProfile(), listingCount: ownerListingCount, ...stats };
      if (await canSeeOwnerContact(viewer, owner._id)) ownerProfile.phone = owner.phone;
    }

    let viewerInfo = null;
    if (viewer) {
      const hasReviewed = reviews.some((r) => r.userId && r.userId._id.equals(viewer._id));
      viewerInfo = {
        isOwner: !!isOwner,
        hasReviewed,
        canReview: !isOwner && !hasReviewed && (await canReviewProperty(viewer._id, property._id)),
        hasStayed: await hasStayed(viewer._id, property._id),
      };
    }

    res.json({
      property,
      owner: ownerProfile,
      viewer: viewerInfo,
      reviews: reviews.map(serializeReview),
    });
  })
);

function serializeReview(r) {
  return {
    id: r._id,
    author: r.userId?.fullName || 'Former member',
    authorId: r.userId?._id || null,
    authorAvatar: r.userId?.avatar || '',
    rating: r.rating,
    ratings: r.ratings || {},
    text: r.text,
    date: r.createdAt,
    verifiedStay: r.verifiedStay,
    photos: r.photos,
    ownerReply: r.ownerReply && r.ownerReply.text ? r.ownerReply : null,
  };
}

// POST /api/properties — create (owner only). Goes to moderation unless disabled.
router.post(
  '/',
  auth,
  requireRole('owner', 'admin'),
  writeLimiter,
  asyncHandler(async (req, res) => {
    const data = cleanPropertyInput(req.body);
    const needsReview = flags.moderationEnabled() && req.user.role !== 'admin';
    const property = await Property.create({
      ...data,
      ownerId: req.user._id,
      status: needsReview ? 'pending_review' : 'active',
      approvedAt: needsReview ? undefined : new Date(),
    });
    if (property.status === 'active') await fanOutNewListing(property);
    res.status(201).json({ property });
  })
);

// PUT /api/properties/:id — update (owner/admin). Editing a rejected listing resubmits it.
router.put(
  '/:id',
  auth,
  requireRole('owner', 'admin'),
  writeLimiter,
  asyncHandler(async (req, res) => {
    if (!isObjectId(req.params.id)) throw new AppError('Invalid property ID', 400);
    const property = await Property.findById(req.params.id);
    if (!property || property.status === 'deleted') throw new AppError('Property not found', 404);
    if (!property.ownerId.equals(req.user._id) && req.user.role !== 'admin') throw new AppError('Not your property', 403);

    const updates = cleanPropertyInput(req.body);
    if (property.status === 'rejected') {
      updates.status = 'pending_review';
      updates.moderationNote = '';
    }
    const updated = await Property.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    res.json({ property: updated });
  })
);

// PATCH /api/properties/:id/status — pause (inactive) / resume (active)
router.patch(
  '/:id/status',
  auth,
  requireRole('owner', 'admin'),
  writeLimiter,
  asyncHandler(async (req, res) => {
    const { status } = req.body;
    if (!['active', 'inactive'].includes(status)) throw new AppError("status must be 'active' or 'inactive'", 400);
    if (!isObjectId(req.params.id)) throw new AppError('Invalid property ID', 400);
    const property = await Property.findById(req.params.id);
    if (!property || property.status === 'deleted') throw new AppError('Property not found', 404);
    if (!property.ownerId.equals(req.user._id) && req.user.role !== 'admin') throw new AppError('Not your property', 403);
    if (property.status === 'pending_review') throw new AppError('This listing is awaiting review', 400);
    if (property.status === 'rejected') throw new AppError('Edit and resubmit this listing first', 400);
    property.status = status;
    await property.save();
    res.json({ property });
  })
);

// DELETE /api/properties/:id — soft delete
router.delete(
  '/:id',
  auth,
  requireRole('owner', 'admin'),
  asyncHandler(async (req, res) => {
    if (!isObjectId(req.params.id)) throw new AppError('Invalid property ID', 400);
    const property = await Property.findById(req.params.id);
    if (!property || property.status === 'deleted') throw new AppError('Property not found', 404);
    if (!property.ownerId.equals(req.user._id) && req.user.role !== 'admin') throw new AppError('Not your property', 403);
    property.status = 'deleted';
    await property.save();
    res.json({ message: 'Property deleted' });
  })
);

module.exports = router;
module.exports.fanOutNewListing = fanOutNewListing;
module.exports.serializeReview = serializeReview;
