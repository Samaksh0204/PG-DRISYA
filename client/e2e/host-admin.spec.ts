import { test, expect } from '@playwright/test';
import { reseed, login, logout, openListing, OWNER2, ADMIN, TENANT } from './helpers';

test.beforeAll(reseed);

test('host lists a PG → admin rejects → host fixes → admin approves & verifies → it appears in search', async ({ page }) => {
  // Cloudinary isn't configured in tests, so photo uploads are answered with a fake URL.
  await page.route('**/api/upload', (route) => route.fulfill({ json: { urls: ['https://res.cloudinary.com/demo/image/upload/sample.jpg'] } }));

  await login(page, OWNER2);
  await page.getByRole('button', { name: /Add listing/ }).first().click();
  const d = page.getByRole('dialog', { name: 'Add a new listing' });
  await d.getByRole('button', { name: /Next/ }).click();
  await expect(d.getByRole('alert')).toContainText('title');
  await d.getByLabel('Title').fill('Riverside Boys PG');
  await d.getByLabel('City').fill('Bhopal');
  await d.getByLabel('Locality').fill('Kolar Road');
  await d.getByLabel('Monthly rent (₹)').fill('6500');
  await d.getByLabel('Security deposit (₹)').fill('10000');
  await d.getByLabel('For').selectOption('male');
  await d.getByRole('button', { name: /Next/ }).click();
  await d.getByLabel('Rooms available now').fill('3');
  await d.getByRole('button', { name: 'Wi-Fi' }).click();
  await d.getByRole('button', { name: 'Mess / Meals' }).click();
  await d.getByLabel(/House rules/).fill('Gate closes at 11 PM\nNo smoking');
  await d.getByRole('button', { name: /Next/ }).click();
  await d.getByLabel('Latitude').fill('23.1765');
  await d.getByLabel('Longitude').fill('77.4126');
  await d.getByRole('button', { name: /Next/ }).click();
  await d.getByRole('button', { name: 'Submit for review' }).click();
  await expect(d.getByRole('alert')).toContainText('at least one photo');
  await d.locator('input[type=file]').setInputFiles({ name: 'room.jpg', mimeType: 'image/jpeg', buffer: Buffer.from([0xff, 0xd8, 0xff]) });
  await expect(d.getByAltText('Photo 1')).toBeVisible();
  await d.getByRole('button', { name: 'Submit for review' }).click();
  await expect(page.getByText(/Submitted! Our team will review it/)).toBeVisible();

  // Not public yet
  await page.goto('/#/search?q=Riverside');
  await expect(page.getByText('No PGs match your search')).toBeVisible();

  // Admin rejects
  await logout(page);
  await login(page, ADMIN);
  await expect(page).toHaveURL(/#\/admin/);
  const card = page.locator('.card', { hasText: 'Riverside Boys PG' });
  await card.getByRole('button', { name: 'Reject' }).click();
  await page.getByRole('dialog').getByRole('textbox').fill('Please add photos of the washroom');
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm' }).click();
  await expect(page.getByText('Rejected — owner notified')).toBeVisible();

  // Host sees why, edits, resubmits
  await logout(page);
  await login(page, OWNER2);
  await page.getByRole('tab', { name: /Listings/ }).click();
  await expect(page.getByText(/Please add photos of the washroom/)).toBeVisible();
  await page.locator('.card', { hasText: 'Riverside Boys PG' }).getByRole('button', { name: 'Edit' }).click();
  const e = page.getByRole('dialog', { name: 'Edit listing' });
  for (let i = 0; i < 3; i++) await e.getByRole('button', { name: /Next/ }).click();
  await e.locator('input[type=file]').setInputFiles({ name: 'washroom.jpg', mimeType: 'image/jpeg', buffer: Buffer.from([0xff, 0xd8, 0xff]) });
  await e.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.locator('.card', { hasText: 'Riverside Boys PG' }).getByText('Awaiting review')).toBeVisible();

  // Admin approves + marks inspected
  await logout(page);
  await login(page, ADMIN);
  await page.locator('.card', { hasText: 'Riverside Boys PG' }).getByRole('button', { name: 'Approve' }).click();
  await expect(page.getByText('Done: approve')).toBeVisible();
  await page.getByLabel('Status filter').selectOption('active');
  await page.locator('.card', { hasText: 'Riverside Boys PG' }).getByRole('button', { name: 'Mark inspected' }).click();
  await expect(page.getByText('Done: verify')).toBeVisible();

  // Public now, with the Verified badge and house rules
  await logout(page);
  await openListing(page, 'Riverside Boys PG');
  await expect(page.getByText('Drisya Verified')).toBeVisible();
  await expect(page.getByText('Gate closes at 11 PM')).toBeVisible();
});

test('visit → owner marks visited → tenant reviews → owner replies publicly', async ({ page }) => {
  await login(page, TENANT);
  await openListing(page, 'Student Hub PG - Bhawarkua');
  await page.getByRole('button', { name: /Book a visit/ }).click();
  const v = page.getByRole('dialog', { name: 'Book a visit' });
  await v.getByRole('button', { name: 'Today' }).click();
  await v.getByRole('button', { name: '06:00 PM' }).click();
  await v.getByRole('button', { name: 'Request visit' }).click();
  await expect(page.getByRole('dialog', { name: 'Visit requested' })).toBeVisible();

  await logout(page);
  await login(page, 'anjali@example.com');
  await page.getByRole('tab', { name: /Visits/ }).click();
  await page.getByRole('button', { name: 'Confirm' }).click();
  await page.getByRole('button', { name: 'Mark visited' }).click();
  await expect(page.getByText(/the tenant can now review/)).toBeVisible();

  await logout(page);
  await login(page, TENANT);
  await page.goto('/#/dashboard?tab=visits');
  await page.getByRole('button', { name: /Review/ }).click();
  const r = page.getByRole('dialog', { name: /Review Student Hub/ });
  await r.getByRole('radiogroup', { name: 'Overall rating' }).getByRole('radio', { name: '4 stars' }).click();
  await r.getByRole('radiogroup', { name: 'Food rating' }).getByRole('radio', { name: '5 stars' }).click();
  await r.getByLabel('Review').fill('Great food and a quiet study room.');
  await r.getByRole('button', { name: 'Post review' }).click();
  await expect(page.getByText('Thanks for your review!')).toBeVisible();
  await expect(page.getByText('Great food and a quiet study room.')).toBeVisible();

  await logout(page);
  await login(page, 'anjali@example.com');
  await page.getByRole('tab', { name: /Reviews/ }).click();
  await page.locator('.card', { hasText: 'Great food and a quiet study room.' }).getByRole('button', { name: 'Reply publicly' }).click();
  await page.getByPlaceholder(/Thank the guest/).fill('Thank you, Priya! Hope to see you again.');
  await page.getByRole('button', { name: 'Post reply' }).click();
  await expect(page.getByText('Reply posted')).toBeVisible();

  await openListing(page, 'Student Hub PG - Bhawarkua');
  await expect(page.getByText('Response from the owner')).toBeVisible();
  await expect(page.getByText('Thank you, Priya! Hope to see you again.')).toBeVisible();
});

test('report a listing → admin takes it down', async ({ page }) => {
  await login(page, 'rohit@example.com');
  await openListing(page, 'Royal Boys PG - MP Nagar');
  await page.getByRole('button', { name: 'Report this listing' }).click();
  await page.getByRole('dialog').getByLabel("It's fake or doesn't exist").check();
  await page.getByRole('dialog').getByRole('button', { name: 'Submit report' }).click();
  await expect(page.getByText('Thanks — our team will review your report.')).toBeVisible();

  await logout(page);
  await login(page, ADMIN);
  await page.getByRole('tab', { name: /Reports/ }).click();
  page.once('dialog', (dlg) => dlg.accept());
  await page.getByRole('button', { name: 'Take down & resolve' }).click();
  await expect(page.getByText('Report resolved')).toBeVisible();
  await logout(page);
  await page.goto('/#/search?q=Royal');
  await expect(page.getByText('No PGs match your search')).toBeVisible();
});
