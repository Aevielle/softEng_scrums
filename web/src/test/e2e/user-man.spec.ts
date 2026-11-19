import path from 'node:path';
import { expect, test } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

import users from '../test-users.json';

const superAdmin = users.superadmin;
const testedDate = new Date().toISOString().slice(0, 10);

function supabaseAdmin() {
  dotenv.config({ path: '.env.test', quiet: true });
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) throw new Error('Missing Supabase test environment variables.');
  return createClient(supabaseUrl, serviceRoleKey);
}

async function roleId(roleName: string) {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from('role')
    .select('role_id')
    .ilike('role_name', roleName)
    .single();
  if (error || !data) throw new Error(`Could not find role ${roleName}: ${error?.message}`);
  return data.role_id as number;
}

async function createTestUser(options: {
  email: string;
  role: string;
  accountStatus?: string;
  blocked?: boolean;
}) {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from('app_user')
    .insert({
      first_name: 'Playwright',
      last_name: 'Test',
      email: options.email,
      password_hash: await bcrypt.hash('@ValidPass1', 12),
      role_id: await roleId(options.role),
      account_status: options.accountStatus ?? 'active',
      is_blocked: options.blocked ?? false,
      must_change_password: false,
    })
    .select('user_id')
    .single();
  if (error) throw new Error(`Could not create test user: ${error.message}`);
  return data.user_id as number;
}

async function deleteTestUsers(emails: string[]) {
  if (emails.length === 0) return;
  const { error } = await supabaseAdmin()
    .from('app_user')
    .delete()
    .in('email', emails);
  if (error) throw new Error(`Could not clean test users: ${error.message}`);
}

async function login(page: import('@playwright/test').Page, account: { email: string; password: string }) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.getByLabel('Email').fill(account.email);
  await page.locator('#loginPassword').fill(account.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Verify your identity' })).toBeVisible();

  const demoCode = await page.locator('p', { hasText: 'Demo code:' }).locator('strong').textContent();
  if (!demoCode || !/^\d{6}$/.test(demoCode)) throw new Error('Verification code was not found.');

  for (let i = 0; i < 6; i++) {
    await page.getByLabel(`Digit ${i + 1}`).fill(demoCode[i]);
  }
  await page.getByRole('button', { name: 'Verify code', exact: true }).click();
  await expect(page.getByText('Sign in successful')).toBeVisible();
  await page.getByRole('button', { name: 'Proceed to Dashboard' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function openUserManagement(page: import('@playwright/test').Page) {
  await page.getByRole('link', { name: 'User Management' }).click();
  await expect(page).toHaveURL(/\/users$/);
  await expect(page.getByText('User Management', { exact: true }).first()).toBeVisible();
}

test.describe.configure({ mode: 'serial' });

test('Superadmin adds a user', async ({ page }) => {
  const testEmail = `playwright.add.${Date.now()}@hope.erp.com`;
  try {
    await login(page, superAdmin);
    await openUserManagement(page);

    await page.getByRole('button', { name: '+ Add User', exact: true }).click();
    await page.getByLabel('First name').fill('Test');
    await page.getByLabel('Last name').fill('User');
    await page.getByLabel('Email').fill(testEmail);
    await page.getByLabel('Role').selectOption('user');
    await page.getByRole('button', { name: 'Save user', exact: true }).click();

    await expect(page.getByText('User added', { exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: testEmail, exact: true })).toBeVisible();
    await expect(page.getByText(/temporary password/i)).toBeVisible();
    await page.getByRole('button', { name: 'Done', exact: true }).click();

    await page.screenshot({
      path: path.join(__dirname, 'screenshots', `superadmin-add-user-${testedDate}.png`),
      fullPage: true,
    });
  } finally {
    await deleteTestUsers([testEmail]);
  }
});

test('Superadmin edits, blocks, and unblocks a User', async ({ page }) => {
  const testEmail = `playwright.manage.${Date.now()}@hope.erp.com`;
  try {
    await createTestUser({ email: testEmail, role: 'User' });
    await login(page, superAdmin);
    await openUserManagement(page);

    let row = page.getByRole('row').filter({ hasText: testEmail });
    await row.getByRole('button', { name: 'Edit', exact: true }).click();
    await page.getByLabel('First name').fill('Edited');
    await page.getByLabel('Last name').fill('Account');
    const editResponsePromise = page.waitForResponse(
      (response) => response.url().includes('/api/users/') && response.request().method() === 'PATCH'
    );
    await page.getByRole('button', { name: 'Save user', exact: true }).click();
    const editResponse = await editResponsePromise;
    expect(editResponse.ok()).toBe(true);
    await expect(page.getByRole('dialog', { name: 'Edit user' })).not.toBeVisible();

    row = page.getByRole('row').filter({ hasText: testEmail });
    await expect(row.getByRole('cell', { name: 'Edited Account', exact: true })).toBeVisible();

    await row.getByRole('button', { name: 'Block', exact: true }).click();
    await expect(row.getByText('Blocked', { exact: true })).toBeVisible();
    await expect(row.getByRole('button', { name: 'Unblock', exact: true })).toBeVisible();

    await row.getByRole('button', { name: 'Unblock', exact: true }).click();
    await expect(row.getByText('Active', { exact: true })).toBeVisible();
    await expect(row.getByRole('button', { name: 'Block', exact: true })).toBeVisible();
  } finally {
    await deleteTestUsers([testEmail]);
  }
});

test('Superadmin approves a pending account', async ({ page }) => {
  const testEmail = `playwright.pending.${Date.now()}@hope.erp.com`;
  try {
    await createTestUser({ email: testEmail, role: 'User', accountStatus: 'pending' });
    await login(page, superAdmin);
    await openUserManagement(page);

    const pendingRow = page.getByRole('row').filter({ hasText: testEmail });
    const approveResponsePromise = page.waitForResponse(
      (response) => response.url().includes('/api/users/') && response.request().method() === 'PATCH'
    );
    await pendingRow.getByRole('button', { name: 'Approve', exact: true }).click();
    const approveResponse = await approveResponsePromise;
    expect(approveResponse.ok()).toBe(true);

    const userRow = page.getByRole('row').filter({ hasText: testEmail });
    await expect(userRow.getByText('Active', { exact: true })).toBeVisible();
  } finally {
    await deleteTestUsers([testEmail]);
  }
});

test('Superadmin makes a User an Admin', async ({ page }) => {
  const testEmail = `playwright.promote.${Date.now()}@hope.erp.com`;
  try {
    await createTestUser({ email: testEmail, role: 'User' });
    await login(page, superAdmin);
    await openUserManagement(page);

    const row = page.getByRole('row').filter({ hasText: testEmail });
    await row.getByRole('button', { name: 'Make Admin', exact: true }).click();
    await expect(row.getByText('ADMIN', { exact: true })).toBeVisible();
  } finally {
    await deleteTestUsers([testEmail]);
  }
});

test("Admin cannot see or edit a Superadmin", async ({ page }) => {
  const testEmail = `playwright.admin.${Date.now()}@hope.erp.com`;
  try {
    await createTestUser({ email: testEmail, role: 'Admin' });
    const adminAccount = { email: testEmail, password: '@ValidPass1' };
    await login(page, adminAccount);
    await openUserManagement(page);

    await expect(page.getByText(superAdmin.email, { exact: true })).not.toBeVisible();

    const { data: superadmin } = await supabaseAdmin()
      .from('app_user')
      .select('user_id')
      .ilike('email', superAdmin.email)
      .single();
    if (!superadmin) throw new Error('Seeded Superadmin account was not found.');

    const response = await page.request.patch(`/api/users/${superadmin.user_id}`, {
      data: { firstName: 'Unauthorized', lastName: 'Edit', email: superAdmin.email },
    });
    expect([403, 404]).toContain(response.status());
  } finally {
    await deleteTestUsers([testEmail]);
  }
});

test("last active Superadmin cannot be blocked or demoted", async ({ page }) => {
  const supabase = supabaseAdmin();
  const userRoleId = await roleId('User');
  const superRoleId = await roleId('Superadmin');
  const testEmail = `playwright.last-superadmin.${Date.now()}@hope.erp.com`;
  const targetId = await createTestUser({ email: testEmail, role: 'Superadmin' });

  const { data: superadmins, error } = await supabase
    .from('app_user')
    .select('user_id')
    .eq('role_id', superRoleId);
  if (error) throw new Error(`Could not load Superadmins: ${error.message}`);
  const others = (superadmins ?? []).filter((account) => account.user_id !== targetId);

  try {
    for (const other of others) {
      await supabase.from('app_user').update({ role_id: userRoleId }).eq('user_id', other.user_id);
    }
    await supabase
      .from('app_user')
      .update({ role_id: superRoleId, is_blocked: false, account_status: 'active' })
      .eq('user_id', targetId);

    await login(page, { email: testEmail, password: '@ValidPass1' });
    await openUserManagement(page);

    const blockResponse = await page.request.patch(`/api/users/${targetId}`, {
      data: { blocked: true },
    });
    expect([403, 409]).toContain(blockResponse.status());

    const demoteResponse = await page.request.patch(`/api/users/${targetId}`, {
      data: { setRole: 'user' },
    });
    expect([403, 409]).toContain(demoteResponse.status());

    const { data: protectedAccount, error: protectionError } = await supabase
      .from('app_user')
      .select('role_id, is_blocked')
      .eq('user_id', targetId)
      .single();
    if (protectionError) throw new Error(`Could not verify protected account: ${protectionError.message}`);
    expect(protectedAccount.role_id).toBe(superRoleId);
    expect(protectedAccount.is_blocked).toBe(false);
  } finally {
    for (const other of others) {
      await supabase.from('app_user').update({ role_id: superRoleId }).eq('user_id', other.user_id);
    }
    await deleteTestUsers([testEmail]);
  }
});