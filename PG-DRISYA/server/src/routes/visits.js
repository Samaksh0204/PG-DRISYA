const express = require('express');
const Visit = require('../models/Visit');
const Property = require('../models/Property');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.post('/', auth, async (req, res, next) => {
  try {
    const { propertyId, date, timeSlot, message } = req.body;
    if (!propertyId || !date || !timeSlot) {
      return res.status(400).json({ message: 'propertyId, date, and timeSlot are required' });
    }
    const property = await Property.findById(propertyId);
    if (!property) return res.status(404).json({ message: 'Property not found' });

    const visit = await Visit.create({
      propertyId,
      tenantId: req.user._id,
      ownerId: property.ownerId,
      date,
      timeSlot,
      message: message || '',
    });
    res.status(201).json({ visit });
  } catch (err) {
    next(err);
  }
});

router.get('/mine', auth, async (req, res, next) => {
  try {
    const visits = await Visit.find({ tenantId: req.user._id })
      .populate('propertyId', 'title city locality photos price')
      .sort({ createdAt: -1 });
    res.json({ visits });
  } catch (err) {
    next(err);
  }
});

router.get('/owner', auth, requireRole('owner', 'admin'), async (req, res, next) => {
  try {
    const visits = await Visit.find({ ownerId: req.user._id })
      .populate('propertyId', 'title city locality photos price')
      .populate('tenantId', 'fullName email phone avatar')
      .sort({ createdAt: -1 });
    res.json({ visits });
  } catch (err) {
    next(err);
  }
});

router.put('/:id/status', auth, async (req, res, next) => {
  try {
    const { status } = req.body;
    const allowed = ['confirmed', 'rejected', 'cancelled', 'completed'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: `Status must be one of: ${allowed.join(', ')}` });
    }
    const visit = await Visit.findById(req.params.id);
    if (!visit) return res.status(404).json({ message: 'Visit not found' });

    const userId = req.user._id.toString();
    const isOwner = visit.ownerId.toString() === userId;
    const isTenant = visit.tenantId.toString() === userId;

    if ((status === 'confirmed' || status === 'rejected' || status === 'completed') && !isOwner) {
      return res.status(403).json({ message: 'Only the owner can update this status' });
    }
    if (status === 'cancelled' && !isTenant && !isOwner) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    visit.status = status;
    await visit.save();
    res.json({ visit });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
