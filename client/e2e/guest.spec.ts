import { test, expect } from '@playwright/test';
import { reseed, openListing } from './helpers';

test.beforeAll(reseed);

test('homepage shows real listings and live stats, no fake testimonials', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /home away from home/i })).toBeVisible();
  await expect(page.getByText('PGs listed')).toBeVisible();
  await expect(page.getByRole('article').first()).toBeVisible();
  await expect(page.getByText(/What our tenants say/i)).toHaveCount(0);
  await expect(page.getByText(/Instant Booking with secure online payments/i)).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Cities on Drisya' })).toBeVisible();
});

test('search: free text, filters, sort and empty state', async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder('City, locality or college').first().fill('Bhopal');
  await page.getByRole('button', { name: 'Search' }).first().click();
  await expect(page).toHaveURL(/#\/search\?q=Bhopal/);
  await expect(page.getByText(/2 PGs found/)).toBeVisible();

  await page.getByRole('button', { name: 'Women' }).click();
  await expect(page.getByText(/1 PG found/)).toBeVisible();
  await expect(page.getByRole('article', { name: 'Comfort Zone Girls Hostel' })).toBeVisible();

  await page.getByLabel('Search', { exact: true }).fill('');
  await page.getByRole('button', { name: 'Anyone' }).click();
  await page.getByLabel('Sort').selectOption('price_asc');
  const prices = await page.locator('article').evaluateAll((els) => els.map((e) => Number((e.textContent || '').match(/₹([\d,]+)/)?.[1].replace(/,/g, ''))));
  expect(prices).toEqual([...prices].sort((a, b) => a - b));

  await page.getByLabel('Search', { exact: true }).fill('no-such-place-xyz');
  await expect(page.getByText('No PGs match your search')).toBeVisible();
});

test('map view shows price pins for listings with coordinates', async ({ page }) => {
  await page.goto('/#/search');
  await page.getByRole('button', { name: 'Map view' }).click();
  await expect(page.locator('.leaflet-container')).toBeVisible();
  await expect(page.locator('.leaflet-marker-icon').first()).toBeVisible();
  expect(await page.locator('.leaflet-marker-icon').count()).toBeGreaterThanOrEqual(5);
});

test('listing page: rules, price breakdown, reviews, contact hidden for guests', async ({ page }) => {
  await openListing(page, 'Sunshine Girls PG - Vijay Nagar');
  await expect(page.getByRole('heading', { name: 'House rules' })).toBeVisible();
  await expect(page.getByText('Gate closes at 10:30 PM')).toBeVisible();
  await expect(page.getByText('Due at move-in')).toBeVisible();
  await expect(page.getByText('₹23,500')).toBeVisible(); // 8,500 + 15,000
  await expect(page.getByRole('button', { name: /Book instantly/ })).toBeVisible();
  await expect(page.getByText('Stayed here').first()).toBeVisible();
  await expect(page.getByText(/phone number is shown after a confirmed visit/)).toBeVisible();
  await expect(page.getByText('9876543212')).toHaveCount(0);

  // Guest actions lead to login
  await page.getByRole('button', { name: /Book a visit/ }).click();
  await expect(page).toHaveURL(/#\/login/);
});

test('host profile is public but hides contact details', async ({ page }) => {
  await openListing(page, 'Sunshine Girls PG - Vijay Nagar');
  await page.getByRole('button', { name: /View Anjali Sharma's profile/ }).click();
  await expect(page.getByRole('heading', { name: 'Anjali Sharma' })).toBeVisible();
  // Admin host check and identity verification are shown separately.
  await expect(page.getByText('Host checked by the Drisya team')).toBeVisible();
  await expect(page.getByText(/Identity verified through/)).toHaveCount(0);
  await expect(page.getByText('anjali@example.com')).toHaveCount(0);
});

test('legal, help and 404 pages', async ({ page }) => {
  await page.goto('/#/privacy');
  await expect(page.getByRole('heading', { name: 'Privacy Policy' })).toBeVisible();
  await expect(page.getByText(/Digital Personal Data Protection Act/).first()).toBeVisible();
  await page.goto('/#/terms');
  await expect(page.getByRole('heading', { name: 'Terms of Service' })).toBeVisible();
  await page.goto('/#/help');
  await page.getByRole('button', { name: 'How does booking work?' }).click();
  await expect(page.getByText(/Instant Book are confirmed immediately/)).toBeVisible();
  await page.goto('/#/definitely-not-a-page');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  await expect(page).toHaveTitle(/Not found/);
});

test('expert request form saves the request', async ({ page }) => {
  await page.goto('/#/expert');
  await page.getByLabel('Your name').fill('Neha');
  await page.getByRole('button', { name: /Send request/ }).click();
  await expect(page.getByRole('alert')).toContainText('email or a 10-digit phone');
  await page.getByLabel('Phone').fill('9876500000');
  await page.getByLabel('City').fill('Indore');
  await page.getByRole('button', { name: /Send request/ }).click();
  await expect(page.getByText('Request received')).toBeVisible();
});
