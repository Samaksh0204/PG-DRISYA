import { test, expect, type Page } from '@playwright/test';
import { login, openListing, reseed, TENANT } from './helpers';

// Regression: the Leaflet map (panes z-index 200–1000) used to paint over the
// visit-request dialog. Every point of the dialog that sits over the map must hit
// the dialog, at desktop and phone sizes, after repeated open/close.
test.beforeEach(reseed);

async function dialogCoversMap(page: Page) {
  return page.evaluate(() => {
    const d = document.querySelector('[role=dialog]')!;
    const mapEl = document.querySelector('.leaflet-container')!;
    // Line the map up behind the dialog (the trigger may have scrolled it away).
    const before = d.getBoundingClientRect();
    window.scrollBy(0, mapEl.getBoundingClientRect().top - before.top);
    const map = mapEl.getBoundingClientRect();
    const r = d.getBoundingClientRect();
    let total = 0;
    let onMap = 0;
    for (let y = Math.max(r.top, map.top) + 4; y < Math.min(r.bottom, map.bottom, innerHeight); y += 15) {
      for (let x = r.left + 4; x < r.right; x += 30) {
        total += 1;
        const hit = document.elementFromPoint(x, y);
        if (!hit || !d.contains(hit)) onMap += 1;
      }
    }
    return { total, onMap };
  });
}

for (const size of [{ width: 1280, height: 800 }, { width: 375, height: 740 }]) {
  test(`map never covers the visit dialog (${size.width}px)`, async ({ page }) => {
    await page.setViewportSize(size);
    await login(page, TENANT);
    await openListing(page, 'Sunshine Girls PG - Vijay Nagar');
    const map = page.locator('.leaflet-container');
    await map.scrollIntoViewIfNeeded();
    await page.evaluate(() => document.querySelector('.leaflet-container')!.scrollIntoView({ block: 'center' }));

    const trigger = page.getByRole('button', { name: 'Book a visit' }).first();
    for (let i = 0; i < 3; i++) {
      await trigger.click();
      const dialog = page.getByRole('dialog', { name: 'Book a visit' });
      await expect(dialog).toBeVisible();
      const { total, onMap } = await dialogCoversMap(page);
      expect(total).toBeGreaterThan(0);
      expect(onMap).toBe(0);
      // Background can't be clicked while open.
      expect(await page.evaluate(() => document.getElementById('root')!.inert)).toBe(true);
      await expect(dialog.getByRole('button', { name: 'Request visit' })).toBeInViewport();
      if (i === 0) await page.keyboard.press('Escape');
      else await dialog.getByRole('button', { name: 'Cancel' }).click();
      await expect(dialog).toBeHidden();
    }
    await expect(trigger).toBeFocused();
  });
}
