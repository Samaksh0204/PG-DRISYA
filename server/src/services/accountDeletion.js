const User = require('../models/User');
const Property = require('../models/Property');
const Favorite = require('../models/Favorite');
const Notification = require('../models/Notification');
const Visit = require('../models/Visit');
const Booking = require('../models/Booking');
const Report = require('../models/Report');
const Inquiry = require('../models/Inquiry');
const { notify } = require('../utils/notify');

// Permanently deletes an account (required by Google Play / App Store and the DPDP Act).
// - Personal profile, favorites, notifications and reports filed are deleted.
// - Their listings are soft-deleted (hidden everywhere).
// - Open visits/bookings are cancelled and the other party is told.
// - Reviews and messages stay (they belong to the other party's history) but show
//   as "Former member" because the author no longer exists.
async function deleteAccount(userId) {
  const user = await User.findById(userId);
  if (!user) return false;

  await Property.updateMany({ ownerId: user._id, status: { $ne: 'deleted' } }, { status: 'deleted' });

  const openVisits = await Visit.find({
    $or: [{ tenantId: user._id }, { ownerId: user._id }],
    status: { $in: ['pending', 'confirmed'] },
  });
  for (const v of openVisits) {
    v.status = 'cancelled';
    await v.save();
    const other = v.tenantId.equals(user._id) ? v.ownerId : v.tenantId;
    await notify(other, 'Visit cancelled', `A visit on ${v.date} was cancelled because the other account was closed.`, 'visit', { visitId: v._id });
  }

  const openBookings = await Booking.find({
    $or: [{ tenantId: user._id }, { ownerId: user._id }],
    status: { $in: ['pending', 'accepted'] },
  });
  for (const b of openBookings) {
    const wasAccepted = b.status === 'accepted';
    b.status = 'cancelled';
    b.cancelledBy = 'system';
    b.statusReason = 'Account closed';
    await b.save();
    if (wasAccepted && b.tenantId.equals(user._id)) {
      await Property.updateOne({ _id: b.propertyId }, { $inc: { roomsAvailable: 1 } });
    }
    const other = b.tenantId.equals(user._id) ? b.ownerId : b.tenantId;
    await notify(other, 'Booking cancelled', `A booking for ${b.moveInDate} was cancelled because the other account was closed.`, 'booking', { bookingId: b._id });
  }

  await Promise.all([
    Favorite.deleteMany({ userId: user._id }),
    Notification.deleteMany({ userId: user._id }),
    Report.deleteMany({ reporterId: user._id }),
    Inquiry.updateMany({ userId: user._id }, { $unset: { userId: 1 } }),
  ]);

  await User.deleteOne({ _id: user._id });
  return true;
}

module.exports = { deleteAccount };
