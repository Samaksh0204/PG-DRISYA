const mongoose = require('mongoose');

const visitSchema = new mongoose.Schema(
  {
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true, match: [/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'] },
    timeSlot: { type: String, required: true },
    message: { type: String, default: '', maxlength: 500 },
    status: { type: String, enum: ['pending', 'confirmed', 'rejected', 'cancelled', 'completed'], default: 'pending' },
  },
  { timestamps: true }
);

visitSchema.index({ tenantId: 1, createdAt: -1 });
visitSchema.index({ ownerId: 1, createdAt: -1 });
visitSchema.index({ propertyId: 1, tenantId: 1, status: 1 });

module.exports = mongoose.model('Visit', visitSchema);
