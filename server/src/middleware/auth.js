const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function resolveUser(req) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return { error: 'No token provided' };
  const token = header.slice(7);
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return { error: 'Invalid or expired token' };
  }
  const user = await User.findById(decoded.id).select('-password');
  if (!user) return { error: 'User not found' };
  // Tokens issued before a password change/reset are rejected.
  if ((decoded.tv || 0) !== (user.tokenVersion || 0)) return { error: 'Session expired. Please log in again.' };
  if (user.suspended) return { error: 'This account has been suspended. Contact support.', status: 403 };
  return { user };
}

const auth = async (req, res, next) => {
  try {
    const { user, error, status } = await resolveUser(req);
    if (error) return res.status(status || 401).json({ message: error });
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
  if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'Access denied' });
  next();
};

const optionalAuth = async (req, _res, next) => {
  try {
    const { user } = await resolveUser(req);
    if (user) req.user = user;
  } catch {
    /* treat as anonymous */
  }
  next();
};

module.exports = { auth, requireRole, optionalAuth };
