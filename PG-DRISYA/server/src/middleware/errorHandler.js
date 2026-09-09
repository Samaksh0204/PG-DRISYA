const AppError = require('../utils/AppError');

// Central error handler. Always logs the full error server-side.
// Only sends the real message to the client for "expected"/operational
// errors (AppError, validation, cast, duplicate-key). Anything else is an
// unexpected server error and gets a generic message so we never leak
// stack traces, DB details, or internal paths to the client.
const errorHandler = (err, req, res, _next) => {
  console.error(`[${req.method} ${req.originalUrl}]`, err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ message: err.message });
  }

  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors)
      .map((e) => e.message)
      .join(', ');
    return res.status(400).json({ message });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({ message: `Invalid ${err.path}` });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return res.status(400).json({ message: `${field} already in use` });
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Request payload too large' });
  }

  if (err.name === 'MulterError') {
    const messages = {
      LIMIT_FILE_SIZE: 'Image must be smaller than 5MB',
      LIMIT_FILE_COUNT: 'Too many images — max 10 per upload',
      LIMIT_UNEXPECTED_FILE: 'Unexpected file field',
    };
    return res.status(400).json({ message: messages[err.code] || 'Upload error' });
  }

  // Unknown/unexpected error — never leak internals to the client.
  const isDev = process.env.NODE_ENV !== 'production';
  return res.status(500).json({
    message: isDev ? err.message : 'Something went wrong. Please try again.',
  });
};

module.exports = errorHandler;
