// Demo data for local development. WIPES the database. Blocked in production
// unless ALLOW_SEED=true. All demo accounts use the password: password123
require('dotenv').config();
if (process.env.DNS_SERVERS) require('dns').setServers(process.env.DNS_SERVERS.split(',').map((s) => s.trim()).filter(Boolean));
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Property = require('../models/Property');
const Review = require('../models/Review');
const Notification = require('../models/Notification');
const Booking = require('../models/Booking');
const Visit = require('../models/Visit');
const Favorite = require('../models/Favorite');
const Message = require('../models/Message');
const Report = require('../models/Report');
const Inquiry = require('../models/Inquiry');
const { recomputePropertyRating } = require('../services/ratings');
const { connectMongo } = require('../config/db');

const photo = (id, w = 1200) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;

const daysAgo = (n) => {
  const d = new Date(Date.now() + 5.5 * 3600 * 1000 - n * 86400000);
  return d.toISOString().slice(0, 10);
};

async function seed({ disconnect = true } = {}) {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SEED !== 'true') {
    throw new Error('Refusing to seed in production (this wipes data). Set ALLOW_SEED=true to override.');
  }
  if (mongoose.connection.readyState !== 1) await connectMongo(process.env.MONGO_URI);

  await Promise.all([User, Property, Review, Notification, Booking, Visit, Favorite, Message, Report, Inquiry].map((M) => M.deleteMany({})));

  const password = await bcrypt.hash('password123', 10);
  const base = { password, emailVerified: true, acceptedTermsAt: new Date() };
  const [tenant1, tenant2, owner1, owner2] = await User.create([
    { ...base, fullName: 'Priya Menon', email: 'priya@example.com', phone: '9876543210', role: 'tenant', city: 'Indore', gender: 'female', college: 'DAVV' },
    { ...base, fullName: 'Rohit Gupta', email: 'rohit@example.com', phone: '9876543211', role: 'tenant', city: 'Indore', gender: 'male', college: 'IIT Indore' },
    { ...base, fullName: 'Anjali Sharma', email: 'anjali@example.com', phone: '9876543212', role: 'owner', city: 'Indore', verified: true, responseRate: 98, responseTime: 'within an hour' },
    { ...base, fullName: 'Vikram Patel', email: 'vikram@example.com', phone: '9876543213', role: 'owner', city: 'Bhopal', responseRate: 90, responseTime: 'within a few hours' },
    { ...base, fullName: 'Admin User', email: 'admin@example.com', role: 'admin' },
  ]);

  const live = { status: 'active', approvedAt: new Date() };
  const properties = await Property.create([
    { ...live, ownerId: owner1._id, title: 'Sunshine Girls PG - Vijay Nagar', description: 'Girls PG with home-style food, 24x7 CCTV and AC rooms. Close to coaching centres and C21 Mall.', city: 'Indore', locality: 'Vijay Nagar', lat: 22.7533, lng: 75.8937, genderPreference: 'female', occupancy: 'double', price: 8500, deposit: 15000, amenities: ['wifi', 'mess', 'ac', 'laundry', 'cctv', 'power', 'hotwater', 'study', 'housekeeping'], photos: [photo(1571460), photo(1522771), photo(2462015), photo(1595526)], rules: ['No visitors after 9 PM', 'Gate closes at 10:30 PM', 'No smoking or alcohol'], featured: true, verified: true, instantBook: true, distanceFromLandmark: '1.2 km from C21 Mall', roomsAvailable: 3 },
    { ...live, ownerId: owner1._id, title: 'Green Valley Co-ed Hostel', description: 'Modern co-ed accommodation with gym, common kitchen and rooftop terrace. Ideal for working professionals.', city: 'Indore', locality: 'Palasia', lat: 22.7244, lng: 75.8839, genderPreference: 'coed', occupancy: 'single', price: 12000, deposit: 20000, amenities: ['wifi', 'ac', 'laundry', 'cctv', 'power', 'parking', 'hotwater', 'kitchen', 'gym'], photos: [photo(2724749), photo(1643383), photo(2029698), photo(2089698)], rules: ['Quiet hours 11 PM - 7 AM'], featured: true, distanceFromLandmark: '0.5 km from Palasia Square', roomsAvailable: 5 },
    { ...live, ownerId: owner2._id, title: 'Royal Boys PG - MP Nagar', description: 'Spacious boys PG with good mess food, study room and quick access to MP Nagar offices.', city: 'Bhopal', locality: 'MP Nagar', lat: 23.2332, lng: 77.4343, genderPreference: 'male', occupancy: 'triple', price: 5500, deposit: 8000, amenities: ['wifi', 'mess', 'laundry', 'cctv', 'power', 'hotwater', 'study', 'tv'], photos: [photo(2029670), photo(3773575), photo(2062431), photo(1457842)], rules: ['Gate closes at 11 PM', 'No smoking inside rooms'], distanceFromLandmark: '0.8 km from DB Mall', roomsAvailable: 4 },
    { ...live, ownerId: owner2._id, title: 'Comfort Zone Girls Hostel', description: 'Safe and affordable girls hostel with homely meals, attached washrooms and CCTV.', city: 'Bhopal', locality: 'Arera Colony', lat: 23.2153, lng: 77.4335, genderPreference: 'female', occupancy: 'double', price: 6000, deposit: 10000, amenities: ['wifi', 'mess', 'cctv', 'power', 'hotwater', 'geyser', 'wardrobe', 'housekeeping'], photos: [photo(2082087), photo(2440471), photo(3935333), photo(6489083)], featured: true, roomsAvailable: 2 },
    { ...live, ownerId: owner1._id, title: 'Student Hub PG - Bhawarkua', description: 'Budget student PG near DAVV with a study-friendly environment.', city: 'Indore', locality: 'Bhawarkua', lat: 22.6936, lng: 75.8676, genderPreference: 'coed', occupancy: 'triple', price: 5000, deposit: 8000, amenities: ['wifi', 'mess', 'power', 'hotwater', 'study'], photos: [photo(2079246), photo(2029731), photo(2459), photo(271624)], roomsAvailable: 8 },
    { ownerId: owner2._id, status: 'pending_review', title: 'Lakeview Residency (awaiting review)', description: 'New listing waiting for admin approval — use the admin account to approve it.', city: 'Bhopal', locality: 'Shyamla Hills', genderPreference: 'coed', occupancy: 'single', price: 11000, deposit: 20000, amenities: ['wifi', 'ac'], photos: [photo(2102587)], roomsAvailable: 2 },
  ]);

  // Real history: completed stays → verified reviews (ratings are computed, not invented).
  const stays = [
    [tenant1, properties[0], 5, 'Clean rooms, great food and very safe. The owner responds quickly.'],
    [tenant2, properties[0], 4, 'Good value for money. Wi-Fi could be faster in the evenings.'],
    [tenant2, properties[2], 4, 'Mess food is good and the study room is quiet.'],
    [tenant1, properties[3], 5, 'Felt at home from day one. Very helpful warden.'],
  ];
  for (const [t, p, rating, text] of stays) {
    await Booking.create({ propertyId: p._id, tenantId: t._id, ownerId: p.ownerId, moveInDate: daysAgo(120), durationMonths: 3, monthlyRent: p.price, deposit: p.deposit, status: 'completed', respondedAt: new Date() });
    await Review.create({ propertyId: p._id, userId: t._id, rating, text, verifiedStay: true });
  }
  for (const p of properties) await recomputePropertyRating(p._id);

  await Notification.create([
    { userId: tenant1._id, title: 'Welcome to PG Drisya!', body: 'Start browsing PGs near you.', type: 'system' },
    { userId: tenant2._id, title: 'Welcome to PG Drisya!', body: 'Start browsing PGs near you.', type: 'system' },
  ]);

  console.log('Seed complete. Demo accounts (password: password123):');
  console.log('  Tenant: priya@example.com, rohit@example.com');
  console.log('  Owner:  anjali@example.com, vikram@example.com');
  console.log('  Admin:  admin@example.com');
  if (disconnect) await mongoose.disconnect();
  return { tenant1, tenant2, owner1, owner2, properties };
}

if (require.main === module) {
  seed().catch((err) => {
    console.error('Seed error:', err.message);
    process.exit(1);
  });
}

module.exports = { seed };
