const jwt = require('jsonwebtoken');
const { verhoeffValid, isPlausibleAadhaar, hashAadhaar } = require('../../src/utils/aadhaar');
const { createOneTimeToken, hashToken, signAuthToken } = require('../../src/utils/tokens');
const { clean, sanitize } = require('../../src/middleware/sanitize');

describe('aadhaar helpers', () => {
  test('Verhoeff checksum', () => {
    expect(verhoeffValid('234567890124')).toBe(true);
    expect(verhoeffValid('234567890123')).toBe(false);
    expect(verhoeffValid('abc')).toBe(false);
    expect(verhoeffValid(1234)).toBe(false);
  });

  test('plausible Aadhaar must be 12 digits, start 2-9, pass checksum', () => {
    expect(isPlausibleAadhaar('234567890124')).toBe(true);
    expect(isPlausibleAadhaar('034567890124')).toBe(false);
    expect(isPlausibleAadhaar('23456789012')).toBe(false);
  });

  test('hash is keyed and deterministic', () => {
    process.env.AADHAAR_PEPPER = 'pepper-a';
    const a1 = hashAadhaar('234567890124');
    expect(hashAadhaar('234567890124')).toBe(a1);
    expect(a1).not.toContain('234567890124');
    process.env.AADHAAR_PEPPER = 'pepper-b';
    expect(hashAadhaar('234567890124')).not.toBe(a1);
    delete process.env.AADHAAR_PEPPER;
  });
});

describe('tokens', () => {
  test('one-time token: only the hash is meant to be stored', () => {
    const { token, hash } = createOneTimeToken();
    expect(token).toHaveLength(64);
    expect(hash).toBe(hashToken(token));
    expect(hash).not.toBe(token);
    expect(createOneTimeToken().token).not.toBe(token);
  });

  test('auth token carries id, role and tokenVersion', () => {
    const token = signAuthToken({ _id: '507f1f77bcf86cd799439011', role: 'owner', tokenVersion: 3 });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    expect(decoded).toMatchObject({ id: '507f1f77bcf86cd799439011', role: 'owner', tv: 3 });
  });
});

describe('sanitize middleware', () => {
  test('strips $-operators and dotted keys deeply', () => {
    const input = { email: { $gt: '' }, a: { b: { $where: 'x', ok: 1 } }, 'x.y': 1, list: [{ $ne: 1, keep: 2 }] };
    expect(clean(input)).toEqual({ email: {}, a: { b: { ok: 1 } }, list: [{ keep: 2 }] });
  });

  test('leaves normal values alone', () => {
    expect(clean({ name: 'A', n: 5, arr: ['x'] })).toEqual({ name: 'A', n: 5, arr: ['x'] });
    expect(clean(null)).toBeNull();
  });

  test('cleans body, query and params then calls next', () => {
    const req = { body: { $x: 1, y: 2 }, query: { $gt: 1 }, params: { id: 'a' } };
    const next = jest.fn();
    sanitize(req, {}, next);
    expect(req.body).toEqual({ y: 2 });
    expect(req.query).toEqual({});
    expect(next).toHaveBeenCalled();
  });
});
