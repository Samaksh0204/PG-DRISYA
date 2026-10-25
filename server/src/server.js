require('dotenv').config();

// Optional DNS override (only for networks that block Atlas SRV lookups).
if (process.env.DNS_SERVERS) {
  require('dns').setServers(process.env.DNS_SERVERS.split(',').map((s) => s.trim()).filter(Boolean));
}

const mongoose = require('mongoose');
const { validateEnv } = require('./config/env');

const { errors, warnings } = validateEnv(process.env);
warnings.forEach((w) => console.warn(`[config] ${w}`));
if (errors.length) {
  errors.forEach((e) => console.error(`[config] ${e}`));
  console.error('Fix the settings above (see server/.env.example) and restart.');
  process.exit(1);
}

const connectDB = require('./config/db');
const { createApp } = require('./app');

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  const server = createApp().listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
  });

  // Graceful shutdown so in-flight requests finish during deploys/restarts.
  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down...`);
    server.close(() => {
      mongoose.connection.close(false).finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled promise rejection:', err);
});
