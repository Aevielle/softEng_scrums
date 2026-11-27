# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: user-man.spec.ts >> Superadmin adds a user
- Location: src\test\e2e\user-man.spec.ts:111:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('User added', { exact: true })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByText('User added', { exact: true }) with timeout 5000ms
  - waiting for getByText('User added', { exact: true })

```

```yaml
- alert: User Management
- complementary:
  - text: H Hope, Inc. ERP
  - navigation "Main":
    - link "Dashboard":
      - /url: /dashboard
    - paragraph: Modules
    - link "Customers":
      - /url: /customers
    - link "Products":
      - /url: /products
    - link "Human Resources":
      - /url: /hr
    - link "Sales":
      - /url: /sales
    - link "Reports":
      - /url: /reports
    - paragraph: Administration
    - link "User Management":
      - /url: /users
    - link "System Settings":
      - /url: /settings
    - paragraph: Account
    - link "My Profile":
      - /url: /profile
  - button "Collapse sidebar" [expanded]
- main:
  - heading "User Management" [level=1]
  - text: Friday, November 27, 2026 · 2:19 PM
  - button "Toggle theme"
  - text: Superadmin
  - button "Notifications": "3"
  - button "Profile menu"
  - paragraph: "Superadmin: manage all accounts and assign roles."
  - button "+ Add User"
  - heading "Pending requests (3)" [level=3]
  - table:
    - rowgroup:
      - row "First name Last name Email Role Actions":
        - columnheader "First name"
        - columnheader "Last name"
        - columnheader "Email"
        - columnheader "Role"
        - columnheader "Actions"
    - rowgroup:
      - row "BAIYOGESIC - baiyogesic.hope@gmail.com USER Approve Decline":
        - cell "BAIYOGESIC"
        - cell "-"
        - cell "baiyogesic.hope@gmail.com"
        - cell "USER"
        - cell "Approve Decline":
          - button "Approve"
          - button "Decline"
      - row "Rilaneh Marie Acabal henalir.marie@gmail.com USER Approve Decline":
        - cell "Rilaneh Marie"
        - cell "Acabal"
        - cell "henalir.marie@gmail.com"
        - cell "USER"
        - cell "Approve Decline":
          - button "Approve"
          - button "Decline"
      - row "Test User it.register.1794031104992@example.com USER Approve Decline":
        - cell "Test"
        - cell "User"
        - cell "it.register.1794031104992@example.com"
        - cell "USER"
        - cell "Approve Decline":
          - button "Approve"
          - button "Decline"
  - heading "Change requests (0)" [level=3]
  - paragraph: No change requests.
  - table:
    - rowgroup:
      - row "Name Email Role Status Actions":
        - columnheader "Name"
        - columnheader "Email"
        - columnheader "Role"
        - columnheader "Status"
        - columnheader "Actions"
    - rowgroup:
      - row "Chesca Ramirez chesca@hope.erp SUPERADMIN Active Block Edit":
        - cell "Chesca Ramirez"
        - cell "chesca@hope.erp"
        - cell "SUPERADMIN"
        - cell "Active"
        - cell "Block Edit":
          - button "Block"
          - button "Edit"
      - row "Geliz Ramos geliz@hope.erp SUPERADMIN Active Block Edit":
        - cell "Geliz Ramos"
        - cell "geliz@hope.erp"
        - cell "SUPERADMIN"
        - cell "Active"
        - cell "Block Edit":
          - button "Block"
          - button "Edit"
      - row "Kim Aeriel Fonseca kimfonseca1234@gmail.com SUPERADMIN Active Block Edit":
        - cell "Kim Aeriel Fonseca"
        - cell "kimfonseca1234@gmail.com"
        - cell "SUPERADMIN"
        - cell "Active"
        - cell "Block Edit":
          - button "Block"
          - button "Edit"
      - row "Kim Aeriel V. Fonseca kimaeriel.fonseca@neu.edu.ph SUPERADMIN Active Block Edit":
        - cell "Kim Aeriel V. Fonseca"
        - cell "kimaeriel.fonseca@neu.edu.ph"
        - cell "SUPERADMIN"
        - cell "Active"
        - cell "Block Edit":
          - button "Block"
          - button "Edit"
      - row "Kim Fonseca kim@hope.erp SUPERADMIN Active Block Edit":
        - cell "Kim Fonseca"
        - cell "kim@hope.erp"
        - cell "SUPERADMIN"
        - cell "Active"
        - cell "Block Edit":
          - button "Block"
          - button "Edit"
      - row "Marie Acabal marie@hope.erp SUPERADMIN Active Block Edit":
        - cell "Marie Acabal"
        - cell "marie@hope.erp"
        - cell "SUPERADMIN"
        - cell "Active"
        - cell "Block Edit":
          - button "Block"
          - button "Edit"
      - row "Paolo Octoman paolo@hope.erp SUPERADMIN Active Block Edit":
        - cell "Paolo Octoman"
        - cell "paolo@hope.erp"
        - cell "SUPERADMIN"
        - cell "Active"
        - cell "Block Edit":
          - button "Block"
          - button "Edit"
      - row "Rilaneh Marie L. Acabal rilanehmarie.acabal@neu.edu.ph SUPERADMIN Active Block Edit":
        - cell "Rilaneh Marie L. Acabal"
        - cell "rilanehmarie.acabal@neu.edu.ph"
        - cell "SUPERADMIN"
        - cell "Active"
        - cell "Block Edit":
          - button "Block"
          - button "Edit"
      - row "Super Admin seed.superadmin@hope.erp.com SUPERADMIN Active —":
        - cell "Super Admin"
        - cell "seed.superadmin@hope.erp.com"
        - cell "SUPERADMIN"
        - cell "Active"
        - cell "—"
      - row "Admin User seed.admin@hope.erp.com ADMIN Active Block Edit":
        - cell "Admin User"
        - cell "seed.admin@hope.erp.com"
        - cell "ADMIN"
        - cell "Active"
        - cell "Block Edit":
          - button "Block"
          - button "Edit"
      - row "Earl Paolo Octoman earlpaolo.octoman@neu.edu.ph ADMIN Active Block Edit":
        - cell "Earl Paolo Octoman"
        - cell "earlpaolo.octoman@neu.edu.ph"
        - cell "ADMIN"
        - cell "Active"
        - cell "Block Edit":
          - button "Block"
          - button "Edit"
      - row "Rilaneh Akabaru hinalir.marie@gmail.com ADMIN Active Block Edit":
        - cell "Rilaneh Akabaru"
        - cell "hinalir.marie@gmail.com"
        - cell "ADMIN"
        - cell "Active"
        - cell "Block Edit":
          - button "Block"
          - button "Edit"
      - row "BAIYOGESIC - baiyogesic.hope@gmail.com USER Pending Block Edit Rights":
        - cell "BAIYOGESIC -"
        - cell "baiyogesic.hope@gmail.com"
        - cell "USER"
        - cell "Pending"
        - cell "Block Edit Rights":
          - button "Block"
          - button "Edit"
          - button "Rights"
      - row "Blocked User seed.blocked_user@hope.erp.com USER Blocked Unblock Edit Rights":
        - cell "Blocked User"
        - cell "seed.blocked_user@hope.erp.com"
        - cell "USER"
        - cell "Blocked"
        - cell "Unblock Edit Rights":
          - button "Unblock"
          - button "Edit"
          - button "Rights"
      - row "Franchesca Ramirez franchesca@hope.erp.com USER Active Block Edit Make Admin Rights":
        - cell "Franchesca Ramirez"
        - cell "franchesca@hope.erp.com"
        - cell "USER"
        - cell "Active"
        - cell "Block Edit Make Admin Rights":
          - button "Block"
          - button "Edit"
          - button "Make Admin"
          - button "Rights"
      - row "Jerry Esperanza internship@neu.edu.ph USER Active Block Edit Make Admin Rights":
        - cell "Jerry Esperanza"
        - cell "internship@neu.edu.ph"
        - cell "USER"
        - cell "Active"
        - cell "Block Edit Make Admin Rights":
          - button "Block"
          - button "Edit"
          - button "Make Admin"
          - button "Rights"
      - row "Kim Ariel Fonseca fonsecakimaerielvillaluz@gmail.com USER Active Block Edit Make Admin Rights":
        - cell "Kim Ariel Fonseca"
        - cell "fonsecakimaerielvillaluz@gmail.com"
        - cell "USER"
        - cell "Active"
        - cell "Block Edit Make Admin Rights":
          - button "Block"
          - button "Edit"
          - button "Make Admin"
          - button "Rights"
      - row "Paolo Octoman epmoctoman@gmail.com USER Active Block Edit Make Admin Rights":
        - cell "Paolo Octoman"
        - cell "epmoctoman@gmail.com"
        - cell "USER"
        - cell "Active"
        - cell "Block Edit Make Admin Rights":
          - button "Block"
          - button "Edit"
          - button "Make Admin"
          - button "Rights"
      - row "Regular User seed.user@hope.erp.com USER Active Block Edit Make Admin Rights":
        - cell "Regular User"
        - cell "seed.user@hope.erp.com"
        - cell "USER"
        - cell "Active"
        - cell "Block Edit Make Admin Rights":
          - button "Block"
          - button "Edit"
          - button "Make Admin"
          - button "Rights"
      - row "Rilaneh Marie Acabal henalir.marie@gmail.com USER Pending Block Edit Rights":
        - cell "Rilaneh Marie Acabal"
        - cell "henalir.marie@gmail.com"
        - cell "USER"
        - cell "Pending"
        - cell "Block Edit Rights":
          - button "Block"
          - button "Edit"
          - button "Rights"
      - row "Test Tube testtube1@hope.com USER Active Block Edit Make Admin Rights":
        - cell "Test Tube"
        - cell "testtube1@hope.com"
        - cell "USER"
        - cell "Active"
        - cell "Block Edit Make Admin Rights":
          - button "Block"
          - button "Edit"
          - button "Make Admin"
          - button "Rights"
      - row "Test User playwright.user@hope.erp.com USER Active Block Edit Make Admin Rights":
        - cell "Test User"
        - cell "playwright.user@hope.erp.com"
        - cell "USER"
        - cell "Active"
        - cell "Block Edit Make Admin Rights":
          - button "Block"
          - button "Edit"
          - button "Make Admin"
          - button "Rights"
      - row "Test User it.register.1794031104992@example.com USER Pending Block Edit Rights":
        - cell "Test User"
        - cell "it.register.1794031104992@example.com"
        - cell "USER"
        - cell "Pending"
        - cell "Block Edit Rights":
          - button "Block"
          - button "Edit"
          - button "Rights"
  - dialog "Add user":
    - heading "Add user" [level=3]
    - text: First name
    - textbox "First name": Test
    - text: Last name
    - textbox "Last name": User
    - text: Email
    - textbox "Email": playwright.add.1795760381446@hope.erp.com
    - text: Role
    - combobox "Role":
      - option "user" [selected]
      - option "admin"
      - option "superadmin"
    - paragraph: A temporary password is generated for the new user and shown once after saving.
    - button "Cancel" [disabled]
    - button "Saving..." [disabled]
  - text: H Hope, Inc. © 2026 Hope, Inc. ERP
  - button "Privacy"
  - button "Support"
```

# Test source

```ts
  24  |     .select('role_id')
  25  |     .ilike('role_name', roleName)
  26  |     .single();
  27  |   if (error || !data) throw new Error(`Could not find role ${roleName}: ${error?.message}`);
  28  |   return data.role_id as number;
  29  | }
  30  | 
  31  | async function createTestUser(options: {
  32  |   email: string;
  33  |   role: string;
  34  |   accountStatus?: string;
  35  |   blocked?: boolean;
  36  | }) {
  37  |   const supabase = supabaseAdmin();
  38  |   const { data, error } = await supabase
  39  |     .from('app_user')
  40  |     .insert({
  41  |       first_name: 'Playwright',
  42  |       last_name: 'Test',
  43  |       email: options.email,
  44  |       password_hash: await bcrypt.hash('@ValidPass1', 12),
  45  |       role_id: await roleId(options.role),
  46  |       account_status: options.accountStatus ?? 'active',
  47  |       is_blocked: options.blocked ?? false,
  48  |       must_change_password: false,
  49  |     })
  50  |     .select('user_id')
  51  |     .single();
  52  |   if (error) throw new Error(`Could not create test user: ${error.message}`);
  53  |   return data.user_id as number;
  54  | }
  55  | 
  56  | async function deleteTestUsers(emails: string[]) {
  57  |   if (emails.length === 0) return;
  58  |   const { error } = await supabaseAdmin()
  59  |     .from('app_user')
  60  |     .delete()
  61  |     .in('email', emails);
  62  |   if (error) throw new Error(`Could not clean test users: ${error.message}`);
  63  | }
  64  | 
  65  | async function login(page: import('@playwright/test').Page, account: { email: string; password: string }) {
  66  |   await page.goto('/login');
  67  |   await page.waitForLoadState('networkidle');
  68  |   await page.getByLabel('Email').fill(account.email);
  69  |   await page.locator('#loginPassword').fill(account.password);
  70  |   await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  71  |   await expect(page.getByRole('heading', { name: 'Verify your identity' })).toBeVisible();
  72  | 
  73  |   const demoCode = await page.locator('p', { hasText: 'Demo code:' }).locator('strong').textContent();
  74  |   if (!demoCode || !/^\d{6}$/.test(demoCode)) throw new Error('Verification code was not found.');
  75  | 
  76  |   for (let i = 0; i < 6; i++) {
  77  |     await page.getByLabel(`Digit ${i + 1}`).fill(demoCode[i]);
  78  |   }
  79  |   await page.getByRole('button', { name: 'Verify code', exact: true }).click();
  80  |   await expect(page.getByText('Sign in successful')).toBeVisible();
  81  |   await page.getByRole('button', { name: 'Proceed to Dashboard' }).click();
  82  |   await expect(page).toHaveURL(/\/dashboard$/);
  83  | }
  84  | 
  85  | async function openUserManagement(page: import('@playwright/test').Page) {
  86  |   await page.getByRole('link', { name: 'User Management' }).click();
  87  |   await expect(page).toHaveURL(/\/users$/);
  88  |   await expect(page.getByText('User Management', { exact: true }).first()).toBeVisible();
  89  | }
  90  | 
  91  | test.describe.configure({ mode: 'serial' });
  92  | 
  93  | test.afterEach(async ({ page }, testInfo) => {
  94  |   const testName = testInfo.title
  95  |     .toLowerCase()
  96  |     .replace(/[^a-z0-9]+/g, '-')
  97  |     .replace(/^-|-$/g, '');
  98  |   const screenshotPath = path.join(
  99  |     __dirname,
  100 |     'screenshots',
  101 |     `${testName}-${testInfo.status}-${testedDate}.png`
  102 |   );
  103 | 
  104 |   await page.screenshot({ path: screenshotPath, fullPage: true });
  105 |   await testInfo.attach(`${testName}-${testInfo.status}`, {
  106 |     path: screenshotPath,
  107 |     contentType: 'image/png',
  108 |   });
  109 | });
  110 | 
  111 | test('Superadmin adds a user', async ({ page }) => {
  112 |   const testEmail = `playwright.add.${Date.now()}@hope.erp.com`;
  113 |   try {
  114 |     await login(page, superAdmin);
  115 |     await openUserManagement(page);
  116 | 
  117 |     await page.getByRole('button', { name: '+ Add User', exact: true }).click();
  118 |     await page.getByLabel('First name').fill('Test');
  119 |     await page.getByLabel('Last name').fill('User');
  120 |     await page.getByLabel('Email').fill(testEmail);
  121 |     await page.getByLabel('Role').selectOption('user');
  122 |     await page.getByRole('button', { name: 'Save user', exact: true }).click();
  123 | 
> 124 |     await expect(page.getByText('User added', { exact: true })).toBeVisible();
      |                                                                 ^ Error: expect(locator).toBeVisible() failed
  125 |     await expect(page.getByRole('cell', { name: testEmail, exact: true })).toBeVisible();
  126 |     await expect(page.getByText(/temporary password/i)).toBeVisible();
  127 |     await page.getByRole('button', { name: 'Done', exact: true }).click();
  128 | 
  129 |   } finally {
  130 |     await deleteTestUsers([testEmail]);
  131 |   }
  132 | });
  133 | 
  134 | test('Superadmin edits, blocks, and unblocks a User', async ({ page }) => {
  135 |   const testEmail = `playwright.manage.${Date.now()}@hope.erp.com`;
  136 |   try {
  137 |     await createTestUser({ email: testEmail, role: 'User' });
  138 |     await login(page, superAdmin);
  139 |     await openUserManagement(page);
  140 | 
  141 |     let row = page.getByRole('row').filter({ hasText: testEmail });
  142 |     await row.getByRole('button', { name: 'Edit', exact: true }).click();
  143 |     await page.getByLabel('First name').fill('Edited');
  144 |     await page.getByLabel('Last name').fill('Account');
  145 |     const editResponsePromise = page.waitForResponse(
  146 |       (response) => response.url().includes('/api/users/') && response.request().method() === 'PATCH'
  147 |     );
  148 |     await page.getByRole('button', { name: 'Save user', exact: true }).click();
  149 |     const editResponse = await editResponsePromise;
  150 |     expect(editResponse.ok()).toBe(true);
  151 |     await expect(page.getByRole('dialog', { name: 'Edit user' })).not.toBeVisible();
  152 | 
  153 |     row = page.getByRole('row').filter({ hasText: testEmail });
  154 |     await expect(row.getByRole('cell', { name: 'Edited Account', exact: true })).toBeVisible();
  155 | 
  156 |     await row.getByRole('button', { name: 'Block', exact: true }).click();
  157 |     await expect(row.getByText('Blocked', { exact: true })).toBeVisible();
  158 |     await expect(row.getByRole('button', { name: 'Unblock', exact: true })).toBeVisible();
  159 | 
  160 |     await row.getByRole('button', { name: 'Unblock', exact: true }).click();
  161 |     await expect(row.getByText('Active', { exact: true })).toBeVisible();
  162 |     await expect(row.getByRole('button', { name: 'Block', exact: true })).toBeVisible();
  163 | 
  164 |   } finally {
  165 |     await deleteTestUsers([testEmail]);
  166 |   }
  167 | });
  168 | 
  169 | test('Superadmin approves a pending account', async ({ page }) => {
  170 |   const testEmail = `playwright.pending.${Date.now()}@hope.erp.com`;
  171 |   try {
  172 |     await createTestUser({ email: testEmail, role: 'User', accountStatus: 'pending' });
  173 |     await login(page, superAdmin);
  174 |     await openUserManagement(page);
  175 | 
  176 |     const pendingRow = page.getByRole('row').filter({ hasText: testEmail });
  177 |     const approveResponsePromise = page.waitForResponse(
  178 |       (response) => response.url().includes('/api/users/') && response.request().method() === 'PATCH'
  179 |     );
  180 |     await pendingRow.getByRole('button', { name: 'Approve', exact: true }).click();
  181 |     const approveResponse = await approveResponsePromise;
  182 |     expect(approveResponse.ok()).toBe(true);
  183 | 
  184 |     const userRow = page.getByRole('row').filter({ hasText: testEmail });
  185 |     await expect(userRow.getByText('Active', { exact: true })).toBeVisible();
  186 | 
  187 |   } finally {
  188 |     await deleteTestUsers([testEmail]);
  189 |   }
  190 | });
  191 | 
  192 | test('Superadmin makes a User an Admin', async ({ page }) => {
  193 |   const testEmail = `playwright.promote.${Date.now()}@hope.erp.com`;
  194 |   try {
  195 |     await createTestUser({ email: testEmail, role: 'User' });
  196 |     await login(page, superAdmin);
  197 |     await openUserManagement(page);
  198 | 
  199 |     const row = page.getByRole('row').filter({ hasText: testEmail });
  200 |     await row.getByRole('button', { name: 'Make Admin', exact: true }).click();
  201 |     await expect(row.getByText('ADMIN', { exact: true })).toBeVisible();
  202 | 
  203 |   } finally {
  204 |     await deleteTestUsers([testEmail]);
  205 |   }
  206 | });
  207 | 
  208 | test("Admin cannot see or edit a Superadmin", async ({ page }) => {
  209 |   const testEmail = `playwright.admin.${Date.now()}@hope.erp.com`;
  210 |   try {
  211 |     await createTestUser({ email: testEmail, role: 'Admin' });
  212 |     const adminAccount = { email: testEmail, password: '@ValidPass1' };
  213 |     await login(page, adminAccount);
  214 |     await openUserManagement(page);
  215 | 
  216 |     await expect(page.getByText(superAdmin.email, { exact: true })).not.toBeVisible();
  217 | 
  218 |     const { data: superadmin } = await supabaseAdmin()
  219 |       .from('app_user')
  220 |       .select('user_id')
  221 |       .ilike('email', superAdmin.email)
  222 |       .single();
  223 |     if (!superadmin) throw new Error('Seeded Superadmin account was not found.');
  224 | 
```