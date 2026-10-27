// Regression: in production with the website served by this server and CORS_ORIGINS
// unset, browsers' same-origin requests for /assets/*.js and *.css (which carry an
// Origin header) were refused with 403, leaving a blank page.
const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');

describe('website served by the API server (single-service deploy)', () => {
  let dist;
  let app;
  const saved = {};

  beforeAll(() => {
    dist = fs.mkdtempSync(path.join(os.tmpdir(), 'pgd-dist-'));
    fs.mkdirSync(path.join(dist, 'assets'));
    fs.writeFileSync(path.join(dist, 'index.html'), '<!doctype html><script type="module" src="/assets/app.js"></script>');
    fs.writeFileSync(path.join(dist, 'assets', 'app.js'), 'console.log(1)');
    fs.writeFileSync(path.join(dist, 'assets', 'app.css'), 'body{}');
    for (const k of ['NODE_ENV', 'CLIENT_DIST', 'CORS_ORIGINS', 'APP_URL']) saved[k] = process.env[k];
    process.env.NODE_ENV = 'production';
    process.env.CLIENT_DIST = dist;
    process.env.APP_URL = 'https://pg-drisya.onrender.com';
    delete process.env.CORS_ORIGINS;
    jest.isolateModules(() => { app = require('../../src/app').createApp(); });
  });

  afterAll(() => {
    for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
    fs.rmSync(dist, { recursive: true, force: true });
  });

  test('page, scripts and styles load even though the browser sends an Origin header', async () => {
    const origin = 'https://pg-drisya.onrender.com';
    const js = await request(app).get('/assets/app.js').set('Host', 'pg-drisya.onrender.com').set('Origin', origin);
    expect(js.status).toBe(200);
    expect(js.headers['content-type']).toMatch(/javascript/);
    const css = await request(app).get('/assets/app.css').set('Host', 'pg-drisya.onrender.com').set('Origin', origin);
    expect(css.status).toBe(200);
    expect(css.headers['content-type']).toMatch(/css/);
    // A foreign site can still load public files (as it could with any website)…
    expect((await request(app).get('/assets/app.js').set('Origin', 'https://evil.example')).status).toBe(200);
  });

  test('the API accepts its own site and APP_URL, and still refuses other origins', async () => {
    const own = await request(app).get('/api/health').set('Host', 'pg-drisya.onrender.com').set('Origin', 'https://pg-drisya.onrender.com');
    expect(own.status).not.toBe(403);
    const viaAppUrl = await request(app).get('/api/health').set('Host', 'internal:10000').set('Origin', 'https://pg-drisya.onrender.com');
    expect(viaAppUrl.status).not.toBe(403);
    const evil = await request(app).get('/api/health').set('Host', 'pg-drisya.onrender.com').set('Origin', 'https://evil.example');
    expect(evil.status).toBe(403);
  });
});
