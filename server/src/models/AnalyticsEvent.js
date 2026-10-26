const mongoose = require('mongoose');

// First-party usage counts (searches, listing views, requests, messages, sign-ups).
// No names, emails, phone numbers or IP addresses: `actor` is a keyed hash of the
// user id, only good for counting unique people.
const analyticsEventSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, maxlength: 40 },
    platform: { type: String, enum: ['web', 'ios', 'android', 'unknown'], default: 'unknown' },
    actor: { type: String, default: '' },
    props: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

analyticsEventSchema.index({ name: 1, createdAt: -1 });
// Keep ~13 months so year-on-year comparisons work.
analyticsEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 400 * 24 * 60 * 60 });

module.exports = mongoose.model('AnalyticsEvent', analyticsEventSchema);
