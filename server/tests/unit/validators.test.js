const v = require('../../src/utils/validators');

describe('validators', () => {
  test('isObjectId', () => {
    expect(v.isObjectId('507f1f77bcf86cd799439011')).toBe(true);
    expect(v.isObjectId('507f1f77bcf86cd79943901')).toBe(false);
    expect(v.isObjectId('zzzf1f77bcf86cd799439011')).toBe(false);
    expect(v.isObjectId({ $ne: null })).toBe(false);
    expect(v.isObjectId(undefined)).toBe(false);
  });

  test('isEmail', () => {
    expect(v.isEmail('a@b.co')).toBe(true);
    expect(v.isEmail(' user@example.com ')).toBe(true);
    expect(v.isEmail('no-at-sign')).toBe(false);
    expect(v.isEmail('a@b')).toBe(false);
    expect(v.isEmail('a@b.c')).toBe(false);
    expect(v.isEmail({})).toBe(false);
    expect(v.isEmail(`${'a'.repeat(250)}@b.com`)).toBe(false);
  });

  test('isNonEmptyString respects max length and trims', () => {
    expect(v.isNonEmptyString('hi')).toBe(true);
    expect(v.isNonEmptyString('   ')).toBe(false);
    expect(v.isNonEmptyString('abcdef', 5)).toBe(false);
    expect(v.isNonEmptyString(5)).toBe(false);
  });

  test('isISODate rejects impossible dates', () => {
    expect(v.isISODate('2026-02-28')).toBe(true);
    expect(v.isISODate('2028-02-29')).toBe(true);
    expect(v.isISODate('2026-02-30')).toBe(false);
    expect(v.isISODate('2026-13-01')).toBe(false);
    expect(v.isISODate('26-01-01')).toBe(false);
    expect(v.isISODate(20260101)).toBe(false);
  });

  test('todayIST rolls over at IST midnight, not UTC midnight', () => {
    // 2026-10-24 19:00 UTC = 2026-10-25 00:30 IST
    expect(v.todayIST(new Date('2026-10-24T19:00:00Z'))).toBe('2026-10-25');
    expect(v.todayIST(new Date('2026-10-24T18:00:00Z'))).toBe('2026-10-24');
  });

  test('daysFromToday', () => {
    const now = new Date('2026-10-24T06:00:00Z');
    expect(v.daysFromToday('2026-10-24', now)).toBe(0);
    expect(v.daysFromToday('2026-10-25', now)).toBe(1);
    expect(v.daysFromToday('2026-10-20', now)).toBe(-4);
  });

  test('escapeRegex neutralises special characters', () => {
    const rx = new RegExp(v.escapeRegex('a.*(b)'));
    expect(rx.test('a.*(b)')).toBe(true);
    expect(rx.test('aXXb')).toBe(false);
  });

  test('pick copies only whitelisted defined fields', () => {
    expect(v.pick({ a: 1, b: undefined, c: 3 }, ['a', 'b'])).toEqual({ a: 1 });
    expect(v.pick(null, ['a'])).toEqual({});
  });

  test('parsePagination clamps values', () => {
    expect(v.parsePagination({})).toEqual({ page: 1, limit: 20, skip: 0 });
    expect(v.parsePagination({ page: '3', limit: '10' })).toEqual({ page: 3, limit: 10, skip: 20 });
    expect(v.parsePagination({ page: '-5', limit: '9999' })).toEqual({ page: 1, limit: 100, skip: 0 });
    expect(v.parsePagination({ page: 'abc', limit: 'x' }, { defaultLimit: 5 })).toEqual({ page: 1, limit: 5, skip: 0 });
  });

  test('passwordProblem enforces policy', () => {
    expect(v.passwordProblem('Password1')).toBeNull();
    expect(v.passwordProblem('short1')).toMatch(/at least 8/);
    expect(v.passwordProblem('allletters')).toMatch(/letter and one number/);
    expect(v.passwordProblem('12345678')).toMatch(/letter and one number/);
    expect(v.passwordProblem('a1'.repeat(70))).toMatch(/at most 128/);
    expect(v.passwordProblem(undefined)).toMatch(/required/);
  });
});
