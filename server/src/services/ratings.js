const mongoose = require('mongoose');
const Review = require('../models/Review');
const Property = require('../models/Property');

// Recompute a property's average rating and review count from real reviews.
async function recomputePropertyRating(propertyId) {
  const id = new mongoose.Types.ObjectId(String(propertyId));
  const agg = await Review.aggregate([
    { $match: { propertyId: id } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  const rating = agg.length ? Math.round(agg[0].avg * 10) / 10 : 0;
  const reviewCount = agg.length ? agg[0].count : 0;
  await Property.updateOne({ _id: id }, { rating, reviewCount });
  return { rating, reviewCount };
}

// Owner-level stats across all of their listings (for host cards / profiles).
async function ownerReviewStats(ownerId) {
  const id = new mongoose.Types.ObjectId(String(ownerId));
  const props = await Property.find({ ownerId: id, status: { $ne: 'deleted' } }).select('_id');
  if (!props.length) return { rating: 0, reviewCount: 0 };
  const agg = await Review.aggregate([
    { $match: { propertyId: { $in: props.map((p) => p._id) } } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  return agg.length
    ? { rating: Math.round(agg[0].avg * 10) / 10, reviewCount: agg[0].count }
    : { rating: 0, reviewCount: 0 };
}

module.exports = { recomputePropertyRating, ownerReviewStats };
