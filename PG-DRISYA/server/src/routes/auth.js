const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const generateToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

// One-way hash for Aadhaar numbers — we never store the raw number.
// A pepper (server-side secret) is mixed in so the hash can't be brute-forced
// offline even though Aadhaar numbers only have ~10^12 possible values.
const hashAadhaar = (number) =>
  crypto
    .createHmac('sha256', process.env.JWT_SECRET)
    .update(number)
    .digest('hex');

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { fullName, email, password, phone, role, city, gender } = req.body;
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: 'fullName, email, and password are required' });
    }
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ message: 'Please provide a valid email address' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(400).json({ message: 'Email already registered' });

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    const user = await User.create({
      fullName,
      email: email.toLowerCase(),
      password: hashed,
      phone: phone || '',
      role: role === 'owner' ? 'owner' : 'tenant',
      city: city || '',
      gender: gender || '',
    });

    const token = generateToken(user);
    res.status(201).json({ token, user: user.toProfile() });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: 'Invalid credentials' });

    const token = generateToken(user);
    res.json({ token, user: user.toProfile() });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  res.json({ user: req.user.toProfile() });
});

// PUT /api/auth/profile
router.put('/profile', auth, async (req, res, next) => {
  try {
    const allowed = ['fullName', 'phone', 'city', 'gender', 'bio', 'college', 'budgetMin', 'budgetMax', 'preferredLocality', 'avatar'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    }).select('-password');
    res.json({ user: user.toProfile() });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/change-password
router.post('/change-password', auth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({ message: 'New password must be different from current password' });
    }

    const user = await User.findById(req.user._id);
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return res.status(400).json({ message: 'Current password is incorrect' });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/verify-aadhaar
// NOTE: this is a SIMULATED verification (no real UIDAI/DigiLocker call).
// We never store the raw Aadhaar number — only a keyed hash (for duplicate
// detection) and the last 4 digits (for display).
router.post('/verify-aadhaar', auth, async (req, res, next) => {
  try {
    const { aadhaarNumber } = req.body;
    if (!aadhaarNumber || !/^\d{12}$/.test(aadhaarNumber)) {
      return res.status(400).json({ message: 'Valid 12-digit Aadhaar number is required' });
    }

    const aadhaarHash = hashAadhaar(aadhaarNumber);

    // Prevent the same Aadhaar number being used to verify multiple accounts.
    const duplicate = await User.findOne({
      aadhaarHash,
      _id: { $ne: req.user._id },
    }).select('_id');
    if (duplicate) {
      return res.status(400).json({ message: 'This Aadhaar number is already linked to another account' });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        aadhaarHash,
        aadhaarLast4: aadhaarNumber.slice(-4),
        aadhaarVerified: true,
        aadhaarVerificationMode: 'simulated',
        verified: true,
      },
      { new: true }
    ).select('-password');

    res.json({ verified: true, user: user.toProfile() });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
