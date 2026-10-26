// Runs before every test file.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET_TEST || 'test-secret-that-is-long-enough-for-prod-0123456789';
process.env.APP_URL = 'http://localhost:5173';
process.env.CORS_ORIGINS = 'http://localhost:5173';
delete process.env.LISTING_MODERATION;
delete process.env.AADHAAR_SIMULATION;
delete process.env.SMTP_HOST;
delete process.env.CLIENT_DIST;
delete process.env.IDV_PROVIDER;
delete process.env.IDV_WEBHOOK_SECRET;
delete process.env.IDV_API_KEY;
delete process.env.IDV_API_BASE_URL;
