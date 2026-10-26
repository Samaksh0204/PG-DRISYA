const Notification = require('../models/Notification');
const { pushToUser } = require('../services/push');

// Push payloads carry ids as plain strings so the app can open the right screen.
function pushData(type, data) {
  const out = { type };
  for (const [k, v] of Object.entries(data || {})) {
    if (v === null || v === undefined) continue;
    out[k] = typeof v === 'object' && typeof v.toString === 'function' ? v.toString() : v;
  }
  return out;
}

// Best-effort in-app notification, plus a phone push to the user's signed-in devices.
// Never fails the request.
async function notify(userId, title, body, type = 'info', data = {}) {
  try {
    await Notification.create({ userId, title, body, type, data });
  } catch (e) {
    console.error('notify failed:', e.message);
  }
  pushToUser(userId, { title, body, data: pushData(type, data) });
}

module.exports = { notify, pushData };
