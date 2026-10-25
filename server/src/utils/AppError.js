// AppError — use this for any "expected" error (bad input, not found, forbidden, etc.)
// where it's safe to send err.message straight to the client.
// Anything else (DB errors, unexpected exceptions) is logged server-side and
// answered with a generic message so internals never leak to the client.
class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

module.exports = AppError;
