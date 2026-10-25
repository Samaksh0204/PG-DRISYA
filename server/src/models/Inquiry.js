const mongoose = require('mongoose');

// "Drisya Expert" assisted-search requests from the public website form.
const inquirySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, trim: true, lowercase: true, maxlength: 254, default: '' },
    phone: { type: String, trim: true, maxlength: 20, default: '' },
    city: { type: String, trim: true, maxlength: 80, default: '' },
    locality: { type: String, trim: true, maxlength: 120, default: '' },
    budget: { type: Number, min: 0, default: 0 },
    moveInDate: { type: String, default: '' },
    message: { type: String, trim: true, maxlength: 2000, default: '' },
    status: { type: String, enum: ['new', 'contacted', 'closed'], default: 'new' },
  },
  { timestamps: true }
);

inquirySchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Inquiry', inquirySchema);
