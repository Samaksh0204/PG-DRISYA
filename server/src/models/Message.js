const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', default: null },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true, maxlength: 2000 },
    read: { type: Boolean, default: false },
    // Client-generated id so a retried send (flaky network, double tap) isn't stored twice.
    clientId: { type: String, maxlength: 64 },
  },
  { timestamps: true }
);

messageSchema.index({ senderId: 1, receiverId: 1, propertyId: 1 });
messageSchema.index({ receiverId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, createdAt: -1 });
// Thread history pages: one participant pair (+ listing), newest first.
messageSchema.index({ senderId: 1, receiverId: 1, propertyId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, clientId: 1 }, { unique: true, partialFilterExpression: { clientId: { $type: 'string' } } });

module.exports = mongoose.model('Message', messageSchema);
