import { expect, test } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import users from '../test-users.json';

async function login(page: import('@playwright/test').Page, account: { email: string; password: string }) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.getByLabel('Email').fill(account.email);
  await page.locator('#loginPassword').fill(account.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  const verification = page.getByRole('heading', { name: 'Verify your identity' });
  await Promise.race([
    verification.waitFor({ state: 'visible' }).then(() => 'verify'),
    page.getByText('Sign in successful').waitFor({ state: 'visible' }).then(() => 'success'),
  ]);

  if (await verification.isVisible()) {
    const demoCode = await page.locator('p', { hasText: 'Demo code:' }).locator('strong').textContent();
    if (!demoCode || !/^\d{6}$/.test(demoCode)) throw new Error('Verification code was not found.');
    for (let i = 0; i < 6; i++) {
      await page.getByLabel(`Digit ${i + 1}`).fill(demoCode[i]);
    }
    await page.getByRole('button', { name: 'Verify code', exact: true }).click();
  }

  await expect(page.getByText('Sign in successful')).toBeVisible();
  await page.getByRole('button', { name: 'Proceed to Dashboard' }).click();
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/dashboard$/);
}

test.describe('role rights - real registered and approved accounts', () => {
  test.describe.configure({ mode: 'serial', timeout: 60_000 });

  test.beforeAll(async () => {
    dotenv.config({ path: '.env.test', quiet: true });
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) throw new Error('Missing Supabase test environment variables.');

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: user } = await supabase
      .from('app_user')
      .select('user_id')
      .eq('email', users.regularUser.email)
      .maybeSingle();
    if (!user) throw new Error('Regular test account was not found.');

    const { error } = await supabase
      .from('user_permission')
      .delete()
      .eq('user_id', user.user_id);
    if (error) throw new Error(`Could not clear User rights: ${error.message}`);
  });

  test('Superadmin sees all modules and administration menus', async ({ page }) => {
    await login(page, users.superadmin);
    await expect(page.getByRole('link', { name: 'Customers', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Products', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Human Resources', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Sales', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Reports', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'User Management', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'System Settings', exact: true })).toBeVisible();
  });

  test('Admin sees business modules and User Management but not System Settings', async ({ page }) => {
    await login(page, users.admin);
    await expect(page.getByRole('link', { name: 'Customers', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Products', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Human Resources', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Sales', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Reports', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'User Management', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'System Settings', exact: true })).toHaveCount(0);
  });

  test('User with no granted rights sees no business or administration menus', async ({ page }) => {
    await login(page, users.regularUser);
    for (const label of ['Customers', 'Products', 'Human Resources', 'Sales', 'Reports', 'User Management', 'System Settings']) {
      await expect(page.getByRole('link', { name: label, exact: true })).toHaveCount(0);
    }
  });

  test('Superadmin sees customer right buttons', async ({ page }) => {
    await login(page, users.superadmin);
    await page.goto('/customers');
    await expect(page.getByRole('button', { name: '+ Add Customer', exact: true })).toBeVisible();
  });

  test('Admin sees customer right buttons', async ({ page }) => {
    await login(page, users.admin);
    await page.goto('/customers');
    await expect(page.getByRole('button', { name: '+ Add Customer', exact: true })).toBeVisible();
  });

  test('User with no rights cannot open hidden modules or actions directly', async ({ page }) => {
    await login(page, users.regularUser);

    await page.goto('/customers');
    await expect(page).toHaveURL(/\/dashboard\?denied=customers/);
    await expect(page.getByRole('button', { name: '+ Add Customer', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Edit', exact: true })).toHaveCount(0);

    await page.goto('/users');
    await expect(page).toHaveURL(/\/dashboard\?denied=users/);
  });

  test('Superadmin direct API requests are allowed', async ({ page }) => {
    await login(page, users.superadmin);
    const superadminCustomers = await page.request.get('/api/customers');
    expect(superadminCustomers.status()).toBe(200);
    const superadminUsers = await page.request.get('/api/users');
    expect(superadminUsers.status()).toBe(200);
  });

  test('Admin direct API requests are allowed', async ({ page }) => {
    await login(page, users.admin);
    const adminCustomers = await page.request.get('/api/customers');
    expect(adminCustomers.status()).toBe(200);
    const adminUsers = await page.request.get('/api/users');
    expect(adminUsers.status()).toBe(200);
  });

  test('User direct API requests are refused for hidden rights', async ({ page }) => {
    await login(page, users.regularUser);
    const userCustomers = await page.request.get('/api/customers');
    expect(userCustomers.status()).toBe(403);
    const userProducts = await page.request.get('/api/products');
    expect(userProducts.status()).toBe(403);
    const userUsers = await page.request.get('/api/users');
    expect(userUsers.status()).toBe(403);
  });
});
