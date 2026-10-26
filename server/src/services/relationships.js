const Visit = require('../models/Visit');
const Booking = require('../models/Booking');

// Did this tenant actually stay (accepted/completed booking) at the property?
async function hasStayed(userId, propertyId) {
  return !!(await Booking.exists({ tenantId: userId, propertyId, status: { $in: ['accepted', 'completed'] } }));
}

// Has the tenant had a real interaction with the property (completed visit or a stay)?
// This is the bar for leaving a review — stops drive-by fake reviews.
async function canReviewProperty(userId, propertyId) {
  if (await hasStayed(userId, propertyId)) return true;
  return !!(await Visit.exists({ tenantId: userId, propertyId, status: 'completed' }));
}

// Exact map position of a listing: only for tenants whose visit to THIS property is
// confirmed, or whose booking here is accepted. Everyone else sees a ~1 km area.
async function canSeeExactLocation(viewer, propertyId) {
  if (!viewer) return false;
  if (viewer.role === 'admin') return true;
  const [visit, booking] = await Promise.all([
    Visit.exists({ tenantId: viewer._id, propertyId, status: { $in: ['confirmed', 'completed'] } }),
    Booking.exists({ tenantId: viewer._id, propertyId, status: { $in: ['accepted', 'completed'] } }),
  ]);
  return !!(visit || booking);
}

module.exports = { hasStayed, canReviewProperty, canSeeExactLocation };
