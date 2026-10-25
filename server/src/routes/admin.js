const express = require('express');
const User = require('../models/User');
const Property = require('../models/Property');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const Report = require('../models/Report');
const Inquiry = require('../models/Inquiry');
const { auth, requireRole } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { notify } = require('../utils/notify');
const { sendMail } = require('../utils/mailer');
const { appUrl } = require('../config/env');
const { isObjectId, escapeRegex, parsePagination } = require('../utils/validators');
const { fanOutNewListing } = require('./properties');
const { recomputePropertyRating } = require('../services/ratings');

const router = express.Router();
router.use(auth, requireRole('admin'));

// GET /api/admin/stats
router.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    const [users, owners, activeListings, pendingListings, openReports, newInquiries, pendingBookings, reviews] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ role: 'owner' }),
      Property.countDocuments({ status: 'active' }),
      Property.countDocuments({ status: 'pending_review' }),
      Report.countDocuments({ status: 'open' }),
      Inquiry.countDocuments({ status: 'new' }),
      Booking.countDocuments({ status: 'pending' }),
      Review.countDocuments({}),
    ]);
    res.json({ users, owners, activeListings, pendingListings, openReports, newInquiries, pendingBookings, reviews });
  })
);

// GET /api/admin/listings?status=pending_review
router.get(
  '/listings',
  asyncHandler(async (req, res) => {
    const status = ['active', 'inactive', 'pending_review', 'rejected', 'deleted'].includes(req.query.status) ? req.query.status : 'pending_review';
    const filter = { status };
    if (req.query.q) filter.title = new RegExp(escapeRegex(String(req.query.q).slice(0, 100)), 'i');
    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 50 });
    const [listings, total] = await Promise.all([
      Property.find(filter).populate('ownerId', 'fullName email phone verified').sort({ createdAt: 1 }).skip(skip).limit(limit),
      Property.countDocuments(filter),
    ]);
    res.json({ listings, total, page, pages: Math.ceil(total / limit) });
  })
);

// PATCH /api/admin/listings/:id  { action, note }
router.patch(
  '/listings/:id',
  asyncHandler(async (req, res) => {
    const { action, note = '' } = req.body;
    const actions = ['approve', 'reject', 'verify', 'unverify', 'feature', 'unfeature', 'deactivate'];
    if (!actions.includes(action)) throw new AppError(`action must be one of: ${actions.join(', ')}`, 400);
    if (!isObjectId(req.params.id)) throw new AppError('Invalid listing ID', 400);
    if (typeof note !== 'string' || note.length > 1000) throw new AppError('note too long', 400);
    const property = await Property.findById(req.params.id);
    if (!property || property.status === 'deleted') throw new AppError('Listing not found', 404);

    const owner = await User.findById(property.ownerId).select('email fullName');
    const tellOwner = async (title, body) => {
      await notify(property.ownerId, title, body, 'listing', { propertyId: property._id });
      if (owner) await sendMail({ to: owner.email, subject: title, text: `Hi ${owner.fullName},\n\n${body}`, actionUrl: `${appUrl()}/#/owner`, actionLabel: 'Open dashboard' });
    };

    switch (action) {
      case 'approve': {
        const wasLive = property.status === 'active';
        property.status = 'active';
        property.moderationNote = '';
        property.approvedAt = new Date();
        await property.save();
        if (!wasLive) {
          await tellOwner('Your listing is live', `"${property.title}" was approved and is now visible to tenants.`);
          await fanOutNewListing(property);
        }
        break;
      }
      case 'reject':
        if (!note.trim()) throw new AppError('Please give the owner a reason', 400);
        property.status = 'rejected';
        property.moderationNote = note.trim();
        await property.save();
        await tellOwner('Your listing needs changes', `"${property.title}" was not approved. Reason: ${note.trim()}\nEdit the listing to resubmit it.`);
        break;
      case 'deactivate':
        property.status = 'inactive';
        property.moderationNote = note.trim();
        await property.save();
        await tellOwner('Your listing was paused by our team', `"${property.title}" was paused.${note.trim() ? ` Reason: ${note.trim()}` : ''}`);
        break;
      case 'verify':
      case 'unverify':
        property.verified = action === 'verify';
        await property.save();
        if (property.verified) await tellOwner('Your listing is Drisya Verified', `"${property.title}" passed our inspection and now shows the Verified badge.`);
        break;
      case 'feature':
      case 'unfeature':
        property.featured = action === 'feature';
        await property.save();
        break;
      default:
        break;
    }
    res.json({ listing: property });
  })
);

// GET /api/admin/users?q=
router.get(
  '/users',
  asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.q) {
      const rx = new RegExp(escapeRegex(String(req.query.q).slice(0, 100)), 'i');
      filter.$or = [{ fullName: rx }, { email: rx }];
    }
    if (['tenant', 'owner', 'admin'].includes(req.query.role)) filter.role = req.query.role;
    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 50 });
    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);
    res.json({ users: users.map((u) => ({ ...u.toProfile(), suspended: u.suspended, suspendedReason: u.suspendedReason, lastLoginAt: u.lastLoginAt })), total, page, pages: Math.ceil(total / limit) });
  })
);

// PATCH /api/admin/users/:id  { suspended?, reason?, verified?, role? }
router.patch(
  '/users/:id',
  asyncHandler(async (req, res) => {
    if (!isObjectId(req.params.id)) throw new AppError('Invalid user ID', 400);
    if (req.params.id === req.user._id.toString()) throw new AppError('You cannot change your own admin account here', 400);
    const user = await User.findById(req.params.id);
    if (!user) throw new AppError('User not found', 404);
    const { suspended, reason = '', verified, role } = req.body;

    if (typeof suspended === 'boolean') {
      user.suspended = suspended;
      user.suspendedReason = suspended ? String(reason).slice(0, 500) : '';
      if (suspended) {
        user.tokenVersion = (user.tokenVersion || 0) + 1; // force logout everywhere
        await Property.updateMany({ ownerId: user._id, status: 'active' }, { status: 'inactive', moderationNote: 'Owner account suspended' });
      }
    }
    if (typeof verified === 'boolean') user.verified = verified;
    if (role !== undefined) {
      if (!['tenant', 'owner', 'admin'].includes(role)) throw new AppError('Invalid role', 400);
      user.role = role;
      user.tokenVersion = (user.tokenVersion || 0) + 1;
    }
    await user.save();
    res.json({ user: { ...user.toProfile(), suspended: user.suspended, suspendedReason: user.suspendedReason } });
  })
);

// GET /api/admin/reports?status=open
router.get(
  '/reports',
  asyncHandler(async (req, res) => {
    const status = ['open', 'resolved', 'dismissed'].includes(req.query.status) ? req.query.status : 'open';
    const reports = await Report.find({ status }).populate('reporterId', 'fullName email').sort({ createdAt: -1 }).limit(200);
    // Attach a short label for each target so admins can act quickly.
    const out = [];
    for (const r of reports) {
      let target = null;
      if (r.targetType === 'listing') target = await Property.findById(r.targetId).select('title status ownerId');
      else if (r.targetType === 'user') target = await User.findById(r.targetId).select('fullName email suspended');
      else if (r.targetType === 'review') target = await Review.findById(r.targetId).select('text rating propertyId');
      out.push({ ...r.toObject(), target });
    }
    res.json({ reports: out });
  })
);

// PATCH /api/admin/reports/:id  { status: resolved|dismissed, note, removeContent? }
router.patch(
  '/reports/:id',
  asyncHandler(async (req, res) => {
    if (!isObjectId(req.params.id)) throw new AppError('Invalid report ID', 400);
    const { status, note = '', removeContent = false } = req.body;
    if (!['resolved', 'dismissed'].includes(status)) throw new AppError('status must be resolved or dismissed', 400);
    const report = await Report.findById(req.params.id);
    if (!report) throw new AppError('Report not found', 404);

    if (removeContent && status === 'resolved') {
      if (report.targetType === 'listing') await Property.updateOne({ _id: report.targetId }, { status: 'inactive', moderationNote: 'Removed after a report' });
      if (report.targetType === 'review') {
        const review = await Review.findByIdAndDelete(report.targetId);
        if (review) await recomputePropertyRating(review.propertyId);
      }
      if (report.targetType === 'user') {
        await User.updateOne({ _id: report.targetId }, { suspended: true, suspendedReason: 'Suspended after a report', $inc: { tokenVersion: 1 } });
      }
    }
    report.status = status;
    report.resolutionNote = String(note).slice(0, 1000);
    report.resolvedBy = req.user._id;
    report.resolvedAt = new Date();
    await report.save();
    await notify(report.reporterId, 'Update on your report', `Thanks for your report. Our team has ${status} it.`, 'report', { reportId: report._id });
    res.json({ report });
  })
);

// GET /api/admin/inquiries
router.get(
  '/inquiries',
  asyncHandler(async (req, res) => {
    const filter = ['new', 'contacted', 'closed'].includes(req.query.status) ? { status: req.query.status } : {};
    const inquiries = await Inquiry.find(filter).sort({ createdAt: -1 }).limit(200);
    res.json({ inquiries });
  })
);

// PATCH /api/admin/inquiries/:id  { status }
router.patch(
  '/inquiries/:id',
  asyncHandler(async (req, res) => {
    if (!isObjectId(req.params.id)) throw new AppError('Invalid inquiry ID', 400);
    if (!['new', 'contacted', 'closed'].includes(req.body.status)) throw new AppError('Invalid status', 400);
    const inquiry = await Inquiry.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    if (!inquiry) throw new AppError('Inquiry not found', 404);
    res.json({ inquiry });
  })
);

module.exports = router;
