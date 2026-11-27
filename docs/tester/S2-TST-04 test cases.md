# Test Cases for S2-TST-04: Role Rights Test Matrix

Related issue: S2-TST-04

## Test Setup
Automated unit and integration checks using Jest, direct server-side API verification, and end-to-end browser verification using Playwright.

### Tester
Franchesca E. Ramirez

### Testing Start Time
Sprint 2 (Role Rights & Permissions across Modules, Actions, and Server Enforcements)

### Scope & Test Surfaces
Verify every rights-catalogue right and role-level permission for real, approved accounts in each role:
- **Superadmin**
- **Admin**
- **User** (with varying granted rights)

Each capability is assessed across three separate surfaces:
1. **Menu**: The module/menu navigation link is visible only when the role or granted rights allow access.
2. **Buttons**: The specific action button (Add, Edit, Delete, Price, etc.) is visible and enabled only when the role or granted right allows access.
3. **Server**: Direct page navigation or API requests are verified directly. Unauthorized or unauthenticated callers are refused with `401 Unauthorized` or `403 Forbidden` (`FORBIDDEN`, `UNAUTHENTICATED`, or `MUST_CHANGE`), ensuring server-side checks cannot be bypassed even if UI buttons are manipulated.

---

## Accounts Used

All accounts used for testing are real, registered, and approved accounts.

| Role | Account Email | Registered | Approved | Password Reset / Active |
|---|---|:---:|:---:|:---:|
| **Superadmin** | `seed.superadmin@hope.erp.com` | Pass | Pass | Pass |
| **Admin** | `seed.admin@hope.erp.com` | Pass | Pass | Pass |
| **User** | `seed.user@hope.erp.com` | Pass | Pass | Pass |
| **Blocked User** | `seed.blocked_user@hope.erp.com` | Pass | Pass | Blocked (`403`) |

---

## Automated Test Coverage & Evidence

| Test Suite / File | Type | Surface / What It Verifies |
|---|---|---|
| `web/src/test/unit/api/per-right-permissions.test.jsx` | Jest | Direct per-right server gate checks for Customer (`Add Customer`, `Edit Customer`, `Delete Customer`) and Product (`Add Product`, `Edit Product`, `Delete Product`, `Add Price`, `Edit Price`, `Delete Price`, plus restore) across Superadmin, Admin, and User roles |
| `web/src/test/unit/auth/permissions.test.jsx` | Jest | Role normalization, module access calculation (`accessFor`), fail-closed behavior |
| `web/src/test/unit/auth/rights-layout.test.jsx` | Jest | Catalogue layout, module-to-key mappings, catalogue completeness |
| `web/src/test/unit/auth/guard.test.jsx` | Jest | Page & route guards, redirects for unauthenticated (`/`), must-change (`/set-password`), denied (`/dashboard?denied=...`) |
| `web/src/test/unit/api/auth.guard.test.jsx` | Jest | `authorizeApi` server responses (`401 UNAUTHENTICATED`, `403 MUST_CHANGE`, `403 FORBIDDEN`) |
| `web/src/test/unit/api/rights-route.test.jsx` | Jest | Direct `/api/users/:id/rights` route authorization (401 unauth, 403 User/demo) |
| `web/src/test/unit/api/customers/customers.test.jsx` | Jest | Direct `GET/POST /api/customers`, `PATCH /api/customers/[custno]` rights enforcement |
| `web/src/test/unit/api/customers/customers.delete-restore.test.jsx` | Jest | Customer delete (`403` without right) and restore (`403` for user) server checks |
| `web/src/test/unit/api/products/products.test.jsx` | Jest | Direct `GET/POST /api/products`, `PATCH /api/products/[prodcode]` rights enforcement |
| `web/src/test/unit/api/products/products.delete-restore.test.jsx` | Jest | Product delete (`403` without right) and restore (`403` for user) server checks |
| `web/src/test/unit/api/products/prices.test.jsx` | Jest | Direct price endpoints (`GET/POST /prices`, `PATCH/DELETE /prices/[effdate]`) rights checks |
| `web/src/test/e2e/role-rights.spec.ts` | Playwright | Full browser checks for Superadmin, Admin, and User menu visibility, button exposure, and direct route denials |

---

## Acceptance Criteria Checklist
- [x] A table of each role and each right with Pass/Fail for the menu, the buttons, and the server
- [x] The server check is tested directly, not only by clicking buttons
- [x] Test accounts for each role are registered and approved
- [x] Every Fail is reported as a bug Issue / mishap
- [x] The table is saved in the docs folder and the link posted here

---

## Role Rights Test Matrix

### Result Key
- **Pass**: Expected behavior matches across menu, buttons, and direct server check.
- **Fail**: Mismatch observed between actual and expected behavior (reported as bug).
- **Not applicable (Sprint 3 / 4)**: Feature belongs to a future sprint according to the module plan.

---

### 1. Customer Management Rights

| Role | Right | Menu Expected | Button Expected | Server Check Expected | Menu Result | Buttons Result | Server Result | Bug Issue |
|---|---|---|---|---|:---:|:---:|:---:|---|
| Superadmin | Add Customer | Visible | Visible (`+ Add Customer`) | Allowed (`POST /api/customers` -> 200/201) | **Pass** | **Pass** | **Pass** | None |
| Superadmin | Edit Customer | Visible | Visible (`Edit`) | Allowed (`PATCH /api/customers/[custno]` -> 200) | **Pass** | **Pass** | **Pass** | None |
| Superadmin | Delete Customer | Visible | Visible (`Delete`) | Allowed (`DELETE /api/customers/[custno]` -> 200) | **Pass** | **Pass** | **Pass** | None |
| Admin | Add Customer | Visible | Visible (`+ Add Customer`) | Allowed (`POST /api/customers` -> 200/201) | **Pass** | **Pass** | **Pass** | None |
| Admin | Edit Customer | Visible | Visible (`Edit`) | Allowed (`PATCH /api/customers/[custno]` -> 200) | **Pass** | **Pass** | **Pass** | None |
| Admin | Delete Customer | Visible | Visible (`Delete`) | Allowed (`DELETE /api/customers/[custno]` -> 200) | **Pass** | **Pass** | **Pass** | None |
| User | Add Customer | Visible only if granted | Visible only if granted | `403 FORBIDDEN` if not granted; Allowed if granted | **Pass** | **Pass** | **Pass** | None |
| User | Edit Customer | Visible only if granted | Visible only if granted | `403 FORBIDDEN` if not granted; Allowed if granted | **Pass** | **Pass** | **Pass** | None |
| User | Delete Customer | Visible only if granted | Visible only if granted | `403 FORBIDDEN` if not granted; Allowed if granted | **Pass** | **Pass** | **Pass** | None |

---

### 2. Product Management Rights

| Role | Right | Menu Expected | Button Expected | Server Check Expected | Menu Result | Buttons Result | Server Result | Bug Issue |
|---|---|---|---|---|:---:|:---:|:---:|---|
| Superadmin | Add Product | Visible | Visible (`+ Add Product`) | Allowed (`POST /api/products` -> 201) | **Pass** | **Pass** | **Pass** | None |
| Superadmin | Edit Product | Visible | Visible (`Edit`) | Allowed (`PATCH /api/products/[prodcode]` -> 200) | **Pass** | **Pass** | **Pass** | None |
| Superadmin | Delete Product | Visible | Visible (`Delete`) | Allowed (`DELETE /api/products/[prodcode]` -> 200) | **Pass** | **Pass** | **Pass** | None |
| Superadmin | Add Price | Visible | Visible (`+ Add Price`) | Allowed (`POST /api/products/[code]/prices` -> 201) | **Pass** | **Pass** | **Pass** | None |
| Superadmin | Edit Price | Visible | Visible (`Edit` in price history) | Allowed (`PATCH /api/products/[code]/prices/[date]` -> 200) | **Pass** | **Pass** | **Pass** | None |
| Superadmin | Delete Price | Visible | Visible (`Delete` in price history) | Allowed (`DELETE /api/products/[code]/prices/[date]` -> 200) | **Pass** | **Pass** | **Pass** | None |
| Admin | Add Product | Visible | Visible (`+ Add Product`) | Allowed (`POST /api/products` -> 201) | **Pass** | **Pass** | **Pass** | None |
| Admin | Edit Product | Visible | Visible (`Edit`) | Allowed (`PATCH /api/products/[prodcode]` -> 200) | **Pass** | **Pass** | **Pass** | None |
| Admin | Delete Product | Visible | Visible (`Delete`) | Allowed (`DELETE /api/products/[prodcode]` -> 200) | **Pass** | **Pass** | **Pass** | None |
| Admin | Add Price | Visible | Visible (`+ Add Price`) | Allowed (`POST /api/products/[code]/prices` -> 201) | **Pass** | **Pass** | **Pass** | None |
| Admin | Edit Price | Visible | Visible (`Edit` in price history) | Allowed (`PATCH /api/products/[code]/prices/[date]` -> 200) | **Pass** | **Pass** | **Pass** | None |
| Admin | Delete Price | Visible | Visible (`Delete` in price history) | Allowed (`DELETE /api/products/[code]/prices/[date]` -> 200) | **Pass** | **Pass** | **Pass** | None |
| User | Add Product | Visible only if granted | Visible only if granted | `403 FORBIDDEN` if not granted; Allowed if granted | **Pass** | **Pass** | **Pass** | None |
| User | Edit Product | Visible only if granted | Visible only if granted | `403 FORBIDDEN` if not granted; Allowed if granted | **Pass** | **Pass** | **Pass** | None |
| User | Delete Product | Visible only if granted | Visible only if granted | `403 FORBIDDEN` if not granted; Allowed if granted | **Pass** | **Pass** | **Pass** | None |
| User | Add Price | Visible only if granted | Visible only if granted | `403 FORBIDDEN` if not granted; Allowed if granted | **Pass** | **Pass** | **Pass** | None |
| User | Edit Price | Visible only if granted | Visible only if granted | `403 FORBIDDEN` if not granted; Allowed if granted | **Pass** | **Pass** | **Pass** | None |
| User | Delete Price | Visible only if granted | Visible only if granted | `403 FORBIDDEN` if not granted; Allowed if granted | **Pass** | **Pass** | **Pass** | None |

---

### 3. Human Resources Rights (Scheduled: Sprint 3)

| Role | Right | Menu Expected | Button Expected | Server Check Expected | Menu Result | Buttons Result | Server Result | Bug Issue |
|---|---|---|---|---|:---:|:---:|:---:|---|
| Superadmin | Add Job | Visible | Visible | Allowed | **Pass** | Not applicable (Sprint 3) | Not applicable (Sprint 3) | - |
| Superadmin | Edit Job | Visible | Visible | Allowed | **Pass** | Not applicable (Sprint 3) | Not applicable (Sprint 3) | - |
| Superadmin | Delete Job | Visible | Visible | Allowed | **Pass** | Not applicable (Sprint 3) | Not applicable (Sprint 3) | - |
| Superadmin | Add Department | Visible | Visible | Allowed | **Pass** | Not applicable (Sprint 3) | Not applicable (Sprint 3) | - |
| Superadmin | Edit Department | Visible | Visible | Allowed | **Pass** | Not applicable (Sprint 3) | Not applicable (Sprint 3) | - |
| Superadmin | Delete Department | Visible | Visible | Allowed | **Pass** | Not applicable (Sprint 3) | Not applicable (Sprint 3) | - |
| Superadmin | Add Employee | Visible | Visible | Allowed (`POST /api/employees`) | **Pass** | **Pass** | **Pass** | None |
| Superadmin | Edit Employee | Visible | Visible | Allowed (`PATCH /api/employees/[empno]`) | **Pass** | **Pass** | **Pass** | None |
| Superadmin | Delete Employee | Visible | Visible | Allowed | **Pass** | Not applicable (Sprint 3) | Not applicable (Sprint 3) | - |
| Superadmin | View Job History | Visible | Visible | Allowed | **Pass** | Not applicable (Sprint 3) | Not applicable (Sprint 3) | - |
| Superadmin | Add Job History | Visible | Visible | Allowed | **Pass** | Not applicable (Sprint 3) | Not applicable (Sprint 3) | - |
| Superadmin | Edit Job History | Visible | Visible | Allowed | **Pass** | Not applicable (Sprint 3) | Not applicable (Sprint 3) | - |
| Superadmin | Delete Job History | Visible | Visible | Allowed | **Pass** | Not applicable (Sprint 3) | Not applicable (Sprint 3) | - |
| Admin | Add Job | Visible | Visible | Allowed | **Pass** | Not applicable (Sprint 3) | Not applicable (Sprint 3) | - |
| Admin | Edit Job | Visible | Visible | Allowed | **Pass** | Not applicable (Sprint 3) | Not applicable (Sprint 3) | - |
| Admin | Delete Job | Visible | Visible | Allowed | **Pass** | Not applicable (Sprint 3) | Not applicable (Sprint 3) | - |
| Admin | Add Department | Visible | Visible | Allowed | **Pass** | Not applicable (Sprint 3) | Not applicable (Sprint 3) | - |
| Admin | Edit Department | Visible | Visible | Allowed | **Pass** | Not applicable (Sprint 3) | Not applicable (Sprint 3) | - |
| Admin | Delete Department | Visible | Visible | Allowed | **Pass** | Not applicable (Sprint 3) | Not applicable (Sprint 3) | - |
| Admin | Add Employee | Visible | Visible | Allowed (`POST /api/employees`) | **Pass** | **Pass** | **Pass** | None |
| Admin | Edit Employee | Visible | Visible | Allowed (`PATCH /api/employees/[empno]`) | **Pass** | **Pass** | **Pass** | None |
| Admin | Delete Employee | Visible | Visible | Allowed | **Pass** | Not applicable (Sprint 3) | Not applicable (Sprint 3) | - |
| Admin | View Job History | Visible | Visible | Allowed | **Pass** | Not applicable (Sprint 3) | Not applicable (Sprint 3) | - |
| Admin | Add Job History | Visible | Visible | Allowed | **Pass** | Not applicable (Sprint 3) | Not applicable (Sprint 3) | - |
| Admin | Edit Job History | Visible | Visible | Allowed | **Pass** | Not applicable (Sprint 3) | Not applicable (Sprint 3) | - |
| Admin | Delete Job History | Visible | Visible | Allowed | **Pass** | Not applicable (Sprint 3) | Not applicable (Sprint 3) | - |
| User | Add Job | Visible only if granted | Visible only if granted | Allowed only if granted | **Pass** | Not applicable (Sprint 3) | Not applicable (Sprint 3) | - |
| User | Edit Job | Visible only if granted | Visible only if granted | Allowed only if granted | **Pass** | Not applicable (Sprint 3) | Not applicable (Sprint 3) | - |
| User | Delete Job | Visible only if granted | Visible only if granted | Allowed only if granted | **Pass** | Not applicable (Sprint 3) | Not applicable (Sprint 3) | - |
| User | Add Department | Visible only if granted | Visible only if granted | Allowed only if granted | **Pass** | Not applicable (Sprint 3) | Not applicable (Sprint 3) | - |
| User | Edit Department | Visible only if granted | Visible only if granted | Allowed only if granted | **Pass** | Not applicable (Sprint 3) | Not applicable (Sprint 3) | - |
| User | Delete Department | Visible only if granted | Visible only if granted | Allowed only if granted | **Pass** | Not applicable (Sprint 3) | Not applicable (Sprint 3) | - |
| User | Add Employee | Visible only if granted | Visible only if granted | `403 FORBIDDEN` if not granted | **Pass** | **Pass** | **Pass** | None |
| User | Edit Employee | Visible only if granted | Visible only if granted | `403 FORBIDDEN` if not granted | **Pass** | **Pass** | **Pass** | None |
| User | Delete Employee | Visible only if granted | Visible only if granted | Allowed only if granted | **Pass** | Not applicable (Sprint 3) | Not applicable (Sprint 3) | - |
| User | View Job History | Visible only if granted | Visible only if granted | Allowed only if granted | **Pass** | Not applicable (Sprint 3) | Not applicable (Sprint 3) | - |
| User | Add Job History | Visible only if granted | Visible only if granted | Allowed only if granted | **Pass** | Not applicable (Sprint 3) | Not applicable (Sprint 3) | - |
| User | Edit Job History | Visible only if granted | Visible only if granted | Allowed only if granted | **Pass** | Not applicable (Sprint 3) | Not applicable (Sprint 3) | - |
| User | Delete Job History | Visible only if granted | Visible only if granted | Allowed only if granted | **Pass** | Not applicable (Sprint 3) | Not applicable (Sprint 3) | - |

---

### 4. Sales Rights (Scheduled: Sprint 4)

| Role | Right | Menu Expected | Button Expected | Server Check Expected | Menu Result | Buttons Result | Server Result | Bug Issue |
|---|---|---|---|---|:---:|:---:|:---:|---|
| Superadmin | Add Sale | Visible | Visible | Allowed | **Pass** | Not applicable (Sprint 4) | Not applicable (Sprint 4) | - |
| Superadmin | Edit Sale | Visible | Visible | Allowed | **Pass** | Not applicable (Sprint 4) | Not applicable (Sprint 4) | - |
| Superadmin | Delete Sale | Visible | Visible | Allowed | **Pass** | Not applicable (Sprint 4) | Not applicable (Sprint 4) | - |
| Superadmin | View Sale Details | Visible | Visible | Allowed | **Pass** | Not applicable (Sprint 4) | Not applicable (Sprint 4) | - |
| Superadmin | Add Sale Detail | Visible | Visible | Allowed | **Pass** | Not applicable (Sprint 4) | Not applicable (Sprint 4) | - |
| Superadmin | Edit Sale Detail | Visible | Visible | Allowed | **Pass** | Not applicable (Sprint 4) | Not applicable (Sprint 4) | - |
| Superadmin | Delete Sale Detail | Visible | Visible | Allowed | **Pass** | Not applicable (Sprint 4) | Not applicable (Sprint 4) | - |
| Admin | Add Sale | Visible | Visible | Allowed | **Pass** | Not applicable (Sprint 4) | Not applicable (Sprint 4) | - |
| Admin | Edit Sale | Visible | Visible | Allowed | **Pass** | Not applicable (Sprint 4) | Not applicable (Sprint 4) | - |
| Admin | Delete Sale | Visible | Visible | Allowed | **Pass** | Not applicable (Sprint 4) | Not applicable (Sprint 4) | - |
| Admin | View Sale Details | Visible | Visible | Allowed | **Pass** | Not applicable (Sprint 4) | Not applicable (Sprint 4) | - |
| Admin | Add Sale Detail | Visible | Visible | Allowed | **Pass** | Not applicable (Sprint 4) | Not applicable (Sprint 4) | - |
| Admin | Edit Sale Detail | Visible | Visible | Allowed | **Pass** | Not applicable (Sprint 4) | Not applicable (Sprint 4) | - |
| Admin | Delete Sale Detail | Visible | Visible | Allowed | **Pass** | Not applicable (Sprint 4) | Not applicable (Sprint 4) | - |
| User | Add Sale | Visible only if granted | Visible only if granted | Allowed only if granted | **Pass** | Not applicable (Sprint 4) | Not applicable (Sprint 4) | - |
| User | Edit Sale | Visible only if granted | Visible only if granted | Allowed only if granted | **Pass** | Not applicable (Sprint 4) | Not applicable (Sprint 4) | - |
| User | Delete Sale | Visible only if granted | Visible only if granted | Allowed only if granted | **Pass** | Not applicable (Sprint 4) | Not applicable (Sprint 4) | - |
| User | View Sale Details | Visible only if granted | Visible only if granted | Allowed only if granted | **Pass** | Not applicable (Sprint 4) | Not applicable (Sprint 4) | - |
| User | Add Sale Detail | Visible only if granted | Visible only if granted | Allowed only if granted | **Pass** | Not applicable (Sprint 4) | Not applicable (Sprint 4) | - |
| User | Edit Sale Detail | Visible only if granted | Visible only if granted | Allowed only if granted | **Pass** | Not applicable (Sprint 4) | Not applicable (Sprint 4) | - |
| User | Delete Sale Detail | Visible only if granted | Visible only if granted | Allowed only if granted | **Pass** | Not applicable (Sprint 4) | Not applicable (Sprint 4) | - |

---

### 5. Reports Rights (Scheduled: Sprint 4)

| Role | Right | Menu Expected | Button Expected | Server Check Expected | Menu Result | Buttons Result | Server Result | Bug Issue |
|---|---|---|---|---|:---:|:---:|:---:|---|
| Superadmin | Top Customers | Visible | Visible | Allowed | **Pass** | Not applicable (Sprint 4) | Not applicable (Sprint 4) | - |
| Superadmin | Top Products | Visible | Visible | Allowed | **Pass** | Not applicable (Sprint 4) | Not applicable (Sprint 4) | - |
| Superadmin | All Employees | Visible | Visible | Allowed | **Pass** | Not applicable (Sprint 4) | Not applicable (Sprint 4) | - |
| Superadmin | Top Sales | Visible | Visible | Allowed | **Pass** | Not applicable (Sprint 4) | Not applicable (Sprint 4) | - |
| Superadmin | Product Master List | Visible | Visible | Allowed | **Pass** | Not applicable (Sprint 4) | Not applicable (Sprint 4) | - |
| Superadmin | Active Employees | Visible | Visible | Allowed | **Pass** | Not applicable (Sprint 4) | Not applicable (Sprint 4) | - |
| Superadmin | Employee Job History | Visible | Visible | Allowed | **Pass** | Not applicable (Sprint 4) | Not applicable (Sprint 4) | - |
| Admin | Top Customers | Visible | Visible | Allowed | **Pass** | Not applicable (Sprint 4) | Not applicable (Sprint 4) | - |
| Admin | Top Products | Visible | Visible | Allowed | **Pass** | Not applicable (Sprint 4) | Not applicable (Sprint 4) | - |
| Admin | All Employees | Visible | Visible | Allowed | **Pass** | Not applicable (Sprint 4) | Not applicable (Sprint 4) | - |
| Admin | Top Sales | Visible | Visible | Allowed | **Pass** | Not applicable (Sprint 4) | Not applicable (Sprint 4) | - |
| Admin | Product Master List | Visible | Visible | Allowed | **Pass** | Not applicable (Sprint 4) | Not applicable (Sprint 4) | - |
| Admin | Active Employees | Visible | Visible | Allowed | **Pass** | Not applicable (Sprint 4) | Not applicable (Sprint 4) | - |
| Admin | Employee Job History | Visible | Visible | Allowed | **Pass** | Not applicable (Sprint 4) | Not applicable (Sprint 4) | - |
| User | Top Customers | Visible only if granted | Visible only if granted | Allowed only if granted | **Pass** | Not applicable (Sprint 4) | Not applicable (Sprint 4) | - |
| User | Top Products | Visible only if granted | Visible only if granted | Allowed only if granted | **Pass** | Not applicable (Sprint 4) | Not applicable (Sprint 4) | - |
| User | All Employees | Visible only if granted | Visible only if granted | Allowed only if granted | **Pass** | Not applicable (Sprint 4) | Not applicable (Sprint 4) | - |
| User | Top Sales | Visible only if granted | Visible only if granted | Allowed only if granted | **Pass** | Not applicable (Sprint 4) | Not applicable (Sprint 4) | - |
| User | Product Master List | Visible only if granted | Visible only if granted | Allowed only if granted | **Pass** | Not applicable (Sprint 4) | Not applicable (Sprint 4) | - |
| User | Active Employees | Visible only if granted | Visible only if granted | Allowed only if granted | **Pass** | Not applicable (Sprint 4) | Not applicable (Sprint 4) | - |
| User | Employee Job History | Visible only if granted | Visible only if granted | Allowed only if granted | **Pass** | Not applicable (Sprint 4) | Not applicable (Sprint 4) | - |

---

### 6. Administration & System Rights

| Role | Right / Action | Menu Expected | Button Expected | Server Check Expected | Menu Result | Buttons Result | Server Result | Bug Issue |
|---|---|---|---|---|:---:|:---:|:---:|---|
| Superadmin | User Management | Visible | Add, Edit, Block/Unblock, Approve, Make Admin, Rights visible | Direct `GET/PATCH/PUT /api/users` allowed (200) | **Pass** | **Pass** | **Pass** | None |
| Admin | User Management | Visible (Superadmin rows masked) | Action buttons enabled for regular Users only | Direct `GET/PATCH/PUT /api/users` allowed; Superadmin target refused | **Pass** | **Pass** | **Pass** | None |
| User | User Management | Hidden | Hidden | Direct `/api/users` and `/api/users/:id` return `403 FORBIDDEN` | **Pass** | **Pass** | **Pass** | None |
| Superadmin | System Settings | Visible | Visible | Allowed | **Pass** | Not applicable (Sprint 4) | Not applicable (Sprint 4) | - |
| Admin | System Settings | Hidden | Hidden | Direct settings request returns `403` | **Pass** | **Pass** | **Pass** | None |
| User | System Settings | Hidden | Hidden | Direct settings request returns `403` | **Pass** | **Pass** | **Pass** | None |

---

## Direct Server-Side Verification Details

Server-side checks were verified directly at both the HTTP route handler and service layer without relying on client-side button states:
1. **Unauthenticated Access (`401 UNAUTHENTICATED`):**
   - Direct requests without session headers to `/api/customers`, `/api/products`, `/api/users`, `/api/users/:id/rights` return `401`.
2. **Forbidden Access (`403 FORBIDDEN`):**
   - Authenticated User session lacking customer rights -> `GET /api/customers`, `POST /api/customers`, `PATCH /api/customers/:id`, `DELETE /api/customers/:id` return `403 FORBIDDEN`.
   - Authenticated User session lacking product rights -> `GET /api/products`, `POST /api/products`, `PATCH /api/products/:code`, `DELETE /api/products/:code` return `403 FORBIDDEN`.
   - Authenticated User session accessing user management -> `GET /api/users`, `PATCH /api/users/:id`, `PUT /api/users/:id/rights` return `403 FORBIDDEN`.
3. **Password Change Enforcement (`403 MUST_CHANGE`):**
   - Authenticated sessions where `mustChange: true` return `403 MUST_CHANGE` on protected API calls and redirect to `/set-password` for page navigations.
4. **Restore Operations Protected:**
   - Both `/api/customers/:custno/restore` and `/api/products/:prodcode/restore` reject regular User calls (`403 FORBIDDEN` / `404 NOT_FOUND`).

---

## Summary of Mishaps & Bugs
No fails or unauthorized bypasses were detected across menu visibility, button exposure, or direct server API endpoints. All tests passed.
