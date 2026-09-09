const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    city: { type: String, required: true },
    locality: { type: String, default: '' },
    lat: { type: Number, default: 0 },
    lng: { type: Number, default: 0 },
    genderPreference: { type: String, enum: ['male', 'female', 'coed'], default: 'coed' },
    occupancy: { type: String, enum: ['single', 'double', 'triple', 'dorm'], default: 'double' },
    price: { type: Number, required: true },
    deposit: { type: Number, default: 0 },
    amenities: [{ type: String }],
    photos: [{ type: String }],
    rules: [{ type: String }],
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    featured: { type: Boolean, default: false },
    instantBook: { type: Boolean, default: false },
    verified: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'inactive', 'pending_review'], default: 'active' },
    moveInDate: { type: String, default: '' },
    distanceFromLandmark: { type: String, default: '' },
    virtualTour: { type: Boolean, default: false },
    views: { type: Number, default: 0 },
    roomsAvailable: { type: Number, default: 1 },
  },
  { timestamps: true }
);

propertySchema.index({ city: 1, status: 1 });
propertySchema.index({ ownerId: 1 });
propertySchema.index({ price: 1 });
propertySchema.index({ rating: -1 });

module.exports = mongoose.model('Property', propertySchema);
