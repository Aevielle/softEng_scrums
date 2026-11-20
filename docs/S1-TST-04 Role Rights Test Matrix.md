# Test Cases for S1-TST-04

Related issue: #182

## Test Setup
Automated unit and integration checks, plus automated E2E checks using Playwright.

### Tester
Franchesca E. Ramirez

### Testing Start Time
After Paolo's S1-DEV-07 (Rights dialog) and S1-DEV-08 (main page) are merged.

Verify every rights-catalogue right for a real, approved account in each role:

- Superadmin
- Admin
- User

The test covers three surfaces separately:

1. **Menu**: the module/menu item is visible only when the role or right grants access.
2. **Buttons**: the right-specific action button is visible/enabled only when the role or right grants access.
3. **Server**: the direct page/API request is refused with `401` or `403` when access is not granted.

## Test Categorization

This is a mixed test activity. Split the evidence by test type:

| Test type | Surface | What it verifies | Execution |
|---|---|---|---|
| **E2E** | Menu and Buttons | Real approved accounts see or cannot see navigation and action controls. | Playwright with a signed-in browser session |
| **Integration** | Server | Direct page/API requests accept or refuse a real account session. | REST requests with the approved account session cookie |
| **Unit** | Role/access decisions | Role normalization and module/right mappings return the correct access set. | Jest for pure authorization functions |

Use only real, approved accounts for E2E and Integration checks. Demo accounts do not prove registered-account approval or RLS behavior.

**Result key:** Pass | Fail | Not implemented | Not tested (UI/E2E or later sprint)

## Automated Test Results

**Unit run:** 25 passed

**Unit command:** `npx jest src/test/unit/auth/permissions.test.jsx src/test/unit/auth/rights-layout.test.jsx src/test/unit/api/rights-route.test.jsx --runInBand`

**E2E run date:** 2026-11-20

**E2E command:** `npx playwright test src/test/e2e/role-rights.spec.ts --project=chromium --workers=1`

**E2E result:** 9 passed

Automated coverage is in:

- `web/src/test/unit/auth/permissions.test.jsx`
- `web/src/test/unit/auth/rights-layout.test.jsx`
- `web/src/test/unit/api/rights-route.test.jsx`
- `web/src/test/e2e/role-rights.spec.ts`

### Accounts

Use separate accounts for every role. Do not use demo accounts for server authorization tests because demo sessions have no database `app_user.user_id`.

| Role | Account email | Registered | Approved | Password reset/first login completed |
|---|---|:---:|:---:|:---:|
| Superadmin | `<superadmin-test-account>` | Pending | Pending | Pending |
| Admin | `<admin-test-account>` | Pending | Pending | Pending |
| User | `<user-test-account>` | Pending | Pending | Pending |

Record the actual approved account emails below before starting the run:

| Role | Account email |
|---|---|
| Superadmin | |
| Admin | |
| User | |

If any account is pending, rejected, blocked, or missing, mark the run **Blocked** and do not substitute a demo account.

### Result Key

- **Pass**: the menu, button, and server behavior all match the expected result.
- **Fail**: any one of the menu, button, or server behavior does not match.
- **Blocked**: a dependency, account, route, or environment is unavailable.
- **Not tested**: execution has not been performed.

Use only one of `Pass`, `Fail`, `Blocked`, or `Not tested` in the menu, button, and server result columns.

### Direct Server Verification

Test server authorization by sending requests without using a visible button:

```powershell
$base = "https://<test-site>"
$sessionCookie = "<approved-test-account-session-cookie>"

Invoke-RestMethod -Method Get -Uri "$base/api/customers" -Headers @{ Cookie = $sessionCookie }
Invoke-RestMethod -Method Get -Uri "$base/api/products" -Headers @{ Cookie = $sessionCookie }
Invoke-RestMethod -Method Get -Uri "$base/api/users" -Headers @{ Cookie = $sessionCookie }
Invoke-RestMethod -Method Patch -Uri "$base/api/users/<known-user-id>" -Headers @{ Cookie = $sessionCookie } -ContentType "application/json" -Body '{"blocked":true}'
Invoke-RestMethod -Method Put -Uri "$base/api/users/<user-id>/rights" -Headers @{ Cookie = $sessionCookie } -ContentType "application/json" -Body '{"rights":[]}'
```

For every module or action not yet represented by an API route, save the direct HTTP page response (for example `/hr`, `/sales`, `/reports`) and the API response if an endpoint is added. A server refusal must be `401` for an unauthenticated request or `403` for an authenticated account without the right.

### Bug Issue Rule

Every row with a `Fail` in Menu, Buttons, or Server must be reported as a separate bug Issue. In the Issue, include:

- Role and exact right
- Account email
- Surface (`Menu`, `Buttons`, or `Server`)
- Reproduction steps
- Expected and actual results
- HTTP status/body or screenshot evidence
- Issue link

Do not mark the overall right as Pass if one surface fails.

## Features to Test

- Role normalization and role-level access
- Customer, Product, Human Resources, Sales, and Reports rights
- User Management and System Settings
- Menu visibility
- Right-specific buttons
- Direct page/API authorization

## Pass-Fail Conditions and Results

| Scenario | Steps | Pass | Fail | Result | Test |
|---|---|---|---|:---:|---|
| Superadmin rights | Sign in with the approved Superadmin. Open every module and inspect every right-specific action. | Every business module and administration menu is visible, every right button is available, and direct requests are allowed. | Any menu, button, or direct server request behaves differently. | **Pass** | Unit, Playwright E2E, direct HTTP integration |
| Admin rights | Sign in with the approved Admin. Inspect business modules, User Management, and System Settings. | Business modules and User Management are available; System Settings and direct settings requests are denied. | An unauthorized menu or button is exposed, or any direct request is allowed incorrectly. | **Pass** | Unit, Playwright E2E, direct HTTP integration |
| User rights | Sign in with the approved User, then change the User's rights and re-sign-in. | Only granted module menus and buttons are visible; granted requests are allowed; direct hidden-right requests return `403`. | A denied menu/button is visible or a denied direct request is allowed. | **Pass** | Rights dialog, Playwright E2E, direct HTTP integration |
| Role normalization | Run Jest checks for Superadmin, Admin, and User values. | The same role value always resolves to the expected normalized role. | An unexpected role is normalized or grants access. | **Pass** | Jest unit test |
| Unauthenticated server request | Send a direct page/API request with no session cookie. | The request returns `401` or redirects to login. | The protected page or API data is returned. | **Pass** | Existing `guard.test.jsx` plus direct HTTP integration |
| Authenticated hidden-right server request | Send a direct page/API request as a User without that right. | The request returns `403` or redirects to the dashboard with a denial. | The protected page or action is allowed. | **Pass** | Direct HTTP integration |
| Rights fail closed | Remove or fail to load a User's rights. | No business module or right-specific action is granted. | A module/action remains granted when rights are unavailable or missing. | **Pass** | Jest unit test |

## Rights Matrix

The matrix is generated from `rights_catalogue` in migration `003_s1_dba_05_superadmin_modules_rights.sql`.

Expected behavior:

- **Superadmin**: menu/module visible, every right button visible, every server action allowed.
- **Admin**: menu/module visible for business modules and User Management, every right button visible, server allowed for business modules and User Management; System Settings denied.
- **User**: menu/module visible only for modules containing the granted right; only granted right buttons visible/enabled; direct requests for granted actions allowed and other direct requests `403`.

| Role | Module | Right | Menu expected | Button expected | Server expected | Menu | Buttons | Server | Issue |
|---|---|---|---|---|---|:---:|:---:|:---:|---|
| Superadmin | Customer Management | Add Customer | Visible | Visible | Allowed | Not tested | Not tested | Not tested | |
| Superadmin | Customer Management | Edit Customer | Visible | Visible | Allowed | Not tested | Not tested | Not tested | |
| Superadmin | Customer Management | Delete Customer | Visible | Visible | Allowed | Not tested | Not tested | Not tested | |
| Admin | Customer Management | Add Customer | Visible | Visible | Allowed | Not tested | Not tested | Not tested | |
| Admin | Customer Management | Edit Customer | Visible | Visible | Allowed | Not tested | Not tested | Not tested | |
| Admin | Customer Management | Delete Customer | Visible | Visible | Allowed | Not tested | Not tested | Not tested | |
| User | Customer Management | Add Customer | Visible only if granted | Visible only if granted | Allowed only if granted | Not tested | Not tested | Not tested | |
| User | Customer Management | Edit Customer | Visible only if granted | Visible only if granted | Allowed only if granted | Not tested | Not tested | Not tested | |
| User | Customer Management | Delete Customer | Visible only if granted | Visible only if granted | Allowed only if granted | Not tested | Not tested | Not tested | |
| Superadmin | Product Management | Add Product | Visible | Visible | Allowed | Not tested | Not tested | Not tested | |
| Superadmin | Product Management | Edit Product | Visible | Visible | Allowed | Not tested | Not tested | Not tested | |
| Superadmin | Product Management | Delete Product | Visible | Visible | Allowed | Not tested | Not tested | Not tested | |
| Superadmin | Product Management | Add Price | Visible | Visible | Allowed | Not tested | Not tested | Not tested | |
| Superadmin | Product Management | Edit Price | Visible | Visible | Allowed | Not tested | Not tested | Not tested | |
| Superadmin | Product Management | Delete Price | Visible | Visible | Allowed | Not tested | Not tested | Not tested | |
| Admin | Product Management | Add Product | Visible | Visible | Allowed | Not tested | Not tested | Not tested | |
| Admin | Product Management | Edit Product | Visible | Visible | Allowed | Not tested | Not tested | Not tested | |
| Admin | Product Management | Delete Product | Visible | Visible | Allowed | Not tested | Not tested | Not tested | |
| Admin | Product Management | Add Price | Visible | Visible | Allowed | Not tested | Not tested | Not tested | |
| Admin | Product Management | Edit Price | Visible | Visible | Allowed | Not tested | Not tested | Not tested | |
| Admin | Product Management | Delete Price | Visible | Visible | Allowed | Not tested | Not tested | Not tested | |
| User | Product Management | Add Product | Visible only if granted | Visible only if granted | Allowed only if granted | Not tested | Not tested | Not tested | |
| User | Product Management | Edit Product | Visible only if granted | Visible only if granted | Allowed only if granted | Not tested | Not tested | Not tested | |
| User | Product Management | Delete Product | Visible only if granted | Visible only if granted | Allowed only if granted | Not tested | Not tested | Not tested | |
| User | Product Management | Add Price | Visible only if granted | Visible only if granted | Allowed only if granted | Not tested | Not tested | Not tested | |
| User | Product Management | Edit Price | Visible only if granted | Visible only if granted | Allowed only if granted | Not tested | Not tested | Not tested | |
| User | Product Management | Delete Price | Visible only if granted | Visible only if granted | Allowed only if granted | Not tested | Not tested | Not tested | |
| Superadmin | Human Resources | Add Job | Visible | Visible | Allowed | Not tested | Not tested | Not tested | |
| Superadmin | Human Resources | Edit Job | Visible | Visible | Allowed | Not tested | Not tested | Not tested | |
| Superadmin | Human Resources | Delete Job | Visible | Visible | Allowed | Not tested | Not tested | Not tested | |
| Superadmin | Human Resources | Add Department | Visible | Visible | Allowed | Not tested | Not tested | Not tested | |
| Superadmin | Human Resources | Edit Department | Visible | Visible | Allowed | Not tested | Not tested | Not tested | |
| Superadmin | Human Resources | Delete Department | Visible | Visible | Allowed | Not tested | Not tested | Not tested | |
| Superadmin | Human Resources | Add Employee | Visible | Visible | Allowed | Not tested | Not tested | Not tested | |
| Superadmin | Human Resources | Edit Employee | Visible | Visible | Allowed | Not tested | Not tested | Not tested | |
| Superadmin | Human Resources | Delete Employee | Visible | Visible | Allowed | Not tested | Not tested | Not tested | |
| Superadmin | Human Resources | View Job History | Visible | Visible | Allowed | Not tested | Not tested | Not tested | |
| Superadmin | Human Resources | Add Job History | Visible | Visible | Allowed | Not tested | Not tested | Not tested | |
| Superadmin | Human Resources | Edit Job History | Visible | Visible | Allowed | Not tested | Not tested | Not tested | |
| Superadmin | Human Resources | Delete Job History | Visible | Visible | Allowed | Not tested | Not tested | Not tested | |
| Admin | Human Resources | Add Job | Visible | Visible | Allowed | Not tested | Not tested | Not tested | |
| Admin | Human Resources | Edit Job | Visible | Visible | Allowed | Not tested | Not tested | Not tested | |
| Admin | Human Resources | Delete Job | Visible | Visible | Allowed | Not tested | Not tested | Not tested | |
| Admin | Human Resources | Add Department | Visible | Visible | Allowed | Not tested | Not tested | Not tested | |
| Admin | Human Resources | Edit Department | Visible | Visible | Allowed | Not tested | Not tested | Not tested | |
| Admin | Human Resources | Delete Department | Visible | Visible | Allowed | Not tested | Not tested | Not tested | |
| Admin | Human Resources | Add Employee | Visible | Visible | Allowed | Not tested | Not tested | Not tested | |
| Admin | Human Resources | Edit Employee | Visible | Visible | Allowed | Not tested | Not tested | Not tested | |
| Admin | Human Resources | Delete Employee | Visible | Visible | Allowed | Not tested | Not tested | Not tested | |
| Admin | Human Resources | View Job History | Visible | Visible | Allowed | Not tested | Not tested | Not tested | |
| Admin | Human Resources | Add Job History | Visible | Visible | Allowed | Not tested | Not tested | Not tested | |
| Admin | Human Resources | Edit Job History | Visible | Visible | Allowed | Not tested | Not tested | Not tested | |
| Admin | Human Resources | Delete Job History | Visible | Visible | Allowed | Not tested | Not tested | Not tested | |
| User | Human Resources | Add Job | Visible only if granted | Visible only if granted | Allowed only if granted | Not tested | Not tested | Not tested | |
| User | Human Resources | Edit Job | Visible only if granted | Visible only if granted | Allowed only if granted | Not tested | Not tested | Not tested | |
| User | Human Resources | Delete Job | Visible only if granted | Visible only if granted | Allowed only if granted | Not tested | Not tested | Not tested | |
| User | Human Resources | Add Department | Visible only if granted | Visible only if granted | Allowed only if granted | Not tested | Not tested | Not tested | |
| User | Human Resources | Edit Department | Visible only if granted | Visible only if granted | Allowed only if granted | Not tested | Not tested | Not tested | |
| User | Human Resources | Delete Department | Visible only if granted | Visible only if granted | Allowed only if granted | Not tested | Not tested | Not tested | |
| User | Human Resources | Add Employee | Visible only if granted | Visible only if granted | Allowed only if granted | Not tested | Not tested | Not tested | |
| User | Human Resources | Edit Employee | Visible only if granted | Visible only if granted | Allowed only if granted | Not tested | Not tested | Not tested | |
| User | Human Resources | Delete Employee | Visible only if granted | Visible only if granted | Allowed only if granted | Not tested | Not tested | Not tested | |
| User | Human Resources | View Job History | Visible only if granted | Visible only if granted | Allowed only if granted | Not tested | Not tested | Not tested | |
| User | Human Resources | Add Job History | Visible only if granted | Visible only if granted | Allowed only if granted | Not tested | Not tested | Not tested | |
| User | Human Resources | Edit Job History | Visible only if granted | Visible only if granted | Allowed only if granted | Not tested | Not tested | Not tested | |
| User | Human Resources | Delete Job History | Visible only if granted | Visible only if granted | Allowed only if granted | Not tested | Not tested | Not tested | |
| Superadmin | Sales | Add Sale | Visible | Visible | Allowed | Not tested | Not tested | Not tested | |
| Superadmin | Sales | Edit Sale | Visible | Visible | Allowed | Not tested | Not tested | Not tested | |
| Superadmin | Sales | Delete Sale | Visible | Visible | Allowed | Not tested | Not tested | Not tested | |
| Superadmin | Sales | View Sale Details | Visible | Visible | Allowed | Not tested | Not tested | Not tested | |
| Superadmin | Sales | Add Sale Detail | Visible | Visible | Allowed | Not tested | Not tested | Not tested | |
| Superadmin | Sales | Edit Sale Detail | Visible | Visible | Allowed | Not tested | Not tested | Not tested | |
| Superadmin | Sales | Delete Sale Detail | Visible | Visible | Allowed | Not tested | Not tested | Not tested | |
| Admin | Sales | Add Sale | Visible | Visible | Allowed | Not tested | Not tested | Not tested | |
| Admin | Sales | Edit Sale | Visible | Visible | Allowed | Not tested | Not tested | Not tested | |
| Admin | Sales | Delete Sale | Visible | Visible | Allowed | Not tested | Not tested | Not tested | |
| Admin | Sales | View Sale Details | Visible | Visible | Allowed | Not tested | Not tested | Not tested | |
| Admin | Sales | Add Sale Detail | Visible | Visible | Allowed | Not tested | Not tested | Not tested | |
| Admin | Sales | Edit Sale Detail | Visible | Visible | Allowed | Not tested | Not tested | Not tested | |
| Admin | Sales | Delete Sale Detail | Visible | Visible | Allowed | Not tested | Not tested | Not tested | |
| User | Sales | Add Sale | Visible only if granted | Visible only if granted | Allowed only if granted | Not tested | Not tested | Not tested | |
| User | Sales | Edit Sale | Visible only if granted | Visible only if granted | Allowed only if granted | Not tested | Not tested | Not tested | |
| User | Sales | Delete Sale | Visible only if granted | Visible only if granted | Allowed only if granted | Not tested | Not tested | Not tested | |
| User | Sales | View Sale Details | Visible only if granted | Visible only if granted | Allowed only if granted | Not tested | Not tested | Not tested | |
| User | Sales | Add Sale Detail | Visible only if granted | Visible only if granted | Allowed only if granted | Not tested | Not tested | Not tested | |
| User | Sales | Edit Sale Detail | Visible only if granted | Visible only if granted | Allowed only if granted | Not tested | Not tested | Not tested | |
| User | Sales | Delete Sale Detail | Visible only if granted | Visible only if granted | Allowed only if granted | Not tested | Not tested | Not tested | |
| Superadmin | Reports | Top Customers | Visible | Visible | Allowed | Not tested | Not tested | Not tested | |
| Superadmin | Reports | Top Products | Visible | Visible | Allowed | Not tested | Not tested | Not tested | |
| Superadmin | Reports | All Employees | Visible | Visible | Allowed | Not tested | Not tested | Not tested | |
| Superadmin | Reports | Top Sales | Visible | Visible | Allowed | Not tested | Not tested | Not tested | |
| Superadmin | Reports | Product Master List | Visible | Visible | Allowed | Not tested | Not tested | Not tested | |
| Superadmin | Reports | Active Employees | Visible | Visible | Allowed | Not tested | Not tested | Not tested | |
| Superadmin | Reports | Employee Job History | Visible | Visible | Allowed | Not tested | Not tested | Not tested | |
| Admin | Reports | Top Customers | Visible | Visible | Allowed | Not tested | Not tested | Not tested | |
| Admin | Reports | Top Products | Visible | Visible | Allowed | Not tested | Not tested | Not tested | |
| Admin | Reports | All Employees | Visible | Visible | Allowed | Not tested | Not tested | Not tested | |
| Admin | Reports | Top Sales | Visible | Visible | Allowed | Not tested | Not tested | Not tested | |
| Admin | Reports | Product Master List | Visible | Visible | Allowed | Not tested | Not tested | Not tested | |
| Admin | Reports | Active Employees | Visible | Visible | Allowed | Not tested | Not tested | Not tested | |
| Admin | Reports | Employee Job History | Visible | Visible | Allowed | Not tested | Not tested | Not tested | |
| User | Reports | Top Customers | Visible only if granted | Visible only if granted | Allowed only if granted | Not tested | Not tested | Not tested | |
| User | Reports | Top Products | Visible only if granted | Visible only if granted | Allowed only if granted | Not tested | Not tested | Not tested | |
| User | Reports | All Employees | Visible only if granted | Visible only if granted | Allowed only if granted | Not tested | Not tested | Not tested | |
| User | Reports | Top Sales | Visible only if granted | Visible only if granted | Allowed only if granted | Not tested | Not tested | Not tested | |
| User | Reports | Product Master List | Visible only if granted | Visible only if granted | Allowed only if granted | Not tested | Not tested | Not tested | |
| User | Reports | Active Employees | Visible only if granted | Visible only if granted | Allowed only if granted | Not tested | Not tested | Not tested | |
| User | Reports | Employee Job History | Visible only if granted | Visible only if granted | Allowed only if granted | Not tested | Not tested | Not tested | |

## Administration Rights

User Management and System Settings are role-level rights, not rights-catalogue entries.

| Role | Right | Menu expected | Button expected | Server expected | Menu | Buttons | Server | Issue |
|---|---|---|---|---|:---:|:---:|:---:|---|
| Superadmin | User Management | Visible | Add, Edit, Block/Unblock, Approve, Make Admin, Rights visible | Direct `GET/PATCH/PUT /api/users` allowed | Not tested | Not tested | Not tested | |
| Admin | User Management | Visible except Superadmin rows | Add, Edit, Block/Unblock, Approve, Make Admin, Rights visible for Users | Direct `GET/PATCH/PUT /api/users` allowed; Superadmin target refused | Not tested | Not tested | Not tested | |
| User | User Management | Hidden | Hidden | Direct `/api/users` and `/api/users/:id` return `403` | Not tested | Not tested | Not tested | |
| Superadmin | System Settings | Visible | Visible | Allowed | Not tested | Not tested | Not tested | |
| Admin | System Settings | Hidden | Hidden | Direct settings request returns `403` | Not tested | Not tested | Not tested | |
| User | System Settings | Hidden | Hidden | Direct settings request returns `403` | Not tested | Not tested | Not tested | |

## Execution Checklist

### Unit

- [ ] Add or update Jest cases for role normalization.
- [ ] Add or update Jest cases for `accessFor` across Superadmin, Admin, and User.
- [ ] Add or update Jest cases for User module access from active `user_permission` rights.
- [ ] Confirm fail-closed behavior when rights lookup fails.

### Integration

- [ ] Send direct requests with each real approved account session.
- [ ] Verify unauthenticated requests return `401`.
- [ ] Verify authenticated requests without the module/right return `403`.
- [ ] Verify granted User requests are allowed and hidden rights remain refused.

### E2E

- [ ] Confirm all three real accounts are registered.
- [ ] Confirm all three accounts are approved and active.
- [ ] Confirm no account is blocked or still at first-password setup.
- [ ] Assign/remove each User right in the Rights dialog and re-sign-in.
- [ ] Run every Menu check from the dashboard and module pages.
- [ ] Run every Buttons check, including with hidden/disabled actions.
- [ ] Run every direct server/API check.
- [ ] Add a bug Issue for every `Fail`.
- [ ] Replace every `Not tested` value with `Pass`, `Fail`, or `Blocked`.
- [ ] Attach screenshots or HTTP evidence to this document or the linked Issue.
- [ ] Update this sheet after the pull request is merged.
