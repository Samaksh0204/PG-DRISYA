const mongoose = require('mongoose');

const REPORT_REASONS = ['fake_listing', 'inaccurate', 'scam', 'harassment', 'unsafe', 'offensive', 'discrimination', 'other'];
const REPORT_TARGETS = ['listing', 'user', 'review', 'message'];

const reportSchema = new mongoose.Schema(
  {
    reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: { type: String, enum: REPORT_TARGETS, required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
    reason: { type: String, enum: REPORT_REASONS, required: true },
    details: { type: String, default: '', trim: true, maxlength: 1000 },
    status: { type: String, enum: ['open', 'resolved', 'dismissed'], default: 'open' },
    resolutionNote: { type: String, default: '', maxlength: 1000 },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ reporterId: 1, targetType: 1, targetId: 1 });

module.exports = mongoose.model('Report', reportSchema);
module.exports.REPORT_REASONS = REPORT_REASONS;
module.exports.REPORT_TARGETS = REPORT_TARGETS;
