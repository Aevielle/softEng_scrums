import { expect, test } from '@playwright/test';

import users from '../test-users.json';

const regularUser = users.regularUser;

test('signs in and opens the dashboard', async ({ page }) => {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.getByLabel('Email').fill(regularUser.email);
  await page.locator('#loginPassword').fill(regularUser.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();

  await expect(page.getByText('Sign in successful')).toBeVisible();
  await page.getByRole('button', { name: 'Proceed to Dashboard' }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText('Welcome back, Regular!')).toBeVisible();
});

test('rejects an incorrect password', async ({ page }) => {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.getByLabel('Email').fill(regularUser.email);
  await page.locator('#loginPassword').fill('definitely-wrong');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();

  await expect(
    page.getByText('Invalid email or password. Please check and try again.')
  ).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});
