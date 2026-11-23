# Test Plan for S2-TST-01: Customers
 
## Test Setup
Automated E2E and API testing using Playwright, plus Jest unit tests for the route, filter, service and guard.
 
## Tester
Franchesca E. Ramirez
 
## Testing Start Time
After S2-DEV-02 (Add / Edit Customer) is merged.
 
## Test Setup Notes
Use a test database with seeded or throwaway accounts: one Superadmin, one Admin and one User. Seed at least one Active and one deleted (Inactive) customer. Grant the "Add Customer" and "Edit Customer" rights only where a case says so. Each case must be run independently, and throwaway customers must be cleaned up after testing. Jest cases mock the guard, service and filter.
 
**Result key:** Pass | Fail | Not implemented | Not tested (no test written yet) | Not run (test exists, result not recorded yet)
 
## Automated Test Files
| File | Type | Covers |
|---|---|---|
| `web/src/test/e2e/customers.spec.ts` | Playwright E2E / API | List and search, add, edit, what a User must not see, access checks |
| `web/src/test/unit/customers-route.test.js` | Jest | `GET /api/customers` route (existing tests plus CUS-08 to CUS-10) |
| `web/src/test/unit/customers-filter.test.js` | Jest | `filterCustomers`, `countByStatus` |
| `web/src/test/unit/customers-service.test.js` | Jest | `listCustomers`, `countCustomers`, `createCustomer`, `updateCustomer` |
| `web/src/test/unit/auth-guard.test.js` | Jest | `authorizeApi`, `requirePageAccess` |
 
**Playwright command:** `npx playwright test src/test/e2e/customers.spec.ts --project=chromium`
 
**Screenshots:** every Playwright test takes a full-page screenshot when it finishes and saves it to `web/src/test/e2e/screenshots/`. The filename includes the test name, result status and run date, so passed and failed runs both have a screenshot. The screenshot is also attached to the Playwright report.
 
**Throwaway data:** all test customers have names starting with `E2E-` and are deleted from the test database after the run.
 
## Features to Test
- List and search customers (Admin and User)
- Status filter (Admin only)
- Search and filter logic (`filterCustomers`, `countByStatus`)
- Add a customer (success, empty fields, wrong payment terms, rights)
- Edit a customer (success, empty fields, wrong payment terms, rights, deleted rows)
- What a User must not see: Status, Stamp, deleted rows
## Pass-Fail Conditions and Results
 
### List and Search
 
| ID | Scenario | Steps | Pass | Fail | Result | Test |
|---|---|---|---|---|---|---|
| CUS-01 | A caller who is not signed in is blocked. | 1. Call `GET /api/customers` with no session. | 401 with code `UNAUTHENTICATED` is returned and no customers are fetched. | Customers are returned or the status is not 401. | Not run | customers.spec.ts; auth-guard.test.js |
| CUS-02 | A caller without the "customers" right is blocked. | 1. Sign in as an account without the right.<br>2. Call `GET /api/customers`. | The guard response (403, code `FORBIDDEN`) is returned, the guard is called with `customers`, and the list service is not called. | Customers are returned or the list service is called. | Not run | customers-route.test.js; customers.spec.ts |
| CUS-03 | An Admin lists all customers. | 1. Sign in as Admin.<br>2. Open Customers. | 200 and `{ customers }`. Active and deleted rows both appear; each has `status` (Active/Inactive) and `stamp`. | Non-200, deleted rows are missing, or Status/Stamp are missing. | Not run | customers.spec.ts; customers-service.test.js |
| CUS-04 | An Admin searches customers. | 1. Sign in as Admin.<br>2. Search `acme` (`?q=acme`). | The filter gets `q: 'acme'`, `status: 'All'`, and only matching rows are shown. | Search text is ignored or altered. | Not run | customers.spec.ts; customers-route.test.js |
| CUS-05 | Search defaults to empty. | 1. Sign in as Admin.<br>2. Open Customers with no search. | The filter gets `q: ''`, `status: 'All'`. | `q` is null/undefined. | Not run | customers-route.test.js |
| CUS-06 | An Admin filters by status. | 1. Sign in as Admin.<br>2. Choose Active, then Inactive. | Only rows with the chosen status are shown. | The status is ignored. | Not run | customers.spec.ts; customers-route.test.js |
| CUS-07 | An Admin sends an invalid status. | 1. Sign in as Admin.<br>2. Call `?status=Banana`. | Status falls back to `All`; the request succeeds. | An error occurs or `Banana` reaches the filter. | Not run | customers-route.test.js |
| CUS-08 | A Superadmin is treated as an Admin. | 1. Sign in as Superadmin.<br>2. Call `?status=Inactive`. | The filter gets `status: 'Inactive'`. | The status is ignored. | Not run | customers-route.test.js |
| CUS-09 | A User lists customers. | 1. Sign in as User.<br>2. Open Customers. | 200 and `{ customers }` with Active rows only. | Non-200 or deleted rows appear. | Not run | customers.spec.ts; customers-route.test.js |
| CUS-10 | A User searches customers. | 1. Sign in as User.<br>2. Search `acme`. | The filter gets `q: 'acme'`, `status: 'All'`; only Active matches show. | Search is ignored or deleted rows match. | Not run | customers.spec.ts; customers-route.test.js |
| CUS-11 | A User cannot filter by status. | 1. Sign in as User.<br>2. Call `?status=Inactive`. | Status is ignored (`All`) and no Inactive rows are returned. | The filter gets `Inactive` or deleted rows appear. | Not run | customers.spec.ts; customers-route.test.js |
| CUS-12 | A server error is handled. | 1. Sign in as Admin.<br>2. Make the list service fail. | `fail(err)` is called and its response (500) is returned. | Unhandled exception or raw error leaks. | Not run | customers-route.test.js |
 
### Add Customer (POST /api/customers)
 
| ID | Scenario | Steps | Pass | Fail | Result | Test |
|---|---|---|---|---|---|---|
| CUS-13 | A customer is added successfully. | 1. Sign in as a user with the Add Customer right.<br>2. Click Add.<br>3. Enter a name, address and a valid payment term.<br>4. Click Save. | 201 `{ customer }`. The next customer number is assigned, the stamp reads `CREATED <email> <time>`, and the customer appears in the list. | Not created, or number/stamp is wrong. | Not run | customers.spec.ts; customers-service.test.js |
| CUS-14 | Adding with empty fields is rejected. | 1. Click Add.<br>2. Leave required fields blank.<br>3. Click Save. | 400 `INVALID` with per-field errors; no row is created. | A row is created or no error is shown. | Not run | customers.spec.ts; customers-service.test.js |
| CUS-15 | Adding with wrong payment terms is rejected. | 1. Click Add.<br>2. Fill all fields but enter an invalid payment term.<br>3. Click Save. | 400 `INVALID` (or "Wrong Value" from the DB check `pay_ck`); no row is created. | The customer is saved with the bad term. | Not run | customers.spec.ts; customers-service.test.js |
| CUS-16 | Adding without the Add Customer right is refused. | 1. Sign in as an account without the right.<br>2. Send a valid POST. | 403 `FORBIDDEN`, checked before validation; no row is created. | A row is created. | Not run | customers.spec.ts; customers-service.test.js |
| CUS-17 | Browser-supplied number, Status and Stamp are ignored. | 1. Send a POST with extra `custno`, `status`, `stamp`, `is_deleted`. | The server's own number and stamp are used; `is_deleted` is false. | Any supplied value is saved. | Not run | customers.spec.ts; customers-service.test.js |
| CUS-18 | A non-JSON request is rejected. | 1. Send a POST with a non-JSON content type. | 415 is returned. | The request is accepted. | Not run | customers.spec.ts |
 
### Edit Customer (updateCustomer)
 
| ID | Scenario | Steps | Pass | Fail | Result | Test |
|---|---|---|---|---|---|---|
| CUS-19 | A customer is edited successfully. | 1. Sign in as a user with the Edit Customer right.<br>2. Select a customer and click Edit.<br>3. Change a field to a valid value.<br>4. Click Save. | Success message; the list shows the new data and the stamp reads `EDITED <email> <time>`. | Changes not saved or stamp unchanged. | Not run | customers.spec.ts; customers-service.test.js |
| CUS-20 | Editing with empty fields is rejected. | 1. Click Edit.<br>2. Clear a required field.<br>3. Click Save. | 400 `INVALID` with field errors; the customer is unchanged. | The empty value is saved. | Not run | customers.spec.ts; customers-service.test.js |
| CUS-21 | Editing with wrong payment terms is rejected. | 1. Click Edit.<br>2. Enter an invalid payment term.<br>3. Click Save. | 400 `INVALID`; the customer is unchanged. | The invalid term is saved. | Not run | customers.spec.ts; customers-service.test.js |
| CUS-22 | Editing without the Edit Customer right is refused. | 1. Sign in as an account without the right.<br>2. Send a valid edit. | 403 `FORBIDDEN`; the customer is unchanged. | The customer is changed. | Not run | customers.spec.ts; customers-service.test.js |
| CUS-23 | Editing a customer that does not exist. | 1. Send an edit for an unknown customer number. | 404 `NOT_FOUND`. | Another status, or a row is created. | Not run | customers.spec.ts; customers-service.test.js |
| CUS-24 | Editing a deleted customer is refused. | 1. Send an edit for a deleted customer. | 409 `DELETED` ("Restore it before editing"); the row is unchanged. | The deleted customer is edited. | Not run | customers.spec.ts; customers-service.test.js |
 
### What a User Must Not See
 
| ID | Scenario | Steps | Pass | Fail | Result | Test |
|---|---|---|---|---|---|---|
| CUS-25 | A User sees no Status or Stamp in the UI. | 1. Sign in as User.<br>2. Open Customers.<br>3. Review the columns and filters. | No Status column, Status filter or Stamp is shown. | Any of them is visible. | Not run | customers.spec.ts |
| CUS-26 | A User's list response has no Status, Stamp or is_deleted. | 1. Sign in as User.<br>2. Call `GET /api/customers`. | Each customer has only `custno`, `custname`, `address`, `payterm`. | Any extra field is present. | Not run | customers.spec.ts; customers-service.test.js |
| CUS-27 | A User does not see deleted rows. | 1. Seed a deleted customer.<br>2. Sign in as User.<br>3. List and search for it. | The deleted customer is in neither the list nor the search results. | It is returned. | Not run | customers.spec.ts; customers-service.test.js |
| CUS-28 | A User's add/edit response has no Status or Stamp. | 1. Give a User the Add and Edit rights.<br>2. Add, then edit a customer. | The returned `customer` has no `status` or `stamp`. | Either is returned. | Not run | customers.spec.ts; customers-service.test.js |
| CUS-29 | A User's dashboard counts do not reveal Inactive rows. | 1. Seed deleted customers.<br>2. Sign in as User.<br>3. Open the dashboard. | `total` equals `active` and `inactive` is 0. | Inactive or total counts include deleted rows. | Not run | customers-service.test.js |
 
### Search and Filter Logic (`filterCustomers` / `countByStatus`)
 
| ID | Scenario | Steps | Pass | Fail | Result | Test |
|---|---|---|---|---|---|---|
| CUS-30 | Search ignores letter case. | 1. Call `filterCustomers` with rows containing `Acme`.<br>2. Search `ACME`, then `acme`. | The `Acme` row is returned both times. | The row is missed. | Not run | customers-filter.test.js |
| CUS-31 | Search matches number, name, address and payment term. | 1. Search a value that appears only in `custno`, then only in `custname`, `address`, `payterm`. | Each search returns the matching row. | Any field is not searched. | Not run | customers-filter.test.js |
| CUS-32 | Search trims spaces; a blank search shows all rows. | 1. Search `  acme  `.<br>2. Search `   `. | The first returns the `acme` rows; the second returns every row. | Spaces break the match or a blank search returns nothing. | Not run | customers-filter.test.js |
| CUS-33 | A search with no match returns an empty list. | 1. Search `zzzz`. | `[]` is returned with no error. | An error or unrelated rows. | Not run | customers-filter.test.js |
| CUS-34 | Rows with empty address or payment term do not break search. | 1. Use rows where `address` and `payterm` are `null`.<br>2. Search any text. | No error; rows match on the other fields. | An exception is thrown. | Not run | customers-filter.test.js |
| CUS-35 | Search and status filter work together (Admin). | 1. Use Active and Inactive rows that both match `acme`.<br>2. Search `acme` with status `Inactive`. | Only the Inactive `acme` rows are returned. | Active rows appear or matching rows are missed. | Not run | customers-filter.test.js |
| CUS-36 | A User's rows are not emptied by a status tab. | 1. Use User-shaped rows (no `status` field).<br>2. Call `filterCustomers` with `status: 'Active'`. | The rows are still returned (or the tab is never offered to a User). | An empty list is returned. | Not run (fails until the filter fix is applied) | customers-filter.test.js |
 
### Access Guard (`authorizeApi` / `requirePageAccess`)
 
| ID | Scenario | Steps | Pass | Fail | Result | Test |
|---|---|---|---|---|---|---|
| CUS-37 | The API rejects a request with no session. | 1. Make `getCurrentUser` return `null`.<br>2. Call `authorizeApi('customers')`. | `{ ok: false }` with a 401 response, code `UNAUTHENTICATED`. | `ok` is true or another status is returned. | Not run | auth-guard.test.js |
| CUS-38 | The API blocks a user who must change their password. | 1. Use a user with `mustChange: true` who holds the right.<br>2. Call `authorizeApi('customers')`. | 403 with code `MUST_CHANGE`; customers are not returned. | Customers are returned. | Not run | auth-guard.test.js |
| CUS-39 | The API blocks a user without the right. | 1. Use a user whose `allowed` set lacks `customers`.<br>2. Call `authorizeApi('customers')`. | 403 with code `FORBIDDEN`. | `ok` is true. | Not run | auth-guard.test.js |
| CUS-40 | The API allows a user with the right. | 1. Use a user with `customers` in `allowed` and `mustChange` false.<br>2. Call `authorizeApi('customers')`. | `{ ok: true, user }`. | The request is blocked. | Not run | auth-guard.test.js |
| CUS-41 | The Customers page redirects visitors who are not allowed in. | 1. Open Customers with no session.<br>2. Open it as a user who must change their password.<br>3. Open it as a user without the right. | Redirects to `/`, `/set-password` and `/dashboard?denied=customers` respectively. | The page opens in any of the three cases. | Not run | auth-guard.test.js; customers.spec.ts |
 
## Notes
- The existing Jest file mocks `listCustomers` and `filterCustomers`, so it only proves the route's wiring. Hidden fields and deleted rows (CUS-09, CUS-26, CUS-27) need service-level or E2E tests.
- Allowed payment terms and required fields live in `@/lib/customers/form`, which was not available. CUS-14, CUS-15, CUS-20 and CUS-21 should name the real values and messages once it is.
- The edit route file and `authorizeCustomerWrite` were not available, so CUS-18 and CUS-19 to CUS-24 use the service's behaviour, not confirmed HTTP codes.
- `filterCustomers` searches only custno, custname, address and payterm, so a search can never match Status or Stamp text.
- Risk (CUS-36): User rows have no `status`, so `filterCustomers` with `Active`/`Inactive` returns nothing, and `countByStatus` counts every User row as Inactive. The API route is safe because it forces `All` for Users; the page must not show tabs or counts to a User (CUS-25).
- The guard checks in this order: signed in (401), must change password (403 `MUST_CHANGE`), then the right (403 `FORBIDDEN`). A user who must change their password gets `MUST_CHANGE` even if they lack the right.
- Playwright selectors, the login flow, the edit route (`PATCH /api/customers/:custno`) and the valid payment term in `customers.spec.ts` are assumptions marked TODO. Update them to match the app before the first run.
- Delete and Restore (S2-DEV-03) are outside the acceptance criteria and are not covered here.
 
