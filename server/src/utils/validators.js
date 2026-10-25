// Small, dependency-free validation helpers shared by routes (and unit tested).

const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const isObjectId = (v) => typeof v === 'string' && OBJECT_ID_RE.test(v);
const isEmail = (v) => typeof v === 'string' && v.length <= 254 && EMAIL_RE.test(v.trim());
const isNonEmptyString = (v, max = Infinity) => typeof v === 'string' && v.trim().length > 0 && v.trim().length <= max;

// Real calendar date in YYYY-MM-DD form (rejects 2026-02-30 etc).
function isISODate(v) {
  if (typeof v !== 'string' || !ISO_DATE_RE.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

// Today's date in India (the market this app serves), as YYYY-MM-DD.
function todayIST(now = new Date()) {
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().slice(0, 10);
}

// Whole days from today (IST) to `date` (negative = past).
function daysFromToday(date, now = new Date()) {
  const a = new Date(`${todayIST(now)}T00:00:00Z`).getTime();
  const b = new Date(`${date}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86400000);
}

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function pick(obj, fields) {
  const out = {};
  if (!obj || typeof obj !== 'object') return out;
  for (const key of fields) {
    if (obj[key] !== undefined) out[key] = obj[key];
  }
  return out;
}

function parsePagination(query, { defaultLimit = 20, maxLimit = 100 } = {}) {
  const page = Math.max(1, Math.floor(Number(query.page)) || 1);
  const limit = Math.min(maxLimit, Math.max(1, Math.floor(Number(query.limit)) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}

function passwordProblem(pw) {
  if (typeof pw !== 'string') return 'Password is required';
  if (pw.length < 8) return 'Password must be at least 8 characters';
  if (pw.length > 128) return 'Password must be at most 128 characters';
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'Password must contain at least one letter and one number';
  return null;
}

module.exports = {
  isObjectId,
  isEmail,
  isNonEmptyString,
  isISODate,
  todayIST,
  daysFromToday,
  escapeRegex,
  pick,
  parsePagination,
  passwordProblem,
};
