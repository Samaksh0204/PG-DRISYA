const Notification = require('../models/Notification');

// Best-effort in-app notification; never fails the request.
async function notify(userId, title, body, type = 'info', data = {}) {
  try {
    await Notification.create({ userId, title, body, type, data });
  } catch (e) {
    console.error('notify failed:', e.message);
  }
}

module.exports = { notify };
