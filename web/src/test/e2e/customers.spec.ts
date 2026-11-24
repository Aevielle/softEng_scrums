import path from 'node:path';
import { expect, test } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

import users from '../test-users.json';

const testedDate = new Date().toISOString().slice(0, 10);

function getSupabaseClient() {
  dotenv.config({ path: '.env.test', quiet: true });
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey);
}

async function cleanupThrowawayCustomers() {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  try {
    await supabase.from('customer').delete().ilike('custname', 'E2E-%');
  } catch (err) {
    console.warn('Could not clean up E2E customers:', err);
  }
}

async function grantCustomerRightToUser(email: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  try {
    const { data: user } = await supabase
      .from('app_user')
      .select('user_id')
      .eq('email', email)
      .maybeSingle();
    if (!user) return;

    const { data: right } = await supabase
      .from('rights_catalogue')
      .select('right_id')
      .eq('right_name', 'Add Customer')
      .maybeSingle();
    if (!right) return;

    await supabase
      .from('user_permission')
      .upsert({ user_id: user.user_id, right_id: right.right_id, is_deleted: false });
  } catch (err) {
    console.warn('Could not grant customer right to user:', err);
  }
}

async function clearUserCustomerRights(email: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  try {
    const { data: user } = await supabase
      .from('app_user')
      .select('user_id')
      .eq('email', email)
      .maybeSingle();
    if (!user) return;

    await supabase
      .from('user_permission')
      .delete()
      .eq('user_id', user.user_id);
  } catch (err) {
    console.warn('Could not clear user rights:', err);
  }
}

async function saveScreenshot(page: import('@playwright/test').Page, testName: string, status: 'pass' | 'fail') {
  try {
    await page.screenshot({
      path: path.join(__dirname, 'screenshots', `${testName}-${status}-${testedDate}.png`),
      fullPage: true,
    });
  } catch (err) {
    console.warn(`Failed to capture screenshot for ${testName}:`, err);
  }
}

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

test.describe('Customers E2E & API Specification (S2-TST-01)', () => {
  test.describe.configure({ mode: 'serial', timeout: 60_000 });

  test.beforeAll(async () => {
    await cleanupThrowawayCustomers();
  });

  test.afterAll(async () => {
    await cleanupThrowawayCustomers();
    await clearUserCustomerRights(users.regularUser.email);
  });

  test('CUS-01: A caller who is not signed in is blocked (401 UNAUTHENTICATED)', async ({ request }) => {
    // 1. Call GET /api/customers without a session
    const res = await request.get('/api/customers');
    expect(res.status()).toBe(401);

    const body = await res.json();
    expect(body.code).toBe('UNAUTHENTICATED');
    expect(body).not.toHaveProperty('customers');
  });

  test('CUS-18: A non-JSON request is rejected with 415', async ({ page }) => {
    let testStatus: 'pass' | 'fail' = 'fail';
    try {
      // Sign in as Admin who holds Add Customer rights
      await login(page, users.admin);

      // 1. Send POST with a non-JSON content type (e.g. text/plain)
      const res = await page.request.post('/api/customers', {
        headers: { 'Content-Type': 'text/plain' },
        data: 'custname=E2E-NonJson&address=Manila&payterm=COD',
      });

      expect(res.status()).toBe(415);
      const body = await res.json();
      expect(body.code).toBe('INVALID');
      expect(body.message).toMatch(/JSON/i);

      testStatus = 'pass';
    } finally {
      await saveScreenshot(page, 'CUS-18-non-json-rejected', testStatus);
    }
  });

  test('CUS-25: A User sees no Status or Stamp in the UI', async ({ page }) => {
    let testStatus: 'pass' | 'fail' = 'fail';
    try {
      // Ensure regular user has the Add Customer right so /customers page can be opened
      await grantCustomerRightToUser(users.regularUser.email);

      // 1. Sign in as User
      await login(page, users.regularUser);

      // 2. Open Customers
      await page.goto('/customers');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/\/customers$/);

      // 3. Review columns and filters:
      // No Status column in table headers
      await expect(page.locator('thead th', { hasText: /^Status$/i })).toHaveCount(0);
      // No Stamp column in table headers
      await expect(page.locator('thead th', { hasText: /^Stamp$/i })).toHaveCount(0);
      // No Status filter tabs (Active, Inactive, All tabs)
      await expect(page.locator('[role="tablist"]')).toHaveCount(0);
      // No Status cards / Customer totals
      await expect(page.locator('section[aria-label="Customer totals"]')).toHaveCount(0);

      testStatus = 'pass';
    } finally {
      await saveScreenshot(page, 'CUS-25-user-no-status-stamp', testStatus);
    }
  });

  test('CUS-03 & CUS-06: Admin sees Status, Stamp, totals and can filter by status', async ({ page }) => {
    let testStatus: 'pass' | 'fail' = 'fail';
    try {
      // 1. Sign in as Admin
      await login(page, users.admin);

      // 2. Open Customers
      await page.goto('/customers');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/\/customers$/);

      // Admin sees Status and Stamp table headers
      await expect(page.locator('thead th', { hasText: /^Status$/i })).toBeVisible();
      await expect(page.locator('thead th', { hasText: /^Stamp$/i })).toBeVisible();

      // Admin sees Customer totals section
      await expect(page.locator('section[aria-label="Customer totals"]')).toBeVisible();

      // Admin sees Status filter tabs (Active, Inactive, All)
      const tabs = page.locator('[role="tablist"]');
      await expect(tabs).toBeVisible();
      await expect(page.getByRole('tab', { name: /^Active/i })).toBeVisible();
      await expect(page.getByRole('tab', { name: /^Inactive/i })).toBeVisible();
      await expect(page.getByRole('tab', { name: /^All/i })).toBeVisible();

      // Click Active tab and verify filter operates
      await page.getByRole('tab', { name: /^Active/i }).click();
      await expect(page.getByRole('tab', { name: /^Active/i })).toHaveAttribute('aria-selected', 'true');

      testStatus = 'pass';
    } finally {
      await saveScreenshot(page, 'CUS-03-CUS-06-admin-status-stamp-filter', testStatus);
    }
  });

  test('CUS-13 & CUS-14: Adding a customer flow via UI with validation', async ({ page }) => {
    let testStatus: 'pass' | 'fail' = 'fail';
    try {
      // 1. Sign in as Admin
      await login(page, users.admin);
      await page.goto('/customers');
      await page.waitForLoadState('networkidle');

      // 2. Click Add Customer button
      const addBtn = page.getByRole('button', { name: '+ Add Customer', exact: true });
      await expect(addBtn).toBeVisible();
      await addBtn.click();

      // Dialog appears
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole('heading', { name: /Add customer/i })).toBeVisible();

      // CUS-14: Empty submission validation
      await dialog.getByRole('button', { name: 'Save customer', exact: true }).click();
      await expect(page.getByText(/Please fill in:/i)).toBeVisible();

      // CUS-13: Fill valid customer data (starts with E2E-)
      await dialog.locator('#cf-name').fill('E2E-Acme Testing');
      await dialog.locator('#cf-address').fill('123 Test Street, Suite 400');
      await dialog.locator('#cf-terms').selectOption('COD');

      await dialog.getByRole('button', { name: 'Save customer', exact: true }).click();

      // Verify success notification and row appears in table
      await expect(page.getByText(/Customer .* added\./i)).toBeVisible();
      await expect(page.getByRole('cell', { name: 'E2E-Acme Testing' })).toBeVisible();

      testStatus = 'pass';
    } finally {
      await saveScreenshot(page, 'CUS-13-CUS-14-add-customer', testStatus);
    }
  });
});
