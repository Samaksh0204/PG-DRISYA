// Explicit response shapes. Routes send these instead of raw Mongoose documents so
// a new schema field never leaks to the public by accident.

// ~1.1 km grid. Public maps show the area, not the building.
const APPROX_DECIMALS = 2;
const roundCoord = (n) => (typeof n === 'number' && n !== 0 ? Number(n.toFixed(APPROX_DECIMALS)) : 0);

const PUBLIC_PROPERTY_FIELDS = [
  'title', 'description', 'city', 'locality', 'genderPreference', 'occupancy', 'price', 'deposit', 'amenities',
  'photos', 'rules', 'rating', 'reviewCount', 'featured', 'instantBook', 'verified', 'status', 'moveInDate',
  'distanceFromLandmark', 'virtualTour', 'views', 'roomsAvailable', 'createdAt', 'updatedAt',
];

const idOf = (v) => (v && typeof v === 'object' && v._id ? v._id : v);

// What anyone may see. `exact` is set only for the owner, admins and tenants with a
// confirmed visit or accepted booking at this property.
function publicProperty(p, { exact = false } = {}) {
  if (!p) return null;
  const doc = typeof p.toObject === 'function' ? p.toObject() : p;
  const out = { _id: doc._id, ownerId: idOf(doc.ownerId) };
  for (const k of PUBLIC_PROPERTY_FIELDS) if (doc[k] !== undefined) out[k] = doc[k];
  out.lat = exact ? doc.lat || 0 : roundCoord(doc.lat);
  out.lng = exact ? doc.lng || 0 : roundCoord(doc.lng);
  out.exactLocation = !!exact;
  return out;
}

// The owner (and admins) also see moderation details for their own listings.
function ownerProperty(p) {
  if (!p) return null;
  const doc = typeof p.toObject === 'function' ? p.toObject() : p;
  return { ...publicProperty(doc, { exact: true }), moderationNote: doc.moderationNote || '', approvedAt: doc.approvedAt || null };
}

// Contact details of the other party are shared only once a visit is confirmed or a
// booking accepted. Host numbers are never shared with tenants (in-app messages only).
function personForCounterparty(person, revealContact) {
  if (!person || typeof person !== 'object' || !person._id) return person;
  const doc = typeof person.toObject === 'function' ? person.toObject() : person;
  const out = { _id: doc._id, fullName: doc.fullName, avatar: doc.avatar || '' };
  if (doc.emailVerified !== undefined) out.emailVerified = !!doc.emailVerified;
  if (revealContact && doc.phone) out.phone = doc.phone;
  return out;
}

module.exports = { publicProperty, ownerProperty, personForCounterparty, roundCoord, PUBLIC_PROPERTY_FIELDS };
