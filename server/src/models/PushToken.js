const mongoose = require('mongoose');

// One row per signed-in device. Removed on sign-out, account deletion, or when Expo
// reports the token is no longer valid (app uninstalled / notifications turned off).
const pushTokenSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    token: { type: String, required: true, maxlength: 200 },
    platform: { type: String, enum: ['ios', 'android', 'web', 'unknown'], default: 'unknown' },
  },
  { timestamps: true }
);

// A device belongs to whoever signed in on it last.
pushTokenSchema.index({ token: 1 }, { unique: true });
pushTokenSchema.index({ userId: 1 });

module.exports = mongoose.model('PushToken', pushTokenSchema);
