const mongoose = require('mongoose');

// Security-sensitive actions (identity verification, moderation, suspensions,
// password changes). Never store secrets or identity numbers in `meta`.
const auditLogSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // null = system / provider webhook
    action: { type: String, required: true, maxlength: 80 },
    targetType: { type: String, maxlength: 40, default: '' },
    targetId: { type: String, maxlength: 64, default: '' },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    ipHash: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
auditLogSchema.index({ actorId: 1, createdAt: -1 });
// Keep one year of history.
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
