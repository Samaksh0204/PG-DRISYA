const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, default: '', maxlength: 5000 },
    city: { type: String, required: true, trim: true, maxlength: 80 },
    locality: { type: String, default: '', trim: true, maxlength: 120 },
    lat: { type: Number, default: 0, min: -90, max: 90 },
    lng: { type: Number, default: 0, min: -180, max: 180 },
    genderPreference: { type: String, enum: ['male', 'female', 'coed'], default: 'coed' },
    occupancy: { type: String, enum: ['single', 'double', 'triple', 'dorm'], default: 'double' },
    price: { type: Number, required: true, min: [1, 'price must be greater than 0'], max: [1000000, 'price is too high'] },
    deposit: { type: Number, default: 0, min: [0, 'deposit cannot be negative'] },
    amenities: { type: [String], validate: [(v) => v.length <= 40, 'Too many amenities'] },
    photos: { type: [String], validate: [(v) => v.length <= 15, 'A listing can have at most 15 photos'] },
    rules: { type: [String], validate: [(v) => v.length <= 20, 'At most 20 house rules'] },
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    featured: { type: Boolean, default: false },
    // Instant Book: booking requests are accepted automatically while rooms are available.
    instantBook: { type: Boolean, default: false },
    // Set only by an admin after inspection.
    verified: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['active', 'inactive', 'pending_review', 'rejected', 'deleted'],
      default: 'active',
    },
    moderationNote: { type: String, default: '', maxlength: 1000 },
    approvedAt: { type: Date },
    moveInDate: { type: String, default: '' },
    distanceFromLandmark: { type: String, default: '', maxlength: 150 },
    virtualTour: { type: Boolean, default: false },
    views: { type: Number, default: 0 },
    roomsAvailable: { type: Number, default: 1, min: 0, max: 500 },
  },
  { timestamps: true }
);

propertySchema.index({ city: 1, status: 1 });
propertySchema.index({ ownerId: 1 });
propertySchema.index({ status: 1, price: 1 });
propertySchema.index({ status: 1, rating: -1 });
propertySchema.index({ status: 1, createdAt: -1 });
propertySchema.index({ status: 1, featured: -1, rating: -1, createdAt: -1 });

module.exports = mongoose.model('Property', propertySchema);
