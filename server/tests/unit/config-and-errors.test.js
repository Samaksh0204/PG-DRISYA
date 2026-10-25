const { validateEnv, flags, appUrl } = require('../../src/config/env');
const errorHandler = require('../../src/middleware/errorHandler');
const AppError = require('../../src/utils/AppError');
const asyncHandler = require('../../src/utils/asyncHandler');

describe('validateEnv', () => {
  const good = {
    NODE_ENV: 'production',
    MONGO_URI: 'mongodb://x',
    JWT_SECRET: 'x'.repeat(32),
    CORS_ORIGINS: 'https://a.com',
    APP_URL: 'https://a.com',
    SMTP_HOST: 'smtp',
    CLOUDINARY_CLOUD_NAME: 'c',
    CLOUDINARY_API_KEY: 'k',
    CLOUDINARY_API_SECRET: 's',
  };

  test('valid production config has no errors or warnings', () => {
    expect(validateEnv(good)).toEqual({ errors: [], warnings: [] });
  });

  test('missing required vars', () => {
    const { errors } = validateEnv({ NODE_ENV: 'development' });
    expect(errors).toEqual(expect.arrayContaining([expect.stringMatching(/MONGO_URI/), expect.stringMatching(/JWT_SECRET/)]));
  });

  test('production-only rules', () => {
    const { errors } = validateEnv({ ...good, JWT_SECRET: 'short', CORS_ORIGINS: '', APP_URL: '' });
    expect(errors.join(' ')).toMatch(/32 characters/);
    expect(errors.join(' ')).toMatch(/CORS_ORIGINS/);
    expect(errors.join(' ')).toMatch(/APP_URL/);
  });

  test('CLIENT_DIST removes the CORS requirement (same-origin deploy)', () => {
    const { errors } = validateEnv({ ...good, CORS_ORIGINS: '', CLIENT_DIST: '../client/dist' });
    expect(errors).toEqual([]);
  });

  test('Aadhaar simulation in production requires a pepper', () => {
    expect(validateEnv({ ...good, AADHAAR_SIMULATION: 'true' }).errors.join(' ')).toMatch(/AADHAAR_PEPPER/);
  });

  test('warns when email or uploads are not configured', () => {
    const { warnings } = validateEnv({ ...good, SMTP_HOST: '', CLOUDINARY_API_KEY: '' });
    expect(warnings).toHaveLength(2);
  });

  test('flags and appUrl', () => {
    delete process.env.LISTING_MODERATION;
    expect(flags.moderationEnabled()).toBe(true);
    process.env.LISTING_MODERATION = 'false';
    expect(flags.moderationEnabled()).toBe(false);
    delete process.env.LISTING_MODERATION;
    expect(flags.aadhaarSimulation()).toBe(false);
    const prev = { sim: process.env.AADHAAR_SIMULATION, env: process.env.NODE_ENV };
    process.env.AADHAAR_SIMULATION = 'true';
    process.env.NODE_ENV = 'production';
    expect(flags.aadhaarSimulation()).toBe(false); // never simulated in production
    process.env.NODE_ENV = prev.env;
    if (prev.sim === undefined) delete process.env.AADHAAR_SIMULATION; else process.env.AADHAAR_SIMULATION = prev.sim;
    expect(appUrl()).toBe('http://localhost:5173');
  });
});

describe('errorHandler', () => {
  const run = (err, env = 'test') => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = env;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    jest.spyOn(console, 'error').mockImplementation(() => {});
    errorHandler(err, { method: 'GET', originalUrl: '/x' }, res, () => {});
    process.env.NODE_ENV = prev;
    return { status: res.status.mock.calls[0][0], body: res.json.mock.calls[0][0] };
  };

  test('AppError keeps status and message', () => {
    expect(run(new AppError('Nope', 418))).toEqual({ status: 418, body: { message: 'Nope' } });
  });

  test('mongoose errors map to 400/409', () => {
    expect(run({ name: 'ValidationError', errors: { a: { message: 'A bad' }, b: { message: 'B bad' } } })).toEqual({ status: 400, body: { message: 'A bad, B bad' } });
    expect(run({ name: 'CastError', path: '_id' }).status).toBe(400);
    expect(run({ code: 11000, keyPattern: { email: 1 } })).toEqual({ status: 409, body: { message: 'email already in use' } });
  });

  test('bad JSON and CORS', () => {
    expect(run({ type: 'entity.parse.failed' }).status).toBe(400);
    expect(run(new Error('Not allowed by CORS')).status).toBe(403);
  });

  test('unknown errors hide details in production', () => {
    expect(run(new Error('db password leaked'), 'production').body.message).toBe('Something went wrong. Please try again.');
    expect(run(new Error('visible in dev'), 'development').body.message).toBe('visible in dev');
  });
});

describe('asyncHandler', () => {
  test('forwards rejected promises to next()', async () => {
    const next = jest.fn();
    const boom = new Error('boom');
    await asyncHandler(async () => { throw boom; })({}, {}, next);
    expect(next).toHaveBeenCalledWith(boom);
  });
});
