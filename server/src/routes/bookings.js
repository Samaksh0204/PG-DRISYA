const express = require('express');
const Booking = require('../models/Booking');
const Property = require('../models/Property');
const User = require('../models/User');
const { auth, requireRole } = require('../middleware/auth');
const { writeLimiter } = require('../middleware/rateLimiters');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { notify } = require('../utils/notify');
const { sendMail } = require('../utils/mailer');
const { appUrl } = require('../config/env');
const { isObjectId, isISODate, daysFromToday } = require('../utils/validators');

const { personForCounterparty } = require('../utils/serializers');

const router = express.Router();
const MAX_DAYS_AHEAD = 180;

// Who may move a booking from one status to another.
const TRANSITIONS = {
  pending: { accepted: 'owner', declined: 'owner', cancelled: 'either' },
  accepted: { cancelled: 'either', completed: 'owner' },
  declined: {},
  cancelled: {},
  completed: {},
};

async function emailUser(userId, subject, text, path) {
  const u = await User.findById(userId).select('email fullName');
  if (u) await sendMail({ to: u.email, subject, text: `Hi ${u.fullName},\n\n${text}`, actionUrl: `${appUrl()}/#${path}`, actionLabel: 'View booking' });
}

// Atomically take one room; returns false if none left.
async function reserveRoom(propertyId) {
  const r = await Property.updateOne({ _id: propertyId, roomsAvailable: { $gt: 0 } }, { $inc: { roomsAvailable: -1 } });
  return r.modifiedCount === 1;
}
const releaseRoom = (propertyId) => Property.updateOne({ _id: propertyId }, { $inc: { roomsAvailable: 1 } });

// POST /api/bookings — request to book (or instant book)
router.post(
  '/',
  auth,
  writeLimiter,
  asyncHandler(async (req, res) => {
    const { propertyId, moveInDate, durationMonths, occupants = 1, message = '' } = req.body;
    // Owners only receive requests from people with a confirmed email (like Airbnb).
    if (!req.user.emailVerified) throw new AppError('Please confirm your email address before requesting a booking', 403);
    if (!isObjectId(propertyId)) throw new AppError('A valid propertyId is required', 400);
    if (!isISODate(moveInDate)) throw new AppError('moveInDate must be a valid YYYY-MM-DD date', 400);
    const days = daysFromToday(moveInDate);
    if (days < 0) throw new AppError('Move-in date cannot be in the past', 400);
    if (days > MAX_DAYS_AHEAD) throw new AppError(`Move-in date must be within ${MAX_DAYS_AHEAD} days`, 400);
    const months = Number(durationMonths);
    if (!Number.isInteger(months) || months < 1 || months > 36) throw new AppError('durationMonths must be a whole number from 1 to 36', 400);
    const occ = Number(occupants);
    if (!Number.isInteger(occ) || occ < 1 || occ > 4) throw new AppError('occupants must be from 1 to 4', 400);
    if (typeof message !== 'string' || message.length > 1000) throw new AppError('message must be at most 1000 characters', 400);

    const property = await Property.findById(propertyId);
    if (!property || property.status !== 'active') throw new AppError('Property not found', 404);
    if (property.ownerId.equals(req.user._id)) throw new AppError('You cannot book your own property', 400);
    if (property.roomsAvailable < 1) throw new AppError('No rooms are available right now', 409);

    const open = await Booking.exists({ propertyId, tenantId: req.user._id, status: { $in: ['pending', 'accepted'] } });
    if (open) throw new AppError('You already have an active booking request for this property', 409);

    let status = 'pending';
    let instant = false;
    if (property.instantBook && (await reserveRoom(property._id))) {
      status = 'accepted';
      instant = true;
    }

    const booking = await Booking.create({
      propertyId,
      tenantId: req.user._id,
      ownerId: property.ownerId,
      moveInDate,
      durationMonths: months,
      occupants: occ,
      message: message.trim(),
      monthlyRent: property.price,
      deposit: property.deposit,
      status,
      instant,
      respondedAt: instant ? new Date() : undefined,
    });

    if (instant) {
      await notify(property.ownerId, 'New instant booking', `${req.user.fullName} booked "${property.title}" from ${moveInDate} (${months} month${months > 1 ? 's' : ''}).`, 'booking', { bookingId: booking._id, propertyId });
      await notify(req.user._id, 'Booking confirmed', `Your booking at "${property.title}" from ${moveInDate} is confirmed.`, 'booking', { bookingId: booking._id, propertyId });
      await emailUser(property.ownerId, 'New instant booking', `${req.user.fullName} booked "${property.title}" from ${moveInDate}.`, '/owner');
    } else {
      await notify(property.ownerId, 'New booking request', `${req.user.fullName} wants to book "${property.title}" from ${moveInDate} (${months} month${months > 1 ? 's' : ''}).`, 'booking', { bookingId: booking._id, propertyId });
      await emailUser(property.ownerId, 'New booking request', `${req.user.fullName} wants to book "${property.title}" from ${moveInDate}. Please accept or decline within 24 hours.`, '/owner');
    }
    res.status(201).json({ booking });
  })
);

// GET /api/bookings/mine — tenant's bookings
router.get(
  '/mine',
  auth,
  asyncHandler(async (req, res) => {
    const bookings = await Booking.find({ tenantId: req.user._id })
      .populate('propertyId', 'title city locality photos price status')
      .sort({ createdAt: -1 })
      .limit(200);
    res.json({ bookings });
  })
);

// GET /api/bookings/owner — booking requests for my listings
router.get(
  '/owner',
  auth,
  requireRole('owner', 'admin'),
  asyncHandler(async (req, res) => {
    const bookings = await Booking.find({ ownerId: req.user._id })
      .populate('propertyId', 'title city locality photos price roomsAvailable')
      .populate('tenantId', 'fullName avatar phone emailVerified')
      .sort({ createdAt: -1 })
      .limit(200);
    // The tenant's phone is shared with the host only once the booking is accepted.
    res.json({
      bookings: bookings.map((b) => {
        const o = b.toObject();
        o.tenantId = personForCounterparty(o.tenantId, ['accepted', 'completed'].includes(b.status));
        return o;
      }),
    });
  })
);

// PUT /api/bookings/:id/status — accept / decline / cancel / complete
router.put(
  '/:id/status',
  auth,
  writeLimiter,
  asyncHandler(async (req, res) => {
    const { status, reason = '' } = req.body;
    if (!isObjectId(req.params.id)) throw new AppError('Invalid booking ID', 400);
    if (typeof reason !== 'string' || reason.length > 500) throw new AppError('reason must be at most 500 characters', 400);
    const booking = await Booking.findById(req.params.id);
    if (!booking) throw new AppError('Booking not found', 404);

    const isOwner = booking.ownerId.equals(req.user._id);
    const isTenant = booking.tenantId.equals(req.user._id);
    if (!isOwner && !isTenant) throw new AppError('Booking not found', 404);

    const who = TRANSITIONS[booking.status][status];
    if (!who) throw new AppError(`A ${booking.status} booking cannot be changed to ${status}`, 400);
    if (who === 'owner' && !isOwner) throw new AppError('Only the owner can do this', 403);
    if (status === 'completed' && daysFromToday(booking.moveInDate) > 0) {
      throw new AppError('A booking can only be completed after the move-in date', 400);
    }

    const prev = booking.status;
    if (status === 'accepted' && !(await reserveRoom(booking.propertyId))) {
      throw new AppError('No rooms are available. Update rooms available on the listing first.', 409);
    }
    if (status === 'cancelled' && prev === 'accepted') await releaseRoom(booking.propertyId);

    booking.status = status;
    booking.statusReason = reason.trim();
    if (['accepted', 'declined'].includes(status)) booking.respondedAt = new Date();
    if (status === 'cancelled') booking.cancelledBy = isOwner ? 'owner' : 'tenant';
    await booking.save();

    const property = await Property.findById(booking.propertyId).select('title');
    const title = property?.title || 'the property';
    const reasonText = booking.statusReason ? ` Reason: ${booking.statusReason}` : '';
    if (isOwner) {
      const msg = `Your booking at "${title}" from ${booking.moveInDate} was ${status}.${reasonText}`;
      await notify(booking.tenantId, `Booking ${status}`, msg, 'booking', { bookingId: booking._id, propertyId: booking.propertyId });
      if (status !== 'completed') await emailUser(booking.tenantId, `Booking ${status}`, msg, '/dashboard');
    } else {
      const msg = `The booking at "${title}" from ${booking.moveInDate} was cancelled by the tenant.${reasonText}`;
      await notify(booking.ownerId, 'Booking cancelled', msg, 'booking', { bookingId: booking._id, propertyId: booking.propertyId });
      await emailUser(booking.ownerId, 'Booking cancelled', msg, '/owner');
    }
    res.json({ booking });
  })
);

module.exports = router;
