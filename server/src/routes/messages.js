const express = require('express');
const mongoose = require('mongoose');
const Message = require('../models/Message');
const User = require('../models/User');
const Property = require('../models/Property');
const Notification = require('../models/Notification');
const { auth } = require('../middleware/auth');
const Block = require('../models/Block');
const { messageLimiter, messageReadLimiter, writeLimiter } = require('../middleware/rateLimiters');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { isObjectId } = require('../utils/validators');

const router = express.Router();
const MAX_MESSAGES_SCANNED = 2000;
const MESSAGES_PER_CONVERSATION = 100;
const THREAD_PAGE_SIZE = 30;

// Spot phone numbers / emails / "WhatsApp me" so the app can show a safety tip.
// The message is still delivered — people may have good reasons to share details.
const CONTACT_PATTERNS = [
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  /\b(?:whats\s?app|telegram|signal|upi|gpay|phonepe|paytm)\b/i,
];
// Any run like "98765 43210", "+91-98765-43210" or "(0731) 2345678" with 10+ digits.
const hasPhoneNumber = (text) => (text.match(/\+?\d[\d\s().-]{8,}\d/g) || []).some((run) => run.replace(/\D/g, '').length >= 10);
const mentionsContactInfo = (text) => hasPhoneNumber(text) || CONTACT_PATTERNS.some((rx) => rx.test(text));

async function blockState(me, other) {
  const blocks = await Block.find({ $or: [{ blockerId: me, blockedId: other }, { blockerId: other, blockedId: me }] }).select('blockerId');
  return {
    blockedByMe: blocks.some((b) => b.blockerId.equals(me)),
    blockedMe: blocks.some((b) => !b.blockerId.equals(me)),
  };
}

const messageView = (msg, me) => ({ id: msg._id, sender: msg.senderId.equals(me) ? 'me' : 'them', text: msg.text, time: msg.createdAt, read: msg.read, clientId: msg.clientId || null });

// GET /api/messages/conversations — grouped by (property, other person)
router.get(
  '/conversations',
  auth,
  messageReadLimiter,
  asyncHandler(async (req, res) => {
    const userId = req.user._id;
    // Newest first, capped, so very chatty accounts stay fast.
    const messages = await Message.find({ $or: [{ senderId: userId }, { receiverId: userId }] })
      .sort({ createdAt: -1 })
      .limit(MAX_MESSAGES_SCANNED)
      .populate('propertyId', 'title photos');

    const convMap = new Map();
    for (const msg of messages) {
      const mine = msg.senderId.equals(userId);
      const otherId = (mine ? msg.receiverId : msg.senderId).toString();
      const key = `${msg.propertyId?._id || 'none'}-${otherId}`;
      if (!convMap.has(key)) {
        convMap.set(key, {
          propertyId: msg.propertyId?._id || null,
          propertyTitle: msg.propertyId?.title || 'General',
          propertyImage: msg.propertyId?.photos?.[0] || '',
          participantId: otherId,
          unread: 0,
          messages: [],
        });
      }
      const conv = convMap.get(key);
      if (conv.messages.length < MESSAGES_PER_CONVERSATION) {
        conv.messages.push({ id: msg._id, sender: mine ? 'me' : 'them', text: msg.text, time: msg.createdAt, read: msg.read });
      }
      if (!mine && !msg.read) conv.unread++;
    }

    const participantIds = [...new Set([...convMap.values()].map((c) => c.participantId))];
    const [participants, blocks] = await Promise.all([
      User.find({ _id: { $in: participantIds } }).select('fullName avatar role'),
      Block.find({ $or: [{ blockerId: userId, blockedId: { $in: participantIds } }, { blockedId: userId, blockerId: { $in: participantIds } }] }).select('blockerId blockedId'),
    ]);
    const blockedByMe = new Set(blocks.filter((b) => b.blockerId.equals(userId)).map((b) => b.blockedId.toString()));
    const blockedMe = new Set(blocks.filter((b) => !b.blockerId.equals(userId)).map((b) => b.blockerId.toString()));
    const pMap = new Map(participants.map((p) => [p._id.toString(), p]));

    const conversations = [...convMap.values()].map((c) => {
      const p = pMap.get(c.participantId);
      c.messages.reverse(); // oldest → newest for display
      const last = c.messages[c.messages.length - 1];
      return {
        id: `${c.propertyId || 'none'}-${c.participantId}`,
        propertyId: c.propertyId,
        propertyTitle: c.propertyTitle,
        propertyImage: c.propertyImage,
        participantId: c.participantId,
        participantName: p?.fullName || 'Former member',
        participantAvatar: p?.avatar || '',
        participantRole: p?.role || 'tenant',
        participantDeleted: !p,
        blockedByMe: blockedByMe.has(c.participantId),
        blockedMe: blockedMe.has(c.participantId),
        lastMessage: last?.text || '',
        lastMessageTime: last?.time || '',
        unread: c.unread,
        messages: c.messages,
      };
    });
    conversations.sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));
    res.json({ conversations });
  })
);

// GET /api/messages/unread-count
// GET /api/messages/thread?with=<userId>&propertyId=<id|none>&before=<ISO>&after=<ISO>&limit=30
// One conversation, paginated. It is always scoped to messages the caller sent or
// received, so changing `with` or `propertyId` can never reveal someone else's chat.
router.get(
  '/thread',
  auth,
  messageReadLimiter,
  asyncHandler(async (req, res) => {
    const me = req.user._id;
    const other = req.query.with;
    if (!isObjectId(other)) throw new AppError('A valid "with" user id is required', 400);
    const pidRaw = req.query.propertyId;
    if (pidRaw && pidRaw !== 'none' && !isObjectId(pidRaw)) throw new AppError('Invalid propertyId', 400);
    const pid = pidRaw && pidRaw !== 'none' ? new mongoose.Types.ObjectId(pidRaw) : null;
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || THREAD_PAGE_SIZE));

    const filter = {
      propertyId: pid,
      $or: [{ senderId: me, receiverId: other }, { senderId: other, receiverId: me }],
    };
    const before = req.query.before ? new Date(String(req.query.before)) : null;
    const after = req.query.after ? new Date(String(req.query.after)) : null;
    if (before && Number.isNaN(before.getTime())) throw new AppError('Invalid "before" date', 400);
    if (after && Number.isNaN(after.getTime())) throw new AppError('Invalid "after" date', 400);

    let messages;
    let hasMore = false;
    if (after) {
      // Polling for new messages since the newest one the client already has.
      messages = await Message.find({ ...filter, createdAt: { $gt: after } }).sort({ createdAt: 1 }).limit(100);
    } else {
      const page = await Message.find(before ? { ...filter, createdAt: { $lt: before } } : filter).sort({ createdAt: -1 }).limit(limit + 1);
      hasMore = page.length > limit;
      messages = page.slice(0, limit).reverse();
    }

    const [participant, property, blocked] = await Promise.all([
      User.findById(other).select('fullName avatar role suspended'),
      pid ? Property.findById(pid).select('title photos status') : null,
      blockState(me, other),
    ]);
    res.json({
      messages: messages.map((m) => messageView(m, me)),
      hasMore,
      participant: participant
        ? { id: participant._id, fullName: participant.fullName, avatar: participant.avatar || '', role: participant.role, deleted: false, suspended: !!participant.suspended }
        : { id: other, fullName: 'Former member', avatar: '', role: 'tenant', deleted: true, suspended: false },
      property: property && property.status !== 'deleted' ? { id: property._id, title: property.title, photo: property.photos?.[0] || '' } : null,
      ...blocked,
    });
  })
);

router.get(
  '/unread-count',
  auth,
  messageReadLimiter,
  asyncHandler(async (req, res) => {
    const count = await Message.countDocuments({ receiverId: req.user._id, read: false });
    res.json({ count });
  })
);

// POST /api/messages
router.post(
  '/',
  auth,
  messageLimiter,
  asyncHandler(async (req, res) => {
    const { propertyId, receiverId, text, clientId } = req.body;
    if (clientId !== undefined && (typeof clientId !== 'string' || !/^[A-Za-z0-9_-]{8,64}$/.test(clientId))) {
      throw new AppError('Invalid clientId', 400);
    }
    if (!isObjectId(receiverId)) throw new AppError('A valid receiverId is required', 400);
    if (typeof text !== 'string' || !text.trim()) throw new AppError('Message cannot be empty', 400);
    if (text.length > 2000) throw new AppError('Message must be at most 2000 characters', 400);
    if (receiverId === req.user._id.toString()) throw new AppError('Cannot message yourself', 400);
    if (propertyId !== undefined && propertyId !== null && propertyId !== '' && !isObjectId(propertyId)) {
      throw new AppError('Invalid propertyId', 400);
    }

    // A retry of a message we already stored: return the original instead of a duplicate.
    if (clientId) {
      const existing = await Message.findOne({ senderId: req.user._id, clientId });
      if (existing) return res.status(200).json({ message: existing, duplicate: true });
    }

    const receiver = await User.findById(receiverId).select('_id suspended');
    if (!receiver || receiver.suspended) throw new AppError('Recipient not found', 404);
    const blocked = await blockState(req.user._id, receiver._id);
    if (blocked.blockedByMe) throw new AppError('You blocked this person. Unblock them to send a message.', 403);
    if (blocked.blockedMe) throw new AppError("You can't message this person.", 403);
    let property = null;
    if (propertyId) {
      property = await Property.findById(propertyId).select('title status');
      if (!property || property.status === 'deleted') throw new AppError('Property not found', 404);
    }

    let msg;
    try {
      msg = await Message.create({
        propertyId: propertyId || null,
        senderId: req.user._id,
        receiverId,
        text: text.trim(),
        ...(clientId ? { clientId } : {}),
      });
    } catch (err) {
      // Two copies of the same retry raced each other; the first one won.
      if (err.code === 11000 && clientId) {
        const existing = await Message.findOne({ senderId: req.user._id, clientId });
        if (existing) return res.status(200).json({ message: existing, duplicate: true });
      }
      throw err;
    }

    // One unread "new message" notification per sender at a time (no spam).
    const already = await Notification.exists({ userId: receiverId, type: 'message', read: false, 'data.senderId': req.user._id.toString() });
    if (!already) {
      await Notification.create({
        userId: receiverId,
        title: `New message from ${req.user.fullName}`,
        body: property ? `About "${property.title}": ${text.trim().slice(0, 120)}` : text.trim().slice(0, 140),
        type: 'message',
        data: { senderId: req.user._id.toString(), propertyId: property?._id || null },
      });
    }
    res.status(201).json({ message: msg, ...(mentionsContactInfo(text) ? { warning: 'contact_info' } : {}) });
  })
);

// PUT /api/messages/read — mark a conversation's inbound messages as read
router.put(
  '/read',
  auth,
  asyncHandler(async (req, res) => {
    const { propertyId, senderId } = req.body;
    if (!isObjectId(senderId)) throw new AppError('senderId is required', 400);
    const pid = propertyId && isObjectId(propertyId) ? new mongoose.Types.ObjectId(propertyId) : null;
    await Message.updateMany({ propertyId: pid, senderId, receiverId: req.user._id, read: false }, { read: true });
    await Notification.updateMany({ userId: req.user._id, type: 'message', read: false, 'data.senderId': senderId }, { read: true });
    res.json({ success: true });
  })
);

// ── Blocking ──────────────────────────────────────────────────────────
// GET /api/messages/blocks — people I have blocked
router.get(
  '/blocks',
  auth,
  asyncHandler(async (req, res) => {
    const blocks = await Block.find({ blockerId: req.user._id }).populate('blockedId', 'fullName avatar').sort({ createdAt: -1 }).limit(500);
    res.json({ blocks: blocks.filter((b) => b.blockedId).map((b) => ({ userId: b.blockedId._id, fullName: b.blockedId.fullName, avatar: b.blockedId.avatar || '', since: b.createdAt })) });
  })
);

// POST /api/messages/block { userId }
router.post(
  '/block',
  auth,
  writeLimiter,
  asyncHandler(async (req, res) => {
    const { userId } = req.body;
    if (!isObjectId(userId)) throw new AppError('A valid userId is required', 400);
    if (userId === req.user._id.toString()) throw new AppError('You cannot block yourself', 400);
    if (!(await User.exists({ _id: userId }))) throw new AppError('User not found', 404);
    await Block.updateOne({ blockerId: req.user._id, blockedId: userId }, { $setOnInsert: { blockerId: req.user._id, blockedId: userId } }, { upsert: true });
    res.json({ blocked: true });
  })
);

// DELETE /api/messages/block/:userId
router.delete(
  '/block/:userId',
  auth,
  writeLimiter,
  asyncHandler(async (req, res) => {
    if (!isObjectId(req.params.userId)) throw new AppError('Invalid user ID', 400);
    await Block.deleteOne({ blockerId: req.user._id, blockedId: req.params.userId });
    res.json({ blocked: false });
  })
);

module.exports = router;
module.exports.mentionsContactInfo = mentionsContactInfo;
