const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    // Optional category ratings (Airbnb-style breakdown).
    ratings: {
      cleanliness: { type: Number, min: 1, max: 5 },
      accuracy: { type: Number, min: 1, max: 5 },
      safety: { type: Number, min: 1, max: 5 },
      food: { type: Number, min: 1, max: 5 },
      value: { type: Number, min: 1, max: 5 },
    },
    text: { type: String, default: '', trim: true, maxlength: 2000 },
    // true when the reviewer had an accepted/completed booking (actually stayed).
    verifiedStay: { type: Boolean, default: false },
    photos: { type: [String], validate: [(v) => v.length <= 5, 'At most 5 review photos'] },
    ownerReply: {
      text: { type: String, trim: true, maxlength: 1000 },
      date: { type: Date },
    },
  },
  { timestamps: true }
);

reviewSchema.index({ propertyId: 1, createdAt: -1 });
reviewSchema.index({ propertyId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
