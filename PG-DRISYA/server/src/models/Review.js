const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    text: { type: String, default: '' },
    verifiedStay: { type: Boolean, default: false },
    photos: [{ type: String }],
  },
  { timestamps: true }
);

reviewSchema.index({ propertyId: 1 });

module.exports = mongoose.model('Review', reviewSchema);
