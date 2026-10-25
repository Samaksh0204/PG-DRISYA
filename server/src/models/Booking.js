const mongoose = require('mongoose');

// "Request to book" (Airbnb-style). No online payment yet: rent and deposit are
// snapshotted at request time and paid to the owner at move-in.
const bookingSchema = new mongoose.Schema(
  {
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    moveInDate: { type: String, required: true, match: [/^\d{4}-\d{2}-\d{2}$/, 'moveInDate must be YYYY-MM-DD'] },
    durationMonths: { type: Number, required: true, min: 1, max: 36 },
    occupants: { type: Number, default: 1, min: 1, max: 4 },
    message: { type: String, default: '', trim: true, maxlength: 1000 },
    monthlyRent: { type: Number, required: true, min: 0 },
    deposit: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'cancelled', 'completed'],
      default: 'pending',
    },
    instant: { type: Boolean, default: false },
    respondedAt: { type: Date },
    cancelledBy: { type: String, enum: ['tenant', 'owner', 'system', ''], default: '' },
    statusReason: { type: String, default: '', trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

bookingSchema.index({ tenantId: 1, createdAt: -1 });
bookingSchema.index({ ownerId: 1, createdAt: -1 });
bookingSchema.index({ propertyId: 1, tenantId: 1, status: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
