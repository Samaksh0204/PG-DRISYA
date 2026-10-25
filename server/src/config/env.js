// Central place for environment validation and feature flags.
// validateEnv() is pure (takes an env object) so it can be unit tested.

const REQUIRED = ['MONGO_URI', 'JWT_SECRET'];

function validateEnv(env = process.env) {
  const errors = [];
  const warnings = [];
  const isProd = env.NODE_ENV === 'production';

  for (const key of REQUIRED) {
    if (!env[key]) errors.push(`Missing required env var: ${key}`);
  }

  if (isProd) {
    if (env.JWT_SECRET && env.JWT_SECRET.length < 32) {
      errors.push('JWT_SECRET must be at least 32 characters in production.');
    }
    if (!env.CORS_ORIGINS && !env.CLIENT_DIST) {
      errors.push('CORS_ORIGINS must be set in production (comma-separated frontend origins).');
    }
    if (!env.APP_URL) {
      errors.push('APP_URL must be set in production (public URL of the website, used in email links).');
    }
    if (!env.AADHAAR_PEPPER && env.AADHAAR_SIMULATION === 'true') {
      errors.push('AADHAAR_PEPPER must be set when AADHAAR_SIMULATION=true.');
    }
    if (!env.SMTP_HOST) {
      warnings.push('SMTP_HOST is not set — password-reset and verification emails will NOT be sent.');
    }
    if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
      warnings.push('Cloudinary is not fully configured — photo uploads will fail.');
    }
  }

  return { errors, warnings };
}

const flags = {
  // New listings wait for admin approval unless explicitly turned off.
  moderationEnabled: () => process.env.LISTING_MODERATION !== 'false',
  // Simulated Aadhaar checks are OFF unless explicitly enabled (dev/demo only).
  aadhaarSimulation: () => process.env.AADHAAR_SIMULATION === 'true',
  isTest: () => process.env.NODE_ENV === 'test',
  isProd: () => process.env.NODE_ENV === 'production',
};

function appUrl() {
  return (process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '');
}

module.exports = { validateEnv, flags, appUrl };
