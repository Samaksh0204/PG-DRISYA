import { expect, type Page } from '@playwright/test';

export const PASSWORD = 'password123';
export const TENANT = 'priya@example.com';
export const TENANT2 = 'rohit@example.com';
export const OWNER = 'anjali@example.com';
export const OWNER2 = 'vikram@example.com';
export const ADMIN = 'admin@example.com';

export async function reseed() {
  const res = await fetch('http://localhost:5056/reseed', { method: 'POST' });
  expect(res.ok).toBeTruthy();
}

export async function outbox(): Promise<{ to: string; subject: string; actionUrl?: string }[]> {
  return (await fetch('http://localhost:5056/outbox')).json();
}

export async function lastLink(to: string, subjectRe: RegExp): Promise<string> {
  const mails = (await outbox()).filter((m) => m.to === to && subjectRe.test(m.subject));
  expect(mails.length, `email "${subjectRe}" to ${to}`).toBeGreaterThan(0);
  return mails[mails.length - 1].actionUrl!;
}

export async function login(page: Page, email: string, password = PASSWORD) {
  await page.goto('/#/login');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.locator('#main').getByRole('button', { name: /^Log in/ }).click();
  await expect(page).not.toHaveURL(/#\/login/);
}

export async function logout(page: Page) {
  await page.evaluate(() => localStorage.removeItem('drisya_token'));
  await page.goto('/#/');
  await page.reload();
}

export async function openListing(page: Page, title: string) {
  await page.goto(`/#/search?q=${encodeURIComponent(title)}`);
  await page.getByRole('article', { name: title }).first().click();
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
}
