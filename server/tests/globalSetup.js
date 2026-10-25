// Starts one in-memory MongoDB for the whole test run.
// mongodb-memory-server downloads a MongoDB binary on first run (cached afterwards).
// To use an existing mongod instead, set MONGOMS_SYSTEM_BINARY=/path/to/mongod.
const fs = require('fs');
const path = require('path');
const os = require('os');
const { MongoMemoryServer } = require('mongodb-memory-server');

module.exports = async () => {
  const mongod = await MongoMemoryServer.create();
  global.__MONGOD__ = mongod;
  const file = path.join(os.tmpdir(), 'pgdrisya-test-mongo-uri');
  fs.writeFileSync(file, mongod.getUri());
  process.env.TEST_MONGO_URI = mongod.getUri();
};
