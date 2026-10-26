import { test, expect } from '@playwright/test';
import { reseed, login, logout, lastLink } from './helpers';

test.beforeAll(reseed);

const EMAIL = `e2e_${Date.now()}@example.com`;

test('sign up → onboarding saved → confirm email → change & reset password → delete account', async ({ page }) => {
  await page.goto('/#/login?mode=signup');
  await page.getByLabel('Full name').fill('Kavya Iyer');
  await page.getByLabel('Email address').fill(EMAIL);
  await page.getByLabel('Password', { exact: true }).fill('Kavya2026');
  await page.getByRole('button', { name: /Create account/ }).click();
  await expect(page.getByRole('alert')).toContainText('Terms of Service');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: /Create account/ }).click();

  await expect(page.getByText(/We sent a confirmation link/)).toBeVisible();
  await page.getByLabel('City').fill('Indore');
  await page.getByLabel('College or workplace').fill('DAVV');
  await page.getByRole('button', { name: 'Start searching' }).click();
  await expect(page).toHaveURL(/#\/search/);

  // Booking is blocked until the email is confirmed
  await page.goto('/#/dashboard');
  await expect(page.getByText(/Please confirm your email/)).toBeVisible();

  // Onboarding answers were really saved (regression: they used to be thrown away)
  await page.goto('/#/profile/edit');
  await expect(page.getByLabel('City')).toHaveValue('Indore');
  await expect(page.getByLabel('College / workplace')).toHaveValue('DAVV');

  // Editing one field keeps the others (regression: the edit page used to wipe them)
  await page.getByLabel('Mobile number').fill('9811122233');
  await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(page.getByText('Profile saved')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('City')).toHaveValue('Indore');
  await expect(page.getByLabel('Mobile number')).toHaveValue('9811122233');

  // Confirm email via the link in the email
  const verify = await lastLink(EMAIL, /Confirm your email/);
  await page.goto(verify.replace('http://localhost:5055', ''));
  await expect(page.getByRole('heading', { name: 'Email confirmed' })).toBeVisible();

  // Change password
  await page.goto('/#/profile/edit');
  await page.getByLabel('Current password').fill('Kavya2026');
  await page.getByLabel('New password').fill('Kavya2027');
  await page.getByRole('button', { name: 'Change password' }).click();
  await expect(page.getByText(/Other devices have been logged out/)).toBeVisible();

  // Forgot password → reset via emailed link
  await logout(page);
  await page.goto('/#/login');
  await page.getByRole('button', { name: 'Forgot password?' }).click();
  // The reset page loads on demand; wait for it, or "Email address" can still match the login form.
  await expect(page.getByRole('heading', { name: 'Reset your password' })).toBeVisible();
  await page.getByLabel('Email address').fill(EMAIL);
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await expect(page.getByText(/a reset link has been sent/)).toBeVisible();
  const reset = await lastLink(EMAIL, /Reset your/);
  await page.goto(reset.replace('http://localhost:5055', ''));
  await page.getByLabel('New password', { exact: true }).fill('Fresh2028');
  await page.getByLabel('Confirm new password').fill('Fresh2028');
  await page.getByRole('button', { name: 'Update password' }).click();
  await expect(page.getByText(/Password updated/)).toBeVisible();

  // Old password no longer works, new one does
  await page.goto('/#/login');
  await page.getByLabel('Email address').fill(EMAIL);
  await page.getByLabel('Password', { exact: true }).fill('Kavya2027');
  await page.locator('#main').getByRole('button', { name: /^Log in/ }).click();
  await expect(page.getByRole('alert')).toContainText('Invalid email or password');
  await login(page, EMAIL, 'Fresh2028');

  // Delete account
  await page.goto('/#/profile/edit');
  await page.getByRole('button', { name: /Delete my account/ }).click();
  await page.getByRole('dialog').getByLabel('Password').fill('Fresh2028');
  await page.getByRole('button', { name: 'Delete forever' }).click();
  await expect(page.getByText('Your account has been deleted')).toBeVisible();
  await page.goto('/#/login');
  await page.getByLabel('Email address').fill(EMAIL);
  await page.getByLabel('Password', { exact: true }).fill('Fresh2028');
  await page.locator('#main').getByRole('button', { name: /^Log in/ }).click();
  await expect(page.getByRole('alert')).toContainText('Invalid email or password');
});

test('a tenant can become a host from the same account', async ({ page }) => {
  await login(page, 'rohit@example.com');
  await page.goto('/#/owner');
  await page.getByRole('button', { name: 'Become a host' }).click();
  await expect(page.getByRole('heading', { name: 'Host dashboard' })).toBeVisible();
});

test('stale session (password changed elsewhere) logs out cleanly', async ({ page, request }) => {
  await login(page, 'priya@example.com');
  // Change the password through the API with a separate session.
  const res = await request.post('/api/auth/login', { data: { email: 'priya@example.com', password: 'password123' } });
  const { token } = await res.json();
  await request.post('/api/auth/change-password', { headers: { Authorization: `Bearer ${token}` }, data: { currentPassword: 'password123', newPassword: 'Changed123' } });
  await page.goto('/#/notifications');
  await page.reload();
  await expect(page.getByText('Sign in required')).toBeVisible();
});
