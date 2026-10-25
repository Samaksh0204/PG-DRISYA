import { defineConfig, devices } from '@playwright/test';

// Browser tests against the real API + an in-memory MongoDB.
// Run `npm run build` first (the API serves client/dist), then `npm run test:e2e`.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5055',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    timezoneId: 'Asia/Kolkata',
    locale: 'en-IN',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] }, testIgnore: /mobile\.spec\.ts/ },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testMatch: /mobile\.spec\.ts/ },
  ],
  webServer: {
    command: 'node e2e/start-stack.cjs',
    url: 'http://localhost:5055/api/health',
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: 'pipe',
  },
});
