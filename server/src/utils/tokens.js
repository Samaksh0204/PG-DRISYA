const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// One-time tokens (password reset, email verification). Only the SHA-256 hash is
// stored, so a database leak doesn't hand out working reset links.
function createOneTimeToken() {
  const token = crypto.randomBytes(32).toString('hex');
  return { token, hash: hashToken(token) };
}

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

// JWT carries tokenVersion (tv). Bumping user.tokenVersion (password change/reset,
// account deletion, suspension) invalidates every previously issued token.
function signAuthToken(user) {
  return jwt.sign(
    { id: user._id.toString(), role: user.role, tv: user.tokenVersion || 0 },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

module.exports = { createOneTimeToken, hashToken, signAuthToken };
