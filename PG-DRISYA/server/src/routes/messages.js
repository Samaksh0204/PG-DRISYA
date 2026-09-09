const express = require('express');
const Message = require('../models/Message');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.get('/conversations', auth, async (req, res, next) => {
  try {
    const userId = req.user._id;
    const messages = await Message.find({
      $or: [{ senderId: userId }, { receiverId: userId }],
    }).sort({ createdAt: 1 }).populate('propertyId', 'title photos');

    const convMap = new Map();
    for (const msg of messages) {
      const otherId = msg.senderId.toString() === userId.toString()
        ? msg.receiverId.toString()
        : msg.senderId.toString();
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
      conv.messages.push({
        id: msg._id,
        sender: msg.senderId.toString() === userId.toString() ? 'me' : 'them',
        text: msg.text,
        time: msg.createdAt,
        read: msg.read,
      });
      if (msg.receiverId.toString() === userId.toString() && !msg.read) conv.unread++;
    }

    const participantIds = [...new Set([...convMap.values()].map((c) => c.participantId))];
    const participants = await User.find({ _id: { $in: participantIds } }).select('fullName avatar role');
    const pMap = new Map(participants.map((p) => [p._id.toString(), p]));

    const conversations = [...convMap.values()].map((c) => {
      const p = pMap.get(c.participantId);
      const last = c.messages[c.messages.length - 1];
      return {
        id: `${c.propertyId}-${c.participantId}`,
        propertyId: c.propertyId,
        propertyTitle: c.propertyTitle,
        propertyImage: c.propertyImage,
        participantId: c.participantId,
        participantName: p?.fullName || 'User',
        participantAvatar: p?.avatar || '',
        participantRole: p?.role || 'tenant',
        lastMessage: last?.text || '',
        lastMessageTime: last?.time || '',
        unread: c.unread,
        messages: c.messages,
      };
    });

    conversations.sort((a, b) => (a.lastMessageTime < b.lastMessageTime ? 1 : -1));
    res.json({ conversations });
  } catch (err) {
    next(err);
  }
});

router.post('/', auth, async (req, res, next) => {
  try {
    const { propertyId, receiverId, text } = req.body;
    if (!receiverId || !text) return res.status(400).json({ message: 'receiverId and text are required' });
    if (!text.trim()) return res.status(400).json({ message: 'Message cannot be empty' });
    if (receiverId === req.user._id.toString()) return res.status(400).json({ message: 'Cannot message yourself' });

    const receiver = await User.findById(receiverId).select('_id');
    if (!receiver) return res.status(404).json({ message: 'Recipient not found' });

    const msg = await Message.create({ propertyId: propertyId || null, senderId: req.user._id, receiverId, text: text.trim() });
    res.status(201).json({ message: msg });
  } catch (err) {
    next(err);
  }
});

router.put('/read', auth, async (req, res, next) => {
  try {
    const { propertyId, senderId } = req.body;
    if (!senderId) return res.status(400).json({ message: 'senderId is required' });
    // Scoped to receiverId: req.user._id so a user can only mark their own
    // inbound messages as read, never someone else's conversation.
    await Message.updateMany(
      { propertyId: propertyId || null, senderId, receiverId: req.user._id, read: false },
      { read: true }
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
