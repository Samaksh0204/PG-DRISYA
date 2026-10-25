const express = require('express');
const Review = require('../models/Review');
const Property = require('../models/Property');
const { auth } = require('../middleware/auth');
const { writeLimiter } = require('../middleware/rateLimiters');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { notify } = require('../utils/notify');
const { isObjectId } = require('../utils/validators');
const { recomputePropertyRating } = require('../services/ratings');
const { canReviewProperty, hasStayed } = require('../services/relationships');
const { serializeReview } = require('./properties');

const router = express.Router();
const CATEGORIES = ['cleanliness', 'accuracy', 'safety', 'food', 'value'];
const validStar = (n) => Number.isInteger(n) && n >= 1 && n <= 5;

// GET /api/reviews/owner/mine — reviews on all my listings (owner dashboard)
router.get(
  '/owner/mine',
  auth,
  asyncHandler(async (req, res) => {
    const props = await Property.find({ ownerId: req.user._id, status: { $ne: 'deleted' } }).select('_id title');
    const titles = new Map(props.map((p) => [p._id.toString(), p.title]));
    const reviews = await Review.find({ propertyId: { $in: props.map((p) => p._id) } })
      .populate('userId', 'fullName avatar')
      .sort({ createdAt: -1 })
      .limit(200);
    res.json({
      reviews: reviews.map((r) => ({ ...serializeReview(r), propertyId: r.propertyId, propertyTitle: titles.get(r.propertyId.toString()) })),
    });
  })
);

// GET /api/reviews/eligibility/:propertyId
router.get(
  '/eligibility/:propertyId',
  auth,
  asyncHandler(async (req, res) => {
    if (!isObjectId(req.params.propertyId)) throw new AppError('Invalid property ID', 400);
    const property = await Property.findById(req.params.propertyId).select('ownerId');
    if (!property) throw new AppError('Property not found', 404);
    const hasReviewed = !!(await Review.exists({ propertyId: property._id, userId: req.user._id }));
    const isOwner = property.ownerId.equals(req.user._id);
    const eligible = !isOwner && !hasReviewed && (await canReviewProperty(req.user._id, property._id));
    res.json({ canReview: eligible, hasReviewed, isOwner });
  })
);

// GET /api/reviews/:propertyId
router.get(
  '/:propertyId',
  asyncHandler(async (req, res) => {
    if (!isObjectId(req.params.propertyId)) throw new AppError('Invalid property ID', 400);
    const reviews = await Review.find({ propertyId: req.params.propertyId })
      .populate('userId', 'fullName avatar')
      .sort({ createdAt: -1 })
      .limit(100);
    res.json({ reviews: reviews.map(serializeReview) });
  })
);

// POST /api/reviews — only after a completed visit or a stay
router.post(
  '/',
  auth,
  writeLimiter,
  asyncHandler(async (req, res) => {
    const { propertyId, rating, text = '', ratings = {}, photos = [] } = req.body;
    if (!isObjectId(propertyId)) throw new AppError('A valid propertyId is required', 400);
    const stars = Number(rating);
    if (!validStar(stars)) throw new AppError('rating must be a whole number from 1 to 5', 400);
    if (typeof text !== 'string' || text.length > 2000) throw new AppError('Review text must be at most 2000 characters', 400);
    if (!Array.isArray(photos) || photos.length > 5 || photos.some((p) => typeof p !== 'string' || !/^https:\/\//.test(p))) {
      throw new AppError('Up to 5 https photo URLs allowed', 400);
    }
    const cat = {};
    if (ratings && typeof ratings === 'object') {
      for (const key of CATEGORIES) {
        if (ratings[key] === undefined || ratings[key] === null || ratings[key] === '') continue;
        const n = Number(ratings[key]);
        if (!validStar(n)) throw new AppError(`${key} rating must be 1-5`, 400);
        cat[key] = n;
      }
    }

    const property = await Property.findById(propertyId);
    if (!property || property.status === 'deleted') throw new AppError('Property not found', 404);
    if (property.ownerId.equals(req.user._id)) throw new AppError('You cannot review your own property', 403);
    if (await Review.exists({ propertyId, userId: req.user._id })) throw new AppError('You have already reviewed this property', 409);
    if (!(await canReviewProperty(req.user._id, propertyId))) {
      throw new AppError('You can review a PG after your visit is completed or after you stay there', 403);
    }

    const review = await Review.create({
      propertyId,
      userId: req.user._id,
      rating: stars,
      ratings: cat,
      text: text.trim(),
      photos,
      verifiedStay: await hasStayed(req.user._id, propertyId),
    });
    await recomputePropertyRating(propertyId);
    await notify(property.ownerId, 'New review', `${req.user.fullName} left a ${stars}-star review on "${property.title}".`, 'review', { propertyId, reviewId: review._id });
    await review.populate('userId', 'fullName avatar');
    res.status(201).json({ review: serializeReview(review) });
  })
);

// POST /api/reviews/:id/reply — owner's public response (create or edit)
router.post(
  '/:id/reply',
  auth,
  writeLimiter,
  asyncHandler(async (req, res) => {
    if (!isObjectId(req.params.id)) throw new AppError('Invalid review ID', 400);
    const { text } = req.body;
    if (typeof text !== 'string' || !text.trim() || text.length > 1000) throw new AppError('Reply must be 1-1000 characters', 400);
    const review = await Review.findById(req.params.id);
    if (!review) throw new AppError('Review not found', 404);
    const property = await Property.findById(review.propertyId).select('ownerId title');
    if (!property || !property.ownerId.equals(req.user._id)) throw new AppError('Only the property owner can reply', 403);
    review.ownerReply = { text: text.trim(), date: new Date() };
    await review.save();
    await notify(review.userId, 'The owner replied to your review', `The owner of "${property.title}" responded to your review.`, 'review', { propertyId: property._id });
    await review.populate('userId', 'fullName avatar');
    res.json({ review: serializeReview(review) });
  })
);

// DELETE /api/reviews/:id — author or admin
router.delete(
  '/:id',
  auth,
  asyncHandler(async (req, res) => {
    if (!isObjectId(req.params.id)) throw new AppError('Invalid review ID', 400);
    const review = await Review.findById(req.params.id);
    if (!review) throw new AppError('Review not found', 404);
    if (!review.userId.equals(req.user._id) && req.user.role !== 'admin') throw new AppError('Not allowed', 403);
    await review.deleteOne();
    await recomputePropertyRating(review.propertyId);
    res.json({ message: 'Review deleted' });
  })
);

module.exports = router;
