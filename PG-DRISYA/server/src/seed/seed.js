require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Property = require('../models/Property');
const Review = require('../models/Review');
const Notification = require('../models/Notification');

const photo = (id, w = 1200) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB for seeding...');

  await Promise.all([
    User.deleteMany({}),
    Property.deleteMany({}),
    Review.deleteMany({}),
    Notification.deleteMany({}),
  ]);
  console.log('Cleared existing data');

  const salt = await bcrypt.genSalt(10);
  const password = await bcrypt.hash('password123', salt);

  const [tenant1, tenant2, owner1, owner2, admin] = await User.create([
    { fullName: 'Priya Menon', email: 'priya@example.com', password, phone: '9876543210', role: 'tenant', city: 'Pune', gender: 'female', college: 'COEP Technological University' },
    { fullName: 'Rohit Gupta', email: 'rohit@example.com', password, phone: '9876543211', role: 'tenant', city: 'Indore', gender: 'male', college: 'IIT Indore' },
    { fullName: 'Anjali Sharma', email: 'anjali@example.com', password, phone: '9876543212', role: 'owner', city: 'Pune', verified: true, responseRate: 98, responseTime: 'within an hour', subscriptionTier: 'growth' },
    { fullName: 'Vikram Patel', email: 'vikram@example.com', password, phone: '9876543213', role: 'owner', city: 'Indore', verified: true, responseRate: 92, responseTime: 'within 2 hours', subscriptionTier: 'starter' },
    { fullName: 'Admin User', email: 'admin@pgdrisya.com', password, role: 'admin' },
  ]);
  console.log('Created users');

  const properties = await Property.create([
    {
      ownerId: owner1._id, title: 'Sunshine Girls PG - Kothrud', description: 'Premium girls PG near COEP with home-like food, 24x7 security, and AC rooms. Walking distance to MIT and Symbiosis.',
      city: 'Pune', locality: 'Kothrud', lat: 18.5074, lng: 73.8077, genderPreference: 'female', occupancy: 'double', price: 8500, deposit: 15000,
      amenities: ['wifi', 'mess', 'ac', 'laundry', 'cctv', 'power', 'hotwater', 'study', 'housekeeping'],
      photos: [photo(1571460), photo(1522771), photo(2462015), photo(1595526)],
      rules: ['No visitors after 9 PM', 'Gate closes at 10:30 PM', 'No smoking or alcohol'],
      rating: 4.6, reviewCount: 28, featured: true, verified: true, instantBook: true,
      distanceFromLandmark: '1.2 km from COEP', moveInDate: '2026-09-01', roomsAvailable: 3,
    },
    {
      ownerId: owner1._id, title: 'Green Valley Co-ed Hostel', description: 'Modern co-ed accommodation with gym, common kitchen, and rooftop terrace. Perfect for working professionals.',
      city: 'Pune', locality: 'Hinjewadi', lat: 18.5912, lng: 73.7390, genderPreference: 'coed', occupancy: 'single', price: 12000, deposit: 20000,
      amenities: ['wifi', 'ac', 'laundry', 'cctv', 'power', 'parking', 'hotwater', 'kitchen', 'gym'],
      photos: [photo(2724749), photo(1643383), photo(2029698), photo(2089698)],
      rating: 4.8, reviewCount: 42, featured: true, verified: true,
      distanceFromLandmark: '0.5 km from Hinjewadi IT Park', moveInDate: '2026-08-15', roomsAvailable: 5,
    },
    {
      ownerId: owner2._id, title: 'Royal Boys PG - Vijay Nagar', description: 'Spacious boys PG with excellent mess food, study room, and proximity to all major coaching centers.',
      city: 'Indore', locality: 'Vijay Nagar', lat: 22.7533, lng: 75.8937, genderPreference: 'male', occupancy: 'triple', price: 5500, deposit: 8000,
      amenities: ['wifi', 'mess', 'laundry', 'cctv', 'power', 'hotwater', 'study', 'tv'],
      photos: [photo(2029670), photo(3773575), photo(2062431), photo(1457842)],
      rules: ['Gate closes at 11 PM', 'No smoking inside rooms'],
      rating: 4.2, reviewCount: 15, verified: true, instantBook: true,
      distanceFromLandmark: '0.8 km from Brilliant Academy', moveInDate: '2026-08-01', roomsAvailable: 4,
    },
    {
      ownerId: owner2._id, title: 'Comfort Zone Girls Hostel', description: 'Safe and affordable girls hostel with homely meals, attached washrooms, and CCTV surveillance.',
      city: 'Indore', locality: 'Bhawarkua', lat: 22.7196, lng: 75.8577, genderPreference: 'female', occupancy: 'double', price: 6000, deposit: 10000,
      amenities: ['wifi', 'mess', 'cctv', 'power', 'hotwater', 'geyser', 'wardrobe', 'housekeeping'],
      photos: [photo(2082087), photo(2440471), photo(3935333), photo(6489083)],
      rating: 4.4, reviewCount: 22, featured: true, verified: true,
      distanceFromLandmark: '1.5 km from DAVV', moveInDate: '2026-09-01', roomsAvailable: 2,
    },
    {
      ownerId: owner1._id, title: 'Metro Living PG', description: 'Budget-friendly PG near Hinjewadi Phase 2. Ideal for IT professionals and interns.',
      city: 'Pune', locality: 'Wakad', lat: 18.5989, lng: 73.7612, genderPreference: 'male', occupancy: 'double', price: 7000, deposit: 12000,
      amenities: ['wifi', 'laundry', 'cctv', 'parking', 'hotwater', 'kitchen'],
      photos: [photo(2121120), photo(1743229), photo(2506990), photo(2251247)],
      rating: 4.0, reviewCount: 8, verified: true, instantBook: true,
      distanceFromLandmark: '2 km from Hinjewadi Phase 2', roomsAvailable: 6,
    },
    {
      ownerId: owner2._id, title: 'Lakeside Premium Residency', description: 'Luxury co-ed PG with swimming pool access, premium interiors, and chef-prepared meals.',
      city: 'Jaipur', locality: 'Mansarovar', lat: 26.8667, lng: 75.7601, genderPreference: 'coed', occupancy: 'single', price: 15000, deposit: 25000,
      amenities: ['wifi', 'mess', 'ac', 'laundry', 'cctv', 'power', 'parking', 'hotwater', 'gym', 'housekeeping'],
      photos: [photo(2102587), photo(2635038), photo(2631746), photo(1571468)],
      rating: 4.9, reviewCount: 35, featured: true, verified: true,
      distanceFromLandmark: '3 km from Manipal University', moveInDate: '2026-08-10', roomsAvailable: 2,
    },
    {
      ownerId: owner1._id, title: 'Student Hub PG - Aundh', description: 'Affordable student PG close to Pune University with study-friendly environment.',
      city: 'Pune', locality: 'Aundh', lat: 18.5590, lng: 73.8077, genderPreference: 'coed', occupancy: 'triple', price: 5000, deposit: 8000,
      amenities: ['wifi', 'mess', 'power', 'hotwater', 'study'],
      photos: [photo(2079246), photo(2029731), photo(2459), photo(271624)],
      rating: 3.8, reviewCount: 6, instantBook: true,
      distanceFromLandmark: '0.5 km from Pune University Gate', roomsAvailable: 8,
    },
    {
      ownerId: owner2._id, title: 'Heritage House PG', description: 'Charming PG in a heritage haveli with modern amenities and traditional Rajasthani meals.',
      city: 'Jaipur', locality: 'C-Scheme', lat: 26.9124, lng: 75.7873, genderPreference: 'female', occupancy: 'double', price: 9000, deposit: 15000,
      amenities: ['wifi', 'mess', 'ac', 'cctv', 'power', 'hotwater', 'laundry', 'wardrobe'],
      photos: [photo(3588564), photo(2417842), photo(2901209), photo(1450363)],
      rating: 4.5, reviewCount: 18, verified: true,
      distanceFromLandmark: '2 km from University of Rajasthan', roomsAvailable: 3,
    },
  ]);
  console.log(`Created ${properties.length} properties`);

  const reviews = [];
  for (const prop of properties) {
    if (prop.reviewCount > 0) {
      reviews.push(
        { propertyId: prop._id, userId: tenant1._id, rating: 5, text: 'Excellent place! Clean rooms, great food, and very safe environment. Highly recommended.', verifiedStay: true },
        { propertyId: prop._id, userId: tenant2._id, rating: 4, text: 'Good value for money. The amenities are as advertised. WiFi could be faster though.', verifiedStay: true },
      );
    }
  }
  await Review.create(reviews);
  console.log(`Created ${reviews.length} reviews`);

  // Create sample notifications
  await Notification.create([
    { userId: tenant1._id, title: 'Welcome to PG Drisya!', body: 'Start browsing verified PGs near you.', type: 'system' },
    { userId: tenant2._id, title: 'Welcome to PG Drisya!', body: 'Start browsing verified PGs near you.', type: 'system' },
    { userId: tenant1._id, title: 'New PG Added', body: '"Sunshine Girls PG" is now available in Pune', type: 'listing', data: { propertyId: properties[0]._id } },
  ]);
  console.log('Created notifications');

  console.log('\nSeed complete! Test accounts:');
  console.log('  Tenant: priya@example.com / password123');
  console.log('  Tenant: rohit@example.com / password123');
  console.log('  Owner:  anjali@example.com / password123');
  console.log('  Owner:  vikram@example.com / password123');
  console.log('  Admin:  admin@pgdrisya.com / password123');

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
