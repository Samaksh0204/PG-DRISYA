import { test, expect } from '@playwright/test';
import { reseed, login, logout, openListing, TENANT, OWNER } from './helpers';

test.beforeAll(reseed);

const LISTING = 'Green Valley Co-ed Hostel'; // request-to-book (not instant), owner Anjali

test('tenant ↔ owner: wishlist, visit, booking request, message, accept, contact revealed', async ({ page }) => {
  // ── Tenant ──
  await login(page, TENANT);
  await openListing(page, LISTING);

  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Saved to your wishlist')).toBeVisible();

  await page.getByRole('button', { name: /Book a visit/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Book a visit' });
  await dialog.getByRole('button').filter({ hasText: /\d/ }).nth(1).click(); // tomorrow
  await dialog.getByRole('button', { name: '11:00 AM' }).click();
  await dialog.getByRole('button', { name: 'Request visit' }).click();
  await expect(page.getByRole('dialog', { name: 'Visit requested' })).toBeVisible();
  await page.getByRole('button', { name: 'Close', exact: true }).first().click();

  await page.getByRole('button', { name: /Message owner/ }).click();
  await page.getByRole('dialog').getByLabel('Message').fill('Hi! Is a single room free from next month?');
  await page.getByRole('dialog').getByRole('button', { name: 'Send' }).click();
  await expect(page.getByRole('dialog', { name: 'Message sent' })).toBeVisible();
  await page.keyboard.press('Escape');

  await page.getByPlaceholder(/Introduce yourself/).fill('Software engineer, moving from Pune.');
  await page.getByRole('button', { name: 'Request to book' }).click();
  await expect(page).toHaveURL(/#\/dashboard\?tab=trips/);
  await expect(page.getByText(LISTING)).toBeVisible();
  await expect(page.getByText('Waiting for the owner to respond.')).toBeVisible();

  await page.getByRole('tab', { name: /Wishlist/ }).click();
  await expect(page.getByRole('article', { name: LISTING })).toBeVisible();

  // ── Owner ──
  await logout(page);
  await login(page, OWNER);
  await expect(page).toHaveURL(/#\/owner/);
  await expect(page.getByText('Booking requests waiting for you')).toBeVisible();

  await page.getByRole('tab', { name: /Booking requests/ }).click();
  await expect(page.getByText('"Software engineer, moving from Pune."')).toBeVisible();
  await page.getByRole('button', { name: 'Accept' }).click();
  await expect(page.getByText('Booking accepted')).toBeVisible();
  // Tenant's phone is now visible to the owner on the accepted request
  await expect(page.locator('.card', { hasText: 'Software engineer, moving from Pune.' }).getByText('Phone: 9876543210')).toBeVisible();

  await page.getByRole('tab', { name: /Visits/ }).click();
  await page.getByRole('button', { name: 'Confirm' }).click();
  await expect(page.getByText('Visit confirmed')).toBeVisible();

  await page.goto('/#/messages');
  await page.getByRole('button', { name: /Priya Menon/ }).click();
  await expect(page.locator('p.whitespace-pre-wrap', { hasText: 'Is a single room free from next month?' })).toBeVisible();
  await page.getByLabel('Message', { exact: true }).fill('Yes! Come and see it tomorrow.');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.locator('p.whitespace-pre-wrap', { hasText: 'Yes! Come and see it tomorrow.' })).toBeVisible();

  // ── Tenant sees the result ──
  await logout(page);
  await login(page, TENANT);
  await page.goto('/#/notifications');
  await expect(page.getByText('Booking accepted')).toBeVisible();
  await page.goto('/#/dashboard?tab=trips');
  await expect(page.getByText('accepted', { exact: true })).toBeVisible();
  await openListing(page, LISTING);
  await expect(page.getByRole('link', { name: /Call 9876543212/ })).toBeVisible();
});

test('instant book confirms immediately and tenant can cancel with a reason', async ({ page }) => {
  await login(page, 'rohit@example.com');
  await openListing(page, 'Sunshine Girls PG - Vijay Nagar');
  await page.getByRole('button', { name: /Book instantly/ }).click();
  await expect(page.getByText('Booking confirmed! The owner has been notified.')).toBeVisible();
  await page.getByRole('button', { name: /Cancel/ }).first().click();
  await page.getByRole('dialog').getByPlaceholder(/Reason/).fill('Plans changed');
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel booking' }).click();
  await expect(page.getByText('Booking cancelled')).toBeVisible();
  await expect(page.getByText('Note: Plans changed')).toBeVisible();
});
