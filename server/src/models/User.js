const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    password: { type: String, required: true },
    phone: { type: String, default: '', trim: true, maxlength: 20 },
    role: { type: String, enum: ['tenant', 'owner', 'admin'], default: 'tenant' },
    avatar: { type: String, default: '', maxlength: 500 },
    city: { type: String, default: '', trim: true, maxlength: 80 },
    gender: { type: String, enum: ['male', 'female', 'other', ''], default: '' },
    bio: { type: String, default: '', maxlength: 1000 },
    college: { type: String, default: '', maxlength: 150 },
    budgetMin: { type: Number, default: 0, min: 0 },
    budgetMax: { type: Number, default: 0, min: 0 },
    preferredLocality: { type: String, default: '', maxlength: 150 },

    // "verified" = identity checked by a Drisya admin (manual review). Never set automatically.
    verified: { type: Boolean, default: false },
    subscriptionTier: { type: String, enum: ['free', 'starter', 'growth', 'elite'], default: 'free' },
    responseRate: { type: Number, default: 0 },
    responseTime: { type: String, default: 'within a day' },

    // Email verification
    emailVerified: { type: Boolean, default: false },
    emailVerifyTokenHash: { type: String, select: false },
    emailVerifyExpires: { type: Date, select: false },

    // Password reset
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },

    // Bumped to invalidate all existing JWTs (password change/reset, suspension).
    tokenVersion: { type: Number, default: 0 },
    acceptedTermsAt: { type: Date },
    lastLoginAt: { type: Date },

    // Moderation
    suspended: { type: Boolean, default: false },
    suspendedReason: { type: String, default: '' },

    // Aadhaar (simulated, only if AADHAAR_SIMULATION=true). Raw number never stored.
    aadhaarHash: { type: String, default: '', select: false },
    aadhaarLast4: { type: String, default: '' },
    aadhaarVerified: { type: Boolean, default: false },
    aadhaarVerificationMode: { type: String, enum: ['simulated', 'live'], default: 'simulated' },
  },
  { timestamps: true }
);

userSchema.index({ aadhaarHash: 1 }, { sparse: true });
userSchema.index({ passwordResetTokenHash: 1 }, { sparse: true });
userSchema.index({ emailVerifyTokenHash: 1 }, { sparse: true });

const defaultAvatar = (name) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=102A43&color=fff`;

// Private profile — only ever sent to the account owner.
userSchema.methods.toProfile = function () {
  return {
    id: this._id,
    fullName: this.fullName,
    email: this.email,
    phone: this.phone,
    role: this.role,
    avatar: this.avatar || defaultAvatar(this.fullName),
    city: this.city,
    gender: this.gender,
    bio: this.bio,
    college: this.college,
    budgetMin: this.budgetMin,
    budgetMax: this.budgetMax,
    preferredLocality: this.preferredLocality,
    verified: this.verified,
    emailVerified: this.emailVerified,
    subscriptionTier: this.subscriptionTier,
    responseRate: this.responseRate,
    responseTime: this.responseTime,
    aadhaarVerified: this.aadhaarVerified,
    aadhaarLast4: this.aadhaarLast4,
    aadhaarVerificationMode: this.aadhaarVerificationMode,
    createdAt: this.createdAt,
  };
};

// Public profile — safe to show anyone. No email/phone.
userSchema.methods.toPublicProfile = function () {
  return {
    id: this._id,
    fullName: this.fullName,
    role: this.role,
    avatar: this.avatar || defaultAvatar(this.fullName),
    city: this.city,
    bio: this.bio,
    verified: this.verified,
    responseRate: this.responseRate,
    responseTime: this.responseTime,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('User', userSchema);
