const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    phone: { type: String, default: '' },
    role: { type: String, enum: ['tenant', 'owner', 'admin'], default: 'tenant' },
    avatar: { type: String, default: '' },
    city: { type: String, default: '' },
    gender: { type: String, enum: ['male', 'female', 'other', ''], default: '' },
    bio: { type: String, default: '' },
    college: { type: String, default: '' },
    budgetMin: { type: Number, default: 0 },
    budgetMax: { type: Number, default: 0 },
    preferredLocality: { type: String, default: '' },
    verified: { type: Boolean, default: false },
    subscriptionTier: { type: String, enum: ['free', 'starter', 'growth', 'elite'], default: 'free' },
    responseRate: { type: Number, default: 0 },
    responseTime: { type: String, default: 'within a day' },
    // Aadhaar verification — we never store the raw number.
    // aadhaarHash is a one-way hash used only to prevent duplicate registrations.
    // aadhaarLast4 is kept purely for display ("···· ···· 1234").
    aadhaarHash: { type: String, default: '', select: false },
    aadhaarLast4: { type: String, default: '' },
    aadhaarVerified: { type: Boolean, default: false },
    // Verification is currently simulated (no real UIDAI/DigiLocker integration).
    // Kept explicit so this is never confused with real government verification.
    aadhaarVerificationMode: { type: String, enum: ['simulated', 'live'], default: 'simulated' },
  },
  { timestamps: true }
);

userSchema.index({ aadhaarHash: 1 }, { sparse: true });

userSchema.methods.toProfile = function () {
  return {
    id: this._id,
    fullName: this.fullName,
    email: this.email,
    phone: this.phone,
    role: this.role,
    avatar: this.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(this.fullName)}&background=ff4d3d&color=fff`,
    city: this.city,
    gender: this.gender,
    bio: this.bio,
    college: this.college,
    verified: this.verified,
    subscriptionTier: this.subscriptionTier,
    responseRate: this.responseRate,
    responseTime: this.responseTime,
    aadhaarVerified: this.aadhaarVerified,
    aadhaarLast4: this.aadhaarLast4,
    aadhaarVerificationMode: this.aadhaarVerificationMode,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('User', userSchema);
