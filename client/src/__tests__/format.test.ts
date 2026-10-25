import { describe, expect, test } from 'vitest';
import { formatINR, localISODate, addDays, upcomingDates, formatDay, formatDate, timeAgo, moveInCost, passwordProblem, isEmail, routeParams, pluralize } from '../lib/format';

describe('format helpers', () => {
  test('formatINR uses Indian grouping and the rupee sign', () => {
    expect(formatINR(8500)).toBe('₹8,500');
    expect(formatINR(1250000)).toBe('₹12,50,000');
    expect(formatINR(0)).toBe('₹0');
    expect(formatINR(NaN)).toBe('₹0');
  });

  test('localISODate uses the local calendar day, not UTC', () => {
    // 00:30 local time on 25 Oct must stay 25 Oct (toISOString would give 24 Oct in IST).
    expect(localISODate(new Date(2026, 9, 25, 0, 30))).toBe('2026-10-25');
  });

  test('addDays crosses month and year boundaries', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  test('upcomingDates', () => {
    const from = new Date(2026, 9, 24, 10);
    expect(upcomingDates(3, from)).toEqual(['2026-10-25', '2026-10-26', '2026-10-27']);
    expect(upcomingDates(2, from, 0)).toEqual(['2026-10-24', '2026-10-25']);
  });

  test('formatDay and formatDate', () => {
    expect(formatDay('2026-10-25')).toMatch(/25/);
    expect(formatDay('not a date')).toBe('not a date');
    expect(formatDate('2026-10-25')).toMatch(/2026/);
    expect(formatDate('')).toBe('');
    expect(formatDate('garbage')).toBe('');
  });

  test('timeAgo', () => {
    const now = new Date('2026-10-24T12:00:00Z');
    expect(timeAgo('2026-10-24T11:59:30Z', now)).toBe('just now');
    expect(timeAgo('2026-10-24T11:30:00Z', now)).toBe('30m ago');
    expect(timeAgo('2026-10-24T09:00:00Z', now)).toBe('3h ago');
    expect(timeAgo('2026-10-22T12:00:00Z', now)).toBe('2d ago');
    expect(timeAgo('2026-09-01T12:00:00Z', now)).toMatch(/2026/);
  });

  test('moveInCost = first month + deposit', () => {
    expect(moveInCost(8000, 16000)).toEqual({ firstMonth: 8000, deposit: 16000, total: 24000 });
  });

  test('passwordProblem mirrors the server policy', () => {
    expect(passwordProblem('Secret123')).toBeNull();
    expect(passwordProblem('short1')).toMatch(/8 characters/);
    expect(passwordProblem('onlyletters')).toMatch(/letter and one number/);
  });

  test('isEmail', () => {
    expect(isEmail('a@b.co')).toBe(true);
    expect(isEmail('nope')).toBe(false);
  });

  test('routeParams reads the query part of a hash route', () => {
    expect(routeParams('/search?city=Indore&gender=male').get('city')).toBe('Indore');
    expect(routeParams('/search').get('city')).toBeNull();
  });

  test('pluralize', () => {
    expect(pluralize(1, 'room')).toBe('1 room');
    expect(pluralize(3, 'room')).toBe('3 rooms');
  });
});
