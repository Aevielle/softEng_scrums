# Test Cases for S1-TST-04

Related issue: #182

## Test Setup
Automated unit and integration checks using Jest, plus automated E2E checks using Playwright.

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

**Result key:** Pass | Fail | Not implemented | Not applicable (next sprint/not scheduled) | Not tested

## Features Not Implemented

The rights exist in the catalogue, but the feature UI or server action does not exist in this Sprint 1 build:

### Features Scheduled for Future Sprints

| Feature | Classification | Planned sprint | Backlog issue(s) | Scheduled |
|---|---|---|---|:---:|
| Customer add, edit, delete, and restore | Not applicable (next sprint) | Sprint 2 | #92, #93, #105 | [x] |
| Product add, edit, delete, restore, and price history | Not applicable (next sprint) | Sprint 2 | #95, #96, #97, #98, #106 | [x] |
| Human Resources departments, jobs, employees, and job history | Not applicable (next sprint) | Sprint 3 | #121 through #128 | [x] |
| Sales headers, sale details, payments, and balance | Not applicable (next sprint) | Sprint 4 | #151 through #157, #159 through #160 | [x] |
| All seven reports and report output actions | Not applicable (next sprint) | Sprint 4 | #154, #155, #161, #167 | [x] |
| System Settings | Not applicable (next sprint) | Sprint 4 | To be created | [x] |
| Customer Edit/Delete and Product Edit/Delete actions | Not implemented in the current build | Scheduled in backlog | #92, #93, #95, #96 | [x] |

Use **Not applicable** for rows whose module or action belongs to a later sprint and has no Sprint 1 implementation to test. Use **Not implemented** when a feature is expected in the current scope but no UI/API implementation exists.

## Features to be Implemented

Use this checklist to track the planned features and the sprint in which each feature is implemented. Once a feature is implemented, add its role and rights coverage to the corresponding **Unit**, **Integration**, and **E2E** execution checklists below.

### Sprint 1 — User Management

- [x] Landing page — **Unit, Integration, E2E**
- [x] Registration — **Unit, Integration, E2E**
- [ ] Confirmation email — **Unit, Integration, E2E**
- [x] Sign in and sign out — **Unit, Integration, E2E**
- [x] Forgot-password and reset-password flow — **Unit, Integration, E2E**
- [x] Session and route protection — **Unit, Integration, E2E**
- [x] Dashboard and main page — **Unit, Integration, E2E**
- [x] User list — **Unit, Integration, E2E**
- [x] Approve users — **Unit, Integration, E2E**
- [x] Block and unblock users — **Unit, Integration, E2E**
- [x] Assign roles and rights — **Unit, Integration, E2E**
- [x] Server-side permission checks — **Unit, Integration, E2E**

### Sprint 2 — Customers and Products

- [ ] Customer search and list — **Unit, Integration, E2E**
- [ ] Add and edit customers — **Unit, Integration, E2E**
- [ ] Soft-delete and restore customers — **Unit, Integration, E2E**
- [ ] Product search and list — **Unit, Integration, E2E**
- [ ] Add and edit products — **Unit, Integration, E2E**
- [ ] Soft-delete and restore products — **Unit, Integration, E2E**
- [ ] Product price history — **Unit, Integration, E2E**

### Sprint 3 — Human Resources

- [ ] Department management — **Unit, Integration, E2E**
- [ ] Job management — **Unit, Integration, E2E**
- [ ] Employee management — **Unit, Integration, E2E**
- [ ] Employee soft-delete and restore — **Unit, Integration, E2E**
- [ ] Employee job history — **Unit, Integration, E2E**

### Sprint 4 — Sales, Reports, and Administration

- [ ] Sales headers and line items — **Unit, Integration, E2E**
- [ ] Payment recording and balance calculation — **Unit, Integration, E2E**
- [ ] Top Customers report — **Unit, Integration, E2E**
- [ ] Top Products report — **Unit, Integration, E2E**
- [ ] All Employees report — **Unit, Integration, E2E**
- [ ] Top Sales report — **Unit, Integration, E2E**
- [ ] Product Master List report — **Unit, Integration, E2E**
- [ ] Active Employees report — **Unit, Integration, E2E**
- [ ] Employee Job History report — **Unit, Integration, E2E**
- [ ] Report print and PDF output — **Unit, Integration, E2E**
- [ ] Audit-log viewer — **Unit, Integration, E2E**
- [ ] System Settings — **Unit, Integration, E2E**

## Automated Test Results

**Unit run:** 33 passed

**Unit command:** `npx jest src/test/unit/auth/permissions.test.jsx src/test/unit/auth/rights-layout.test.jsx src/test/unit/api/rights-route.test.jsx src/test/unit/auth/guard.test.jsx --runInBand`

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
| Superadmin | `seed.superadmin@hope.erp.com` | Pass | Pass | Pass |
| Admin | `seed.admin@hope.erp.com` | Pass | Pass | Pass |
| User | `seed.user@hope.erp.com` | Pass | Pass | Pass |

Record the actual approved account emails below before starting the run:

| Role | Account email |
|---|---|
| Superadmin | `seed.superadmin@hope.erp.com` |
| Admin | `seed.admin@hope.erp.com` |
| User | `seed.user@hope.erp.com` |

If any account is pending, rejected, blocked, or missing, mark the run **Blocked** and do not substitute a demo account.

### Result Key

- **Pass**: the menu, button, and server behavior all match the expected result.
- **Fail**: any one of the menu, button, or server behavior does not match.
- **Not implemented**: the feature is in current scope but has no usable UI or server implementation.
- **Not applicable**: the feature belongs to a later sprint or is not scheduled in the module plan.
- **Blocked**: a dependency, account, route, or environment is unavailable.
- **Not tested**: execution has not been performed.

Use only `Pass`, `Fail`, `Not implemented`, `Not applicable`, `Blocked`, or `Not tested` in the menu, button, and server result columns.

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
| Superadmin | Customer Management | Add Customer | Visible | Visible | Allowed | Pass | Not applicable (Sprint 2) | Not applicable (Sprint 2) | |
| Superadmin | Customer Management | Edit Customer | Visible | Visible | Allowed | Pass | Not applicable (Sprint 2) | Not applicable (Sprint 2) | |
| Superadmin | Customer Management | Delete Customer | Visible | Visible | Allowed | Pass | Not applicable (Sprint 2) | Not applicable (Sprint 2) | |
| Admin | Customer Management | Add Customer | Visible | Visible | Allowed | Pass | Not applicable (Sprint 2) | Not applicable (Sprint 2) | |
| Admin | Customer Management | Edit Customer | Visible | Visible | Allowed | Pass | Not applicable (Sprint 2) | Not applicable (Sprint 2) | |
| Admin | Customer Management | Delete Customer | Visible | Visible | Allowed | Pass | Not applicable (Sprint 2) | Not applicable (Sprint 2) | |
| User | Customer Management | Add Customer | Visible only if granted | Visible only if granted | Allowed only if granted | Pass | Not applicable (Sprint 2) | Not applicable (Sprint 2) | |
| User | Customer Management | Edit Customer | Visible only if granted | Visible only if granted | Allowed only if granted | Pass | Not applicable (Sprint 2) | Not applicable (Sprint 2) | |
| User | Customer Management | Delete Customer | Visible only if granted | Visible only if granted | Allowed only if granted | Pass | Not applicable (Sprint 2) | Not applicable (Sprint 2) | |
| Superadmin | Product Management | Add Product | Visible | Visible | Allowed | Not applicable (Sprint 2) | Not applicable (Sprint 2) | Not applicable (Sprint 2) | |
| Superadmin | Product Management | Edit Product | Visible | Visible | Allowed | Not applicable (Sprint 2) | Not applicable (Sprint 2) | Not applicable (Sprint 2) | |
| Superadmin | Product Management | Delete Product | Visible | Visible | Allowed | Not applicable (Sprint 2) | Not applicable (Sprint 2) | Not applicable (Sprint 2) | |
| Superadmin | Product Management | Add Price | Visible | Visible | Allowed | Not applicable (Sprint 2) | Not applicable (Sprint 2) | Not applicable (Sprint 2) | |
| Superadmin | Product Management | Edit Price | Visible | Visible | Allowed | Not applicable (Sprint 2) | Not applicable (Sprint 2) | Not applicable (Sprint 2) | |
| Superadmin | Product Management | Delete Price | Visible | Visible | Allowed | Not applicable (Sprint 2) | Not applicable (Sprint 2) | Not applicable (Sprint 2) | |
| Admin | Product Management | Add Product | Visible | Visible | Allowed | Not applicable (Sprint 2) | Not applicable (Sprint 2) | Not applicable (Sprint 2) | |
| Admin | Product Management | Edit Product | Visible | Visible | Allowed | Not applicable (Sprint 2) | Not applicable (Sprint 2) | Not applicable (Sprint 2) | |
| Admin | Product Management | Delete Product | Visible | Visible | Allowed | Not applicable (Sprint 2) | Not applicable (Sprint 2) | Not applicable (Sprint 2) | |
| Admin | Product Management | Add Price | Visible | Visible | Allowed | Not applicable (Sprint 2) | Not applicable (Sprint 2) | Not applicable (Sprint 2) | |
| Admin | Product Management | Edit Price | Visible | Visible | Allowed | Not applicable (Sprint 2) | Not applicable (Sprint 2) | Not applicable (Sprint 2) | |
| Admin | Product Management | Delete Price | Visible | Visible | Allowed | Not applicable (Sprint 2) | Not applicable (Sprint 2) | Not applicable (Sprint 2) | |
| User | Product Management | Add Product | Visible only if granted | Visible only if granted | Allowed only if granted | Not applicable (Sprint 2) | Not applicable (Sprint 2) | Not applicable (Sprint 2) | |
| User | Product Management | Edit Product | Visible only if granted | Visible only if granted | Allowed only if granted | Not applicable (Sprint 2) | Not applicable (Sprint 2) | Not applicable (Sprint 2) | |
| User | Product Management | Delete Product | Visible only if granted | Visible only if granted | Allowed only if granted | Not applicable (Sprint 2) | Not applicable (Sprint 2) | Not applicable (Sprint 2) | |
| User | Product Management | Add Price | Visible only if granted | Visible only if granted | Allowed only if granted | Not applicable (Sprint 2) | Not applicable (Sprint 2) | Not applicable (Sprint 2) | |
| User | Product Management | Edit Price | Visible only if granted | Visible only if granted | Allowed only if granted | Not applicable (Sprint 2) | Not applicable (Sprint 2) | Not applicable (Sprint 2) | |
| User | Product Management | Delete Price | Visible only if granted | Visible only if granted | Allowed only if granted | Not applicable (Sprint 2) | Not applicable (Sprint 2) | Not applicable (Sprint 2) | |
| Superadmin | Human Resources | Add Job | Visible | Visible | Allowed | Not applicable (Sprint 3) | Not applicable (Sprint 3) | Not applicable (Sprint 3) | |
| Superadmin | Human Resources | Edit Job | Visible | Visible | Allowed | Not applicable (Sprint 3) | Not applicable (Sprint 3) | Not applicable (Sprint 3) | |
| Superadmin | Human Resources | Delete Job | Visible | Visible | Allowed | Not applicable (Sprint 3) | Not applicable (Sprint 3) | Not applicable (Sprint 3) | |
| Superadmin | Human Resources | Add Department | Visible | Visible | Allowed | Not applicable (Sprint 3) | Not applicable (Sprint 3) | Not applicable (Sprint 3) | |
| Superadmin | Human Resources | Edit Department | Visible | Visible | Allowed | Not applicable (Sprint 3) | Not applicable (Sprint 3) | Not applicable (Sprint 3) | |
| Superadmin | Human Resources | Delete Department | Visible | Visible | Allowed | Not applicable (Sprint 3) | Not applicable (Sprint 3) | Not applicable (Sprint 3) | |
| Superadmin | Human Resources | Add Employee | Visible | Visible | Allowed | Not applicable (Sprint 3) | Not applicable (Sprint 3) | Not applicable (Sprint 3) | |
| Superadmin | Human Resources | Edit Employee | Visible | Visible | Allowed | Not applicable (Sprint 3) | Not applicable (Sprint 3) | Not applicable (Sprint 3) | |
| Superadmin | Human Resources | Delete Employee | Visible | Visible | Allowed | Not applicable (Sprint 3) | Not applicable (Sprint 3) | Not applicable (Sprint 3) | |
| Superadmin | Human Resources | View Job History | Visible | Visible | Allowed | Not applicable (Sprint 3) | Not applicable (Sprint 3) | Not applicable (Sprint 3) | |
| Superadmin | Human Resources | Add Job History | Visible | Visible | Allowed | Not applicable (Sprint 3) | Not applicable (Sprint 3) | Not applicable (Sprint 3) | |
| Superadmin | Human Resources | Edit Job History | Visible | Visible | Allowed | Not applicable (Sprint 3) | Not applicable (Sprint 3) | Not applicable (Sprint 3) | |
| Superadmin | Human Resources | Delete Job History | Visible | Visible | Allowed | Not applicable (Sprint 3) | Not applicable (Sprint 3) | Not applicable (Sprint 3) | |
| Admin | Human Resources | Add Job | Visible | Visible | Allowed | Not applicable (Sprint 3) | Not applicable (Sprint 3) | Not applicable (Sprint 3) | |
| Admin | Human Resources | Edit Job | Visible | Visible | Allowed | Not applicable (Sprint 3) | Not applicable (Sprint 3) | Not applicable (Sprint 3) | |
| Admin | Human Resources | Delete Job | Visible | Visible | Allowed | Not applicable (Sprint 3) | Not applicable (Sprint 3) | Not applicable (Sprint 3) | |
| Admin | Human Resources | Add Department | Visible | Visible | Allowed | Not applicable (Sprint 3) | Not applicable (Sprint 3) | Not applicable (Sprint 3) | |
| Admin | Human Resources | Edit Department | Visible | Visible | Allowed | Not applicable (Sprint 3) | Not applicable (Sprint 3) | Not applicable (Sprint 3) | |
| Admin | Human Resources | Delete Department | Visible | Visible | Allowed | Not applicable (Sprint 3) | Not applicable (Sprint 3) | Not applicable (Sprint 3) | |
| Admin | Human Resources | Add Employee | Visible | Visible | Allowed | Not applicable (Sprint 3) | Not applicable (Sprint 3) | Not applicable (Sprint 3) | |
| Admin | Human Resources | Edit Employee | Visible | Visible | Allowed | Not applicable (Sprint 3) | Not applicable (Sprint 3) | Not applicable (Sprint 3) | |
| Admin | Human Resources | Delete Employee | Visible | Visible | Allowed | Not applicable (Sprint 3) | Not applicable (Sprint 3) | Not applicable (Sprint 3) | |
| Admin | Human Resources | View Job History | Visible | Visible | Allowed | Not applicable (Sprint 3) | Not applicable (Sprint 3) | Not applicable (Sprint 3) | |
| Admin | Human Resources | Add Job History | Visible | Visible | Allowed | Not applicable (Sprint 3) | Not applicable (Sprint 3) | Not applicable (Sprint 3) | |
| Admin | Human Resources | Edit Job History | Visible | Visible | Allowed | Not applicable (Sprint 3) | Not applicable (Sprint 3) | Not applicable (Sprint 3) | |
| Admin | Human Resources | Delete Job History | Visible | Visible | Allowed | Not applicable (Sprint 3) | Not applicable (Sprint 3) | Not applicable (Sprint 3) | |
| User | Human Resources | Add Job | Visible only if granted | Visible only if granted | Allowed only if granted | Not applicable (Sprint 3) | Not applicable (Sprint 3) | Not applicable (Sprint 3) | |
| User | Human Resources | Edit Job | Visible only if granted | Visible only if granted | Allowed only if granted | Not applicable (Sprint 3) | Not applicable (Sprint 3) | Not applicable (Sprint 3) | |
| User | Human Resources | Delete Job | Visible only if granted | Visible only if granted | Allowed only if granted | Not applicable (Sprint 3) | Not applicable (Sprint 3) | Not applicable (Sprint 3) | |
| User | Human Resources | Add Department | Visible only if granted | Visible only if granted | Allowed only if granted | Not applicable (Sprint 3) | Not applicable (Sprint 3) | Not applicable (Sprint 3) | |
| User | Human Resources | Edit Department | Visible only if granted | Visible only if granted | Allowed only if granted | Not applicable (Sprint 3) | Not applicable (Sprint 3) | Not applicable (Sprint 3) | |
| User | Human Resources | Delete Department | Visible only if granted | Visible only if granted | Allowed only if granted | Not applicable (Sprint 3) | Not applicable (Sprint 3) | Not applicable (Sprint 3) | |
| User | Human Resources | Add Employee | Visible only if granted | Visible only if granted | Allowed only if granted | Not applicable (Sprint 3) | Not applicable (Sprint 3) | Not applicable (Sprint 3) | |
| User | Human Resources | Edit Employee | Visible only if granted | Visible only if granted | Allowed only if granted | Not applicable (Sprint 3) | Not applicable (Sprint 3) | Not applicable (Sprint 3) | |
| User | Human Resources | Delete Employee | Visible only if granted | Visible only if granted | Allowed only if granted | Not applicable (Sprint 3) | Not applicable (Sprint 3) | Not applicable (Sprint 3) | |
| User | Human Resources | View Job History | Visible only if granted | Visible only if granted | Allowed only if granted | Not applicable (Sprint 3) | Not applicable (Sprint 3) | Not applicable (Sprint 3) | |
| User | Human Resources | Add Job History | Visible only if granted | Visible only if granted | Allowed only if granted | Not applicable (Sprint 3) | Not applicable (Sprint 3) | Not applicable (Sprint 3) | |
| User | Human Resources | Edit Job History | Visible only if granted | Visible only if granted | Allowed only if granted | Not applicable (Sprint 3) | Not applicable (Sprint 3) | Not applicable (Sprint 3) | |
| User | Human Resources | Delete Job History | Visible only if granted | Visible only if granted | Allowed only if granted | Not applicable (Sprint 3) | Not applicable (Sprint 3) | Not applicable (Sprint 3) | |
| Superadmin | Sales | Add Sale | Visible | Visible | Allowed | Not applicable (Sprint 4) | Not applicable (Sprint 4) | Not applicable (Sprint 4) | |
| Superadmin | Sales | Edit Sale | Visible | Visible | Allowed | Not applicable (Sprint 4) | Not applicable (Sprint 4) | Not applicable (Sprint 4) | |
| Superadmin | Sales | Delete Sale | Visible | Visible | Allowed | Not applicable (Sprint 4) | Not applicable (Sprint 4) | Not applicable (Sprint 4) | |
| Superadmin | Sales | View Sale Details | Visible | Visible | Allowed | Not applicable (Sprint 4) | Not applicable (Sprint 4) | Not applicable (Sprint 4) | |
| Superadmin | Sales | Add Sale Detail | Visible | Visible | Allowed | Not applicable (Sprint 4) | Not applicable (Sprint 4) | Not applicable (Sprint 4) | |
| Superadmin | Sales | Edit Sale Detail | Visible | Visible | Allowed | Not applicable (Sprint 4) | Not applicable (Sprint 4) | Not applicable (Sprint 4) | |
| Superadmin | Sales | Delete Sale Detail | Visible | Visible | Allowed | Not applicable (Sprint 4) | Not applicable (Sprint 4) | Not applicable (Sprint 4) | |
| Admin | Sales | Add Sale | Visible | Visible | Allowed | Not applicable (Sprint 4) | Not applicable (Sprint 4) | Not applicable (Sprint 4) | |
| Admin | Sales | Edit Sale | Visible | Visible | Allowed | Not applicable (Sprint 4) | Not applicable (Sprint 4) | Not applicable (Sprint 4) | |
| Admin | Sales | Delete Sale | Visible | Visible | Allowed | Not applicable (Sprint 4) | Not applicable (Sprint 4) | Not applicable (Sprint 4) | |
| Admin | Sales | View Sale Details | Visible | Visible | Allowed | Not applicable (Sprint 4) | Not applicable (Sprint 4) | Not applicable (Sprint 4) | |
| Admin | Sales | Add Sale Detail | Visible | Visible | Allowed | Not applicable (Sprint 4) | Not applicable (Sprint 4) | Not applicable (Sprint 4) | |
| Admin | Sales | Edit Sale Detail | Visible | Visible | Allowed | Not applicable (Sprint 4) | Not applicable (Sprint 4) | Not applicable (Sprint 4) | |
| Admin | Sales | Delete Sale Detail | Visible | Visible | Allowed | Not applicable (Sprint 4) | Not applicable (Sprint 4) | Not applicable (Sprint 4) | |
| User | Sales | Add Sale | Visible only if granted | Visible only if granted | Allowed only if granted | Not applicable (Sprint 4) | Not applicable (Sprint 4) | Not applicable (Sprint 4) | |
| User | Sales | Edit Sale | Visible only if granted | Visible only if granted | Allowed only if granted | Not applicable (Sprint 4) | Not applicable (Sprint 4) | Not applicable (Sprint 4) | |
| User | Sales | Delete Sale | Visible only if granted | Visible only if granted | Allowed only if granted | Not applicable (Sprint 4) | Not applicable (Sprint 4) | Not applicable (Sprint 4) | |
| User | Sales | View Sale Details | Visible only if granted | Visible only if granted | Allowed only if granted | Not applicable (Sprint 4) | Not applicable (Sprint 4) | Not applicable (Sprint 4) | |
| User | Sales | Add Sale Detail | Visible only if granted | Visible only if granted | Allowed only if granted | Not applicable (Sprint 4) | Not applicable (Sprint 4) | Not applicable (Sprint 4) | |
| User | Sales | Edit Sale Detail | Visible only if granted | Visible only if granted | Allowed only if granted | Not applicable (Sprint 4) | Not applicable (Sprint 4) | Not applicable (Sprint 4) | |
| User | Sales | Delete Sale Detail | Visible only if granted | Visible only if granted | Allowed only if granted | Not applicable (Sprint 4) | Not applicable (Sprint 4) | Not applicable (Sprint 4) | |
| Superadmin | Reports | Top Customers | Visible | Visible | Allowed | Not applicable (Sprint 4) | Not applicable (Sprint 4) | Not applicable (Sprint 4) | |
| Superadmin | Reports | Top Products | Visible | Visible | Allowed | Not applicable (Sprint 4) | Not applicable (Sprint 4) | Not applicable (Sprint 4) | |
| Superadmin | Reports | All Employees | Visible | Visible | Allowed | Not applicable (Sprint 4) | Not applicable (Sprint 4) | Not applicable (Sprint 4) | |
| Superadmin | Reports | Top Sales | Visible | Visible | Allowed | Not applicable (Sprint 4) | Not applicable (Sprint 4) | Not applicable (Sprint 4) | |
| Superadmin | Reports | Product Master List | Visible | Visible | Allowed | Not applicable (Sprint 4) | Not applicable (Sprint 4) | Not applicable (Sprint 4) | |
| Superadmin | Reports | Active Employees | Visible | Visible | Allowed | Not applicable (Sprint 4) | Not applicable (Sprint 4) | Not applicable (Sprint 4) | |
| Superadmin | Reports | Employee Job History | Visible | Visible | Allowed | Not applicable (Sprint 4) | Not applicable (Sprint 4) | Not applicable (Sprint 4) | |
| Admin | Reports | Top Customers | Visible | Visible | Allowed | Not applicable (Sprint 4) | Not applicable (Sprint 4) | Not applicable (Sprint 4) | |
| Admin | Reports | Top Products | Visible | Visible | Allowed | Not applicable (Sprint 4) | Not applicable (Sprint 4) | Not applicable (Sprint 4) | |
| Admin | Reports | All Employees | Visible | Visible | Allowed | Not applicable (Sprint 4) | Not applicable (Sprint 4) | Not applicable (Sprint 4) | |
| Admin | Reports | Top Sales | Visible | Visible | Allowed | Not applicable (Sprint 4) | Not applicable (Sprint 4) | Not applicable (Sprint 4) | |
| Admin | Reports | Product Master List | Visible | Visible | Allowed | Not applicable (Sprint 4) | Not applicable (Sprint 4) | Not applicable (Sprint 4) | |
| Admin | Reports | Active Employees | Visible | Visible | Allowed | Not applicable (Sprint 4) | Not applicable (Sprint 4) | Not applicable (Sprint 4) | |
| Admin | Reports | Employee Job History | Visible | Visible | Allowed | Not applicable (Sprint 4) | Not applicable (Sprint 4) | Not applicable (Sprint 4) | |
| User | Reports | Top Customers | Visible only if granted | Visible only if granted | Allowed only if granted | Not applicable (Sprint 4) | Not applicable (Sprint 4) | Not applicable (Sprint 4) | |
| User | Reports | Top Products | Visible only if granted | Visible only if granted | Allowed only if granted | Not applicable (Sprint 4) | Not applicable (Sprint 4) | Not applicable (Sprint 4) | |
| User | Reports | All Employees | Visible only if granted | Visible only if granted | Allowed only if granted | Not applicable (Sprint 4) | Not applicable (Sprint 4) | Not applicable (Sprint 4) | |
| User | Reports | Top Sales | Visible only if granted | Visible only if granted | Allowed only if granted | Not applicable (Sprint 4) | Not applicable (Sprint 4) | Not applicable (Sprint 4) | |
| User | Reports | Product Master List | Visible only if granted | Visible only if granted | Allowed only if granted | Not applicable (Sprint 4) | Not applicable (Sprint 4) | Not applicable (Sprint 4) | |
| User | Reports | Active Employees | Visible only if granted | Visible only if granted | Allowed only if granted | Not applicable (Sprint 4) | Not applicable (Sprint 4) | Not applicable (Sprint 4) | |
| User | Reports | Employee Job History | Visible only if granted | Visible only if granted | Allowed only if granted | Not applicable (Sprint 4) | Not applicable (Sprint 4) | Not applicable (Sprint 4) | |

## Administration Rights

User Management and System Settings are role-level rights, not rights-catalogue entries.

| Role | Right | Menu expected | Button expected | Server expected | Menu | Buttons | Server | Issue |
|---|---|---|---|---|:---:|:---:|:---:|---|
| Superadmin | User Management | Visible | Add, Edit, Block/Unblock, Approve, Make Admin, Rights visible | Direct `GET/PATCH/PUT /api/users` allowed | Pass | Pass | Pass | |
| Admin | User Management | Visible except Superadmin rows | Add, Edit, Block/Unblock, Approve, Make Admin, Rights visible for Users | Direct `GET/PATCH/PUT /api/users` allowed; Superadmin target refused | Pass | Pass | Pass | |
| User | User Management | Hidden | Hidden | Direct `/api/users` and `/api/users/:id` return `403` | Pass | Pass | Pass | |
| Superadmin | System Settings | Visible | Visible | Allowed | Not applicable (Sprint 4) | Not applicable (Sprint 4) | Not applicable (Sprint 4) | |
| Admin | System Settings | Hidden | Hidden | Direct settings request returns `403` | Not applicable (Sprint 4) | Not applicable (Sprint 4) | Not applicable (Sprint 4) | |
| User | System Settings | Hidden | Hidden | Direct settings request returns `403` | Not applicable (Sprint 4) | Not applicable (Sprint 4) | Not applicable (Sprint 4) | |

## Execution Checklist

### Unit

- [x] Add or update Jest cases for role normalization.
- [x] Add or update Jest cases for `accessFor` across Superadmin, Admin, and User.
- [x] Add or update Jest cases for User module access from active `user_permission` rights.
- [x] Confirm fail-closed behavior for a User with no granted rights.

### Integration

- [x] Send direct requests with each real approved account session.
- [x] Verify unauthenticated requests return `401`.
- [x] Verify authenticated requests without the module/right return `403`.
- [x] Verify granted User requests are allowed and hidden rights remain refused.

### E2E

- [x] Confirm all three real accounts are registered.
- [x] Confirm all three accounts are approved and active.
- [x] Confirm no account is blocked or still at first-password setup.
- [x] Assign/remove each User right and re-sign-in. (The no-rights state was cleared in the test database.)
- [x] Run every implemented Menu check from the dashboard and module pages.
- [x] Run every implemented Buttons check, including with hidden/disabled actions.
- [x] Run every implemented direct server/API check.
- [x] Add a bug Issue for every `Fail`; no Fail results were found.
- [x] Replace implemented-result `Not tested` values and classify future-sprint work as `Not applicable`.
- [ ] Attach screenshots or HTTP evidence to this document or the linked Issue.
- [ ] Update this sheet after the pull request is merged.
