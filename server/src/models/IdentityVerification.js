const mongoose = require('mongoose');

// One row per verification attempt. Stores only what we need to track the attempt:
// the provider's session reference and an outcome. No Aadhaar number, OTP,
// biometric, document image or date of birth is ever stored here.
const identityVerificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    provider: { type: String, required: true, maxlength: 40 }, // e.g. "http", "mock", "manual", "simulation"
    method: { type: String, default: 'aadhaar', maxlength: 40 },
    providerRef: { type: String, default: '', maxlength: 200 }, // provider session / reference id
    redirectUrl: { type: String, default: '', maxlength: 2000 }, // provider-hosted consent page
    status: {
      type: String,
      enum: ['pending', 'verified', 'rejected', 'failed', 'cancelled', 'expired', 'revoked'],
      default: 'pending',
    },
    // Short machine-readable reason ("provider_error", "name_mismatch", …) — never raw provider payloads.
    reason: { type: String, default: '', maxlength: 200 },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

identityVerificationSchema.index({ userId: 1, createdAt: -1 });
identityVerificationSchema.index(
  { provider: 1, providerRef: 1 },
  { unique: true, partialFilterExpression: { providerRef: { $type: 'string', $gt: '' } } }
);

module.exports = mongoose.model('IdentityVerification', identityVerificationSchema);
