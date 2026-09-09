require('dotenv').config();

const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/auth');
const propertyRoutes = require('./routes/properties');
const visitRoutes = require('./routes/visits');
const reviewRoutes = require('./routes/reviews');
const favoriteRoutes = require('./routes/favorites');
const messageRoutes = require('./routes/messages');
const uploadRoutes = require('./routes/upload');
const notificationRoutes = require('./routes/notifications');

const app = express();

// ── Security headers ─────────────────────────────
app.use(helmet());

// ── CORS — locked to known origins ────────────────
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin(origin, cb) {
      // allow server-to-server (no origin) and listed origins
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));

// ── Global rate limiter (100 req / 15 min per IP) ─
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many requests, please try again later' },
  })
);

// ── Stricter limiters for sensitive routes ─────────
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { message: 'Too many auth attempts' } });
const writeLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 40, message: { message: 'Write rate limit reached' } });
const uploadLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 15, message: { message: 'Upload rate limit reached' } });

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: Date.now() }));

// Routes (with per-group rate limits)
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/properties', propertyRoutes);          // reads are open; writes rate-limited inside route file
app.use('/api/visits', writeLimiter, visitRoutes);
app.use('/api/reviews', writeLimiter, reviewRoutes);
app.use('/api/favorites', writeLimiter, favoriteRoutes);
app.use('/api/messages', writeLimiter, messageRoutes);
app.use('/api/upload', uploadLimiter, uploadRoutes);
app.use('/api/notifications', notificationRoutes);

// 404 handler
app.use((_req, res) => res.status(404).json({ message: 'Route not found' }));

// Central error handler — logs full error server-side, sends safe message to client.
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
