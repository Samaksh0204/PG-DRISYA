// Builds the Express app without starting a server or connecting to MongoDB,
// so tests can import it directly.
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const mongoose = require('mongoose');
const errorHandler = require('./middleware/errorHandler');
const { sanitize } = require('./middleware/sanitize');

function createApp() {
  const app = express();
  const isProd = process.env.NODE_ENV === 'production';

  app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS || 1));
  app.disable('x-powered-by');

  // Optional: serve the built website from the same server (single-service deploy).
  const clientDist = process.env.CLIENT_DIST ? path.resolve(process.env.CLIENT_DIST) : null;
  const servingClient = clientDist && fs.existsSync(path.join(clientDist, 'index.html'));

  app.use(
    helmet({
      contentSecurityPolicy: servingClient
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://unpkg.com'],
              fontSrc: ["'self'", 'https://fonts.gstatic.com'],
              imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
              connectSrc: ["'self'"],
              frameSrc: ['https://www.google.com', 'https://maps.google.com'],
              objectSrc: ["'none'"],
              baseUri: ["'self'"],
            },
          }
        : undefined,
      crossOriginEmbedderPolicy: false,
      // helmet's default "no-referrer" makes OpenStreetMap refuse map tiles ("Access
      // blocked"); its tile policy requires a Referer. Send only our origin, never paths.
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    })
  );

  // Cross-origin checks apply to the API only. The website's own files must always
  // load: browsers send an Origin header even for same-origin module scripts and
  // stylesheets, and rejecting those left a blank page when CORS_ORIGINS was unset.
  const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean);
  if (process.env.APP_URL) {
    try { allowedOrigins.push(new URL(process.env.APP_URL).origin); } catch { /* invalid APP_URL is reported at startup */ }
  }
  const corsMiddleware = cors((req, callback) => {
    const origin = req.headers.origin;
    // Same origin as this server (the site it serves itself), whatever its address.
    const host = req.headers.host;
    const sameOrigin = !!origin && !!host && (origin === `https://${host}` || origin === `http://${host}`);
    const allowed = !origin || sameOrigin || (!isProd && allowedOrigins.length === 0) || allowedOrigins.includes(origin);
    if (!allowed) return callback(new Error('Not allowed by CORS'));
    callback(null, { origin: true, credentials: true });
  });
  app.use('/api', corsMiddleware);

  // Gzip responses: listing JSON and the website's files get roughly 70-80% smaller.
  app.use(compression());
  // Keep the exact bytes of identity-provider webhooks so their signature can be checked.
  app.use(express.json({
    limit: '1mb',
    verify: (req, _res, buf) => {
      if (req.originalUrl.startsWith('/api/identity/webhook')) req.rawBody = Buffer.from(buf);
    },
  }));
  app.use(sanitize);

  app.get('/api/health', (_req, res) => {
    const dbUp = mongoose.connection.readyState === 1;
    res.status(dbUp ? 200 : 503).json({ status: dbUp ? 'ok' : 'degraded', db: dbUp ? 'up' : 'down', ts: Date.now() });
  });

  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/properties', require('./routes/properties'));
  app.use('/api/visits', require('./routes/visits'));
  app.use('/api/bookings', require('./routes/bookings'));
  app.use('/api/reviews', require('./routes/reviews'));
  app.use('/api/favorites', require('./routes/favorites'));
  app.use('/api/messages', require('./routes/messages'));
  app.use('/api/upload', require('./routes/upload'));
  app.use('/api/notifications', require('./routes/notifications'));
  app.use('/api/reports', require('./routes/reports'));
  app.use('/api/inquiries', require('./routes/inquiries'));
  app.use('/api/users', require('./routes/users'));
  app.use('/api/stats', require('./routes/stats'));
  app.use('/api/admin', require('./routes/admin'));
  app.use('/api/identity', require('./routes/identity'));
  app.use('/api/push', require('./routes/push'));

  app.use('/api', (_req, res) => res.status(404).json({ message: 'Route not found' }));

  if (servingClient) {
    // Built files in /assets have a content hash in their name, so browsers can keep
    // them for a year; index.html is always re-checked so new releases show up at once.
    app.use('/assets', express.static(path.join(clientDist, 'assets'), { maxAge: '1y', immutable: true, index: false }));
    app.use(express.static(clientDist, { maxAge: '1h', index: false }));
    app.get('*', (_req, res) => {
      res.set('Cache-Control', 'no-cache');
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  } else {
    app.use((_req, res) => res.status(404).json({ message: 'Route not found' }));
  }

  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
