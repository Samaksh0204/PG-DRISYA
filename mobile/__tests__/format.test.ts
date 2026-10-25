import { formatINR, localISODate, addDays, upcomingDates, formatDay, moveInCost, isEmail, passwordProblem, apiUrlProblem } from '../src/utils/format';

describe('format helpers', () => {
  test('formatINR', () => {
    expect(formatINR(8500)).toBe('₹8,500');
    expect(formatINR(1250000)).toBe('₹12,50,000');
  });

  test('local dates (not UTC)', () => {
    expect(localISODate(new Date(2026, 9, 25, 0, 30))).toBe('2026-10-25');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(upcomingDates(2, new Date(2026, 9, 24))).toEqual(['2026-10-24', '2026-10-25']);
  });

  test('formatDay', () => {
    expect(formatDay('2026-10-25')).toBe('Sun, 25 Oct');
    expect(formatDay('bad')).toBe('bad');
  });

  test('moveInCost', () => {
    expect(moveInCost(8000, 16000).total).toBe(24000);
  });

  test('validation matches the server rules', () => {
    expect(isEmail('a@b.co')).toBe(true);
    expect(isEmail('nope')).toBe(false);
    expect(passwordProblem('Secret123')).toBeNull();
    expect(passwordProblem('short1')).toMatch(/8 characters/);
    expect(passwordProblem('lettersonly')).toMatch(/letter and one number/);
  });

  test('release builds require an https API', () => {
    expect(apiUrlProblem('https://api.example.com/api', false)).toBeNull();
    expect(apiUrlProblem('http://192.168.1.5:5000/api', false)).toMatch(/https/);
    expect(apiUrlProblem('http://192.168.1.5:5000/api', true)).toBeNull();
    expect(apiUrlProblem(undefined, false)).toMatch(/without an API/);
  });
});
