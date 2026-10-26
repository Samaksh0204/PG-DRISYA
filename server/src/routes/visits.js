const express = require('express');
const Visit = require('../models/Visit');
const Property = require('../models/Property');
const { auth, requireRole } = require('../middleware/auth');
const { writeLimiter } = require('../middleware/rateLimiters');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { notify } = require('../utils/notify');
const { isObjectId, isISODate, daysFromToday } = require('../utils/validators');

const { personForCounterparty } = require('../utils/serializers');

const { track } = require('../utils/analytics');

const router = express.Router();

const TIME_SLOT_RE = /^(0[1-9]|1[0-2]):[0-5]\d (AM|PM)$/;
const MAX_DAYS_AHEAD = 60;

// Allowed transitions. Terminal states can't be reopened.
const TRANSITIONS = {
  pending: ['confirmed', 'rejected', 'cancelled'],
  confirmed: ['completed', 'cancelled'],
  rejected: [],
  cancelled: [],
  completed: [],
};

router.post(
  '/',
  auth,
  writeLimiter,
  asyncHandler(async (req, res) => {
    const { propertyId, date, timeSlot, message } = req.body;
    if (!isObjectId(propertyId)) throw new AppError('A valid propertyId is required', 400);
    if (!isISODate(date)) throw new AppError('date must be a valid YYYY-MM-DD date', 400);
    if (typeof timeSlot !== 'string' || !TIME_SLOT_RE.test(timeSlot)) throw new AppError('timeSlot must look like "10:00 AM"', 400);
    if (message !== undefined && (typeof message !== 'string' || message.length > 500)) {
      throw new AppError('message must be at most 500 characters', 400);
    }
    const days = daysFromToday(date);
    if (days < 0) throw new AppError('Visit date cannot be in the past', 400);
    if (days > MAX_DAYS_AHEAD) throw new AppError(`Visits can be booked up to ${MAX_DAYS_AHEAD} days ahead`, 400);

    const property = await Property.findById(propertyId);
    if (!property || property.status !== 'active') throw new AppError('Property not found', 404);
    if (property.ownerId.equals(req.user._id)) throw new AppError('You cannot book a visit to your own property', 400);

    const mine = await Visit.exists({ propertyId, tenantId: req.user._id, status: { $in: ['pending', 'confirmed'] } });
    if (mine) throw new AppError('You already have an upcoming visit for this property', 409);

    const clash = await Visit.exists({ propertyId, date, timeSlot, status: { $in: ['pending', 'confirmed'] } });
    if (clash) throw new AppError('That time slot is already booked. Please pick another.', 409);

    const visit = await Visit.create({
      propertyId,
      tenantId: req.user._id,
      ownerId: property.ownerId,
      date,
      timeSlot,
      message: (message || '').trim(),
    });

    await notify(
      property.ownerId,
      'New visit request',
      `${req.user.fullName} requested a visit to "${property.title}" on ${date} at ${timeSlot}`,
      'visit',
      { propertyId: property._id, visitId: visit._id }
    );
    track(req, 'visit_requested', { propertyId: String(propertyId) });
    res.status(201).json({ visit });
  })
);

router.get(
  '/mine',
  auth,
  asyncHandler(async (req, res) => {
    const visits = await Visit.find({ tenantId: req.user._id })
      .populate('propertyId', 'title city locality photos price status')
      .sort({ date: -1, createdAt: -1 })
      .limit(200);
    res.json({ visits });
  })
);

router.get(
  '/owner',
  auth,
  requireRole('owner', 'admin'),
  asyncHandler(async (req, res) => {
    const visits = await Visit.find({ ownerId: req.user._id })
      .populate('propertyId', 'title city locality photos price')
      .populate('tenantId', 'fullName phone avatar')
      .sort({ date: -1, createdAt: -1 })
      .limit(200);
    // The tenant's phone is shared with the host only once the visit is confirmed.
    res.json({
      visits: visits.map((v) => {
        const o = v.toObject();
        o.tenantId = personForCounterparty(o.tenantId, ['confirmed', 'completed'].includes(v.status));
        return o;
      }),
    });
  })
);

router.put(
  '/:id/status',
  auth,
  writeLimiter,
  asyncHandler(async (req, res) => {
    const { status } = req.body;
    const allowed = ['confirmed', 'rejected', 'cancelled', 'completed'];
    if (!allowed.includes(status)) throw new AppError(`Status must be one of: ${allowed.join(', ')}`, 400);
    if (!isObjectId(req.params.id)) throw new AppError('Invalid visit ID', 400);
    const visit = await Visit.findById(req.params.id);
    if (!visit) throw new AppError('Visit not found', 404);

    const isOwner = visit.ownerId.equals(req.user._id);
    const isTenant = visit.tenantId.equals(req.user._id);
    if (!isOwner && !isTenant) throw new AppError('Visit not found', 404);
    if (['confirmed', 'rejected', 'completed'].includes(status) && !isOwner) {
      throw new AppError('Only the owner can update this status', 403);
    }
    if (!TRANSITIONS[visit.status].includes(status)) {
      throw new AppError(`A ${visit.status} visit cannot be changed to ${status}`, 400);
    }
    if (status === 'completed' && daysFromToday(visit.date) > 0) {
      throw new AppError('A visit can only be marked completed on or after its date', 400);
    }

    visit.status = status;
    await visit.save();

    const property = await Property.findById(visit.propertyId).select('title');
    const title = property?.title || 'the property';
    if (isOwner) {
      await notify(visit.tenantId, `Visit ${status}`, `Your visit to "${title}" on ${visit.date} was ${status}.`, 'visit', { propertyId: visit.propertyId, visitId: visit._id });
    } else {
      await notify(visit.ownerId, 'Visit cancelled', `A visit to "${title}" on ${visit.date} was cancelled by the tenant.`, 'visit', { propertyId: visit.propertyId, visitId: visit._id });
    }
    res.json({ visit });
  })
);

module.exports = router;
