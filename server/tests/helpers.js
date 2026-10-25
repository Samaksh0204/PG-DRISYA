// Shared helpers for integration tests.
const fs = require('fs');
const os = require('os');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const request = require('supertest');
const { createApp } = require('../src/app');
const User = require('../src/models/User');
const Property = require('../src/models/Property');
const { signAuthToken } = require('../src/utils/tokens');
const { outbox } = require('../src/utils/mailer');
const { todayIST } = require('../src/utils/validators');

const app = createApp();
const api = () => request(app);

function mongoUri() {
  return process.env.TEST_MONGO_URI || fs.readFileSync(path.join(os.tmpdir(), 'pgdrisya-test-mongo-uri'), 'utf8');
}

// Each test file gets its own database so files can't interfere with each other.
async function connect(name) {
  const base = mongoUri().replace(/\/?(\?.*)?$/, '/');
  await mongoose.connect(`${base}pgdrisya_${name}_${process.pid}`);
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
}

async function clearDb() {
  outbox.length = 0;
  await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
}

async function disconnect() {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}

let counter = 0;
const PASSWORD = 'Password123';
const HASHED = bcrypt.hashSync(PASSWORD, 4);

async function makeUser(role = 'tenant', overrides = {}) {
  counter += 1;
  const user = await User.create({
    fullName: `${role} ${counter}`,
    email: `${role}${counter}_${Date.now()}@test.com`,
    password: HASHED,
    phone: `98765${String(counter).padStart(5, '0')}`,
    role,
    emailVerified: true,
    ...overrides,
  });
  return { user, token: signAuthToken(user), auth: { Authorization: `Bearer ${signAuthToken(user)}` } };
}

async function makeProperty(owner, overrides = {}) {
  return Property.create({
    ownerId: owner._id,
    title: 'Test PG',
    city: 'Indore',
    locality: 'Vijay Nagar',
    price: 8000,
    deposit: 10000,
    amenities: ['wifi', 'mess'],
    photos: ['https://example.com/a.jpg'],
    status: 'active',
    roomsAvailable: 2,
    ...overrides,
  });
}

// Date helper relative to today in IST.
function dateIn(days) {
  const d = new Date(`${todayIST()}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const tokenFromUrl = (url) => new URL(url.replace('/#/', '/')).searchParams.get('token');

module.exports = { app, api, connect, clearDb, disconnect, makeUser, makeProperty, dateIn, PASSWORD, outbox, tokenFromUrl };
