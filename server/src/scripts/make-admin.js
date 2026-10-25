// Promote an existing account to admin:
//   npm run make-admin -- someone@example.com
require('dotenv').config();
if (process.env.DNS_SERVERS) require('dns').setServers(process.env.DNS_SERVERS.split(',').map((s) => s.trim()).filter(Boolean));
const mongoose = require('mongoose');
const User = require('../models/User');
const { connectMongo } = require('../config/db');

(async () => {
  const email = (process.argv[2] || '').trim().toLowerCase();
  if (!email) {
    console.error('Usage: npm run make-admin -- <email>');
    process.exit(1);
  }
  await connectMongo(process.env.MONGO_URI);
  const user = await User.findOneAndUpdate({ email }, { role: 'admin', $inc: { tokenVersion: 1 } }, { new: true });
  if (!user) {
    console.error(`No account found for ${email}. Sign up on the website first.`);
    process.exit(1);
  }
  console.log(`${user.fullName} <${user.email}> is now an admin. They must log in again.`);
  await mongoose.disconnect();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
