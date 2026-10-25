import { test, expect } from '@playwright/test';
import { reseed } from './helpers';

test.beforeAll(reseed);

test('phone layout: menu, search and listing page work without horizontal scroll', async ({ page }) => {
  await page.goto('/');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);

  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.getByRole('button', { name: 'Explore PGs' }).click();
  await expect(page).toHaveURL(/#\/search/);

  await page.getByRole('button', { name: /Filters/ }).click();
  await page.getByRole('button', { name: 'Women' }).click();
  await page.getByRole('button', { name: /Show \d+ PGs/ }).click();
  await page.getByRole('article').first().click();
  await expect(page.getByText('Due at move-in')).toBeVisible();
  const overflow2 = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow2).toBeLessThanOrEqual(1);
});
