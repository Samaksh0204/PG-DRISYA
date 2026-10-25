const dns = require('dns');
const mongoose = require('mongoose');

const PUBLIC_DNS = ['8.8.8.8', '1.1.1.1'];

// "mongodb+srv://" addresses need a DNS SRV lookup. On many Windows PCs and home
// routers Node.js can't do that lookup and fails with "querySrv ECONNREFUSED".
const isSrvLookupError = (err) =>
  /querySrv|ENOTFOUND _mongodb|ECONNREFUSED _mongodb/i.test(`${err && err.message}`) ||
  (err && err.syscall === 'querySrv');

// Connects to MongoDB. If the SRV lookup fails, retries once using public DNS
// (Google + Cloudflare), so it works without any extra setup.
async function connectMongo(uri = process.env.MONGO_URI) {
  try {
    return await mongoose.connect(uri);
  } catch (err) {
    if (!isSrvLookupError(err) || process.env.DNS_SERVERS) throw err;
    console.warn('[db] DNS lookup for MongoDB Atlas failed on this network; retrying with public DNS (8.8.8.8, 1.1.1.1)...');
    dns.setServers(PUBLIC_DNS);
    return mongoose.connect(uri);
  }
}

const connectDB = async () => {
  try {
    const conn = await connectMongo();
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    if (isSrvLookupError(err)) {
      console.error(
        'Could not look up your MongoDB Atlas address. Try one of these:\n' +
          '  1. Check your internet connection (and turn off any VPN or proxy).\n' +
          '  2. Add DNS_SERVERS=8.8.8.8,1.1.1.1 to server/.env\n' +
          '  3. In Atlas → Connect → Drivers, use the older connection string (starts with "mongodb://", not "mongodb+srv://").'
      );
    } else if (/authentication failed|bad auth/i.test(err.message)) {
      console.error('Wrong database username or password in MONGO_URI (if the password has @ : / or # in it, URL-encode those characters).');
    } else if (/whitelist|IP|timed out|Server selection/i.test(err.message)) {
      console.error('Atlas may be blocking your IP. In Atlas → Network Access, add your current IP address.');
    }
    process.exit(1);
  }
};

module.exports = connectDB;
module.exports.connectMongo = connectMongo;
module.exports.isSrvLookupError = isSrvLookupError;
