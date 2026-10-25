// Boots the full stack for browser tests:
//   in-memory MongoDB → seed demo data → real Express API serving client/dist on :5055
// plus a small control server on :5056 (test-only, never part of the app) that can
// reseed the DB and read the emails the app "sent".
const path = require('path');
const http = require('http');

const serverDir = path.resolve(__dirname, '../../server');
const req = (m) => require(path.join(serverDir, 'node_modules', m));

process.env.NODE_ENV = 'test'; // captures emails, skips rate limits, fast hashing
process.env.JWT_SECRET = 'e2e-secret-e2e-secret-e2e-secret-123456';
process.env.APP_URL = 'http://localhost:5055';
process.env.CLIENT_DIST = path.resolve(__dirname, '../dist');
process.env.CORS_ORIGINS = 'http://localhost:5055';

(async () => {
  const { MongoMemoryServer } = req('mongodb-memory-server');
  const mongoose = req('mongoose');
  const mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri('pgdrisya_e2e');
  await mongoose.connect(process.env.MONGO_URI);

  const { seed } = require(path.join(serverDir, 'src/seed/seed'));
  const { outbox } = require(path.join(serverDir, 'src/utils/mailer'));
  const { createApp } = require(path.join(serverDir, 'src/app'));
  await seed({ disconnect: false });

  createApp().listen(5055, () => console.log('E2E app on http://localhost:5055'));

  http
    .createServer(async (r, res) => {
      res.setHeader('Content-Type', 'application/json');
      if (r.url === '/outbox') return res.end(JSON.stringify(outbox));
      if (r.url === '/reseed' && r.method === 'POST') {
        outbox.length = 0;
        await seed({ disconnect: false });
        return res.end('{"ok":true}');
      }
      res.statusCode = 404;
      res.end('{}');
    })
    .listen(5056);

  const stop = async () => { await mongoose.disconnect(); await mongod.stop(); process.exit(0); };
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
