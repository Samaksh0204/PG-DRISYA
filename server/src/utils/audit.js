const crypto = require('crypto');
const AuditLog = require('../models/AuditLog');

// Keys that must never be written to the audit trail, however they were passed in.
const FORBIDDEN = /aadhaar|password|token|secret|otp|document|number/i;

function hashIp(ip) {
  if (!ip) return '';
  const key = process.env.AUDIT_IP_PEPPER || process.env.JWT_SECRET || 'audit';
  return crypto.createHmac('sha256', key).update(String(ip)).digest('hex').slice(0, 24);
}

function safeMeta(meta = {}) {
  const out = {};
  for (const [k, v] of Object.entries(meta)) {
    if (FORBIDDEN.test(k)) continue;
    out[k] = typeof v === 'string' ? v.slice(0, 200) : v;
  }
  return out;
}

// Fire-and-forget: an audit write failure must not break the user's request.
async function audit(req, action, { targetType = '', targetId = '', meta = {}, actorId } = {}) {
  try {
    await AuditLog.create({
      actorId: actorId !== undefined ? actorId : req?.user?._id || null,
      action,
      targetType,
      targetId: targetId ? String(targetId) : '',
      meta: safeMeta(meta),
      ipHash: hashIp(req?.ip),
    });
  } catch (err) {
    if (process.env.NODE_ENV !== 'test') console.error('[audit] write failed:', err.message);
  }
}

module.exports = { audit, safeMeta, hashIp };
