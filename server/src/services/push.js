// Phone push notifications through Expo's push service (works for both Android/FCM
// and iOS/APNs once the app build has push credentials — see DEPLOYMENT.md).
// Best effort: a push failure never fails the request that triggered it.
const PushToken = require('../models/PushToken');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_TOKEN_RE = /^Expo(nent)?PushToken\[[A-Za-z0-9_-]+\]$/;
const BATCH = 100; // Expo accepts up to 100 messages per request

const isExpoToken = (t) => typeof t === 'string' && EXPO_TOKEN_RE.test(t);
const enabled = () => process.env.PUSH_DISABLED !== 'true' && (process.env.NODE_ENV !== 'test' || process.env.PUSH_IN_TESTS === 'true');

// Lock-screen text must not leak private details: keep it short.
const clip = (s, n) => (s && s.length > n ? `${s.slice(0, n - 1)}…` : s || '');

async function sendToUsers(userIds, { title, body, data = {} }) {
  if (!enabled()) return { sent: 0 };
  const ids = [...new Set(userIds.map(String))];
  if (!ids.length) return { sent: 0 };
  const tokens = await PushToken.find({ userId: { $in: ids } }).select('token');
  if (!tokens.length) return { sent: 0 };

  const messages = tokens.map((t) => ({
    to: t.token,
    title: clip(title, 80),
    body: clip(body, 160),
    data,
    sound: 'default',
    channelId: 'default',
    priority: 'high',
  }));

  let sent = 0;
  for (let i = 0; i < messages.length; i += BATCH) {
    const chunk = messages.slice(i, i + BATCH);
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          // Optional: only needed if "enhanced push security" is turned on in Expo.
          ...(process.env.EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` } : {}),
        },
        body: JSON.stringify(chunk),
        signal: AbortSignal.timeout(10000),
      });
      const json = await res.json().catch(() => ({}));
      const tickets = Array.isArray(json.data) ? json.data : [];
      // Forget devices Expo says can't receive notifications any more.
      const dead = tickets
        .map((t, idx) => (t.status === 'error' && t.details?.error === 'DeviceNotRegistered' ? chunk[idx].to : null))
        .filter(Boolean);
      if (dead.length) await PushToken.deleteMany({ token: { $in: dead } });
      sent += tickets.filter((t) => t.status === 'ok').length;
    } catch (err) {
      if (process.env.NODE_ENV !== 'test') console.warn('[push] send failed:', err.message);
    }
  }
  return { sent };
}

// Fire-and-forget wrapper for request handlers.
function pushToUser(userId, payload) {
  sendToUsers([userId], payload).catch(() => {});
}

module.exports = { sendToUsers, pushToUser, isExpoToken, EXPO_PUSH_URL };
