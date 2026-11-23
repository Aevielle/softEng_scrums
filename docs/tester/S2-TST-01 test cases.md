# Test Plan for S2-TST-01: Customers
 
## Test Setup
Jest unit tests for `GET /api/customers` (existing), plus Playwright E2E / API tests for the cases not yet covered (proposed).
 
## Tester
Franchesca E. Ramirez
 
## Testing Start Time
After the Customers list, add and edit features are merged.
 
## Test Setup Notes
Test the Customers screen and API with a test database and seeded or throwaway accounts (one Admin, one User). Each case must be run independently, and any throwaway customers must be cleaned up after testing. Jest cases mock the auth guard, service and filter.
 
**Result key:** Pass | Fail | Not implemented | Not tested (no test written yet) | Not run (test exists, result not yet recorded)
 
## Features to Test
- List customers (Admin and User)
- Search customers (Admin and User)
- Filter by status (Admin only)
- Add a customer
- Edit a customer
- Hide Status, Stamp and deleted rows from Users
- Error handling and access control
## Pass-Fail Conditions and Results
 
### List and Search
 
| ID | Scenario | Steps | Pass | Fail | Result | Test |
|---|---|---|---|---|---|---|
| CUS-01 | An unauthorized caller is blocked. | 1. Call `GET /api/customers` with the guard denying access. | The guard's response (403) is returned, the guard is called with `customers`, and no customers are fetched. | Customers are returned or the list service is called. | Not run | customers route test: "returns the guard response when not authorized" |
| CUS-02 | An Admin lists customers. | 1. Sign in as Admin.<br>2. Open Customers (or call `GET /api/customers`). | Status 200 and `{ customers: [...] }`. The list service is called with the signed-in Admin. | Non-200 status, wrong body, or the list service is not called with the Admin. | Not run | "returns filtered customers as JSON" |
| CUS-03 | An Admin searches customers. | 1. Sign in as Admin.<br>2. Enter `acme` in search (`?q=acme`). | The filter is called with `q: 'acme'`, `status: 'All'` and matching rows are returned. | Search text is ignored or altered. | Not run | "returns filtered customers as JSON" |
| CUS-04 | Search defaults to empty when no query is given. | 1. Sign in as Admin.<br>2. Open Customers with no search. | The filter is called with `q: ''`, `status: 'All'`. | `q` is undefined/null or the filter is skipped. | Not run | "defaults q to empty string" |
| CUS-05 | An Admin filters by status. | 1. Sign in as Admin.<br>2. Choose Active, then Inactive (`?status=Active`, `?status=Inactive`). | The filter is called with the chosen status each time. | The status is ignored or changed. | Not run | "admin can filter by status=%s" |
| CUS-06 | An Admin sends an invalid status. | 1. Sign in as Admin.<br>2. Call `?status=Banana`. | The status falls back to `All` and the request succeeds. | An error occurs or the invalid value is passed to the filter. | Not run | "admin: invalid status falls back to All" |
| CUS-07 | A User lists customers. | 1. Sign in as User.<br>2. Open Customers (`GET /api/customers`). | Status 200 and `{ customers: [...] }`. The list service is called with the signed-in User. | Non-200 status, or the list service is not called with the User. | Not tested | None yet (see Suggested Tests) |
| CUS-08 | A User searches customers. | 1. Sign in as User.<br>2. Enter `acme` in search. | The filter is called with `q: 'acme'`, `status: 'All'`. | Search is ignored or status is not `All`. | Not tested | None yet |
| CUS-09 | A User cannot filter by status. | 1. Sign in as User.<br>2. Call `?status=Inactive`. | The status is ignored and the filter is called with `status: 'All'`. | The filter is called with `Inactive`. | Not run | "user role ignores ?status=Inactive" |
| CUS-10 | A server error is handled. | 1. Sign in as Admin.<br>2. Make the list service fail (e.g. DB down). | `fail(err)` is called and its response (500) is returned. | An unhandled exception or a raw error leaks to the client. | Not run | "delegates errors to fail()" |
 
### Add and Edit
 
| ID | Scenario | Steps | Pass | Fail | Result | Test |
|---|---|---|---|---|---|---|
| CUS-11 | A customer is added successfully. | 1. Sign in as Admin.<br>2. Open Customers and click Add.<br>3. Fill all required fields with a valid payment term.<br>4. Click Save. | The customer is created (201) and appears in the list with the correct details. | The customer is not created or details are wrong. | Not tested | None yet |
| CUS-12 | Adding with empty fields is rejected. | 1. Click Add.<br>2. Leave required fields blank.<br>3. Click Save. | Validation errors (400) are shown for each empty field and no customer is created. | The customer is created, or no error is shown. | Not tested | None yet |
| CUS-13 | Adding with wrong payment terms is rejected. | 1. Click Add.<br>2. Fill all fields but enter an invalid payment term (e.g. `Banana`).<br>3. Click Save. | A payment terms error (400) is shown and no customer is created. | The customer is created with the invalid term. | Not tested | None yet |
| CUS-14 | A customer is edited successfully. | 1. Select an existing customer.<br>2. Click Edit.<br>3. Change a field to a valid value.<br>4. Click Save. | A success message appears and the updated data shows in the list. | Changes are not saved or an error occurs. | Not tested | None yet |
| CUS-15 | Editing with empty fields is rejected. | 1. Click Edit on a customer.<br>2. Clear a required field.<br>3. Click Save. | A validation error is shown and the customer is unchanged. | The empty value is saved. | Not tested | None yet |
| CUS-16 | Editing with wrong payment terms is rejected. | 1. Click Edit on a customer.<br>2. Enter an invalid payment term.<br>3. Click Save. | A payment terms error is shown and the customer is unchanged. | The invalid term is saved. | Not tested | None yet |
 
### What a User Must Not See
 
| ID | Scenario | Steps | Pass | Fail | Result | Test |
|---|---|---|---|---|---|---|
| CUS-17 | A User does not see Status. | 1. Sign in as User.<br>2. Open Customers.<br>3. Check the table, filters and the API response. | No Status column or status filter is shown, and `status` is absent from each customer in the response. | Status is visible in the UI or the response. | Not tested | None yet |
| CUS-18 | A User does not see Stamp. | 1. Sign in as User.<br>2. Open Customers and a customer's details.<br>3. Check the API response. | No Stamp is shown, and `stamp` is absent from the response. | Stamp is visible in the UI or the response. | Not tested | None yet |
| CUS-19 | A User does not see deleted rows. | 1. Seed one deleted customer.<br>2. Sign in as User.<br>3. Open Customers and search for the deleted customer. | The deleted customer is not in the list or search results. | The deleted customer is returned. | Not tested | None yet |
| CUS-20 | A User cannot open a deleted customer directly. | 1. Sign in as User.<br>2. Request the deleted customer's URL or API endpoint. | Not Found or Forbidden is returned. | The deleted customer's details are returned. | Not tested | None yet |
 
## Notes
- The existing Jest file mocks `listCustomers` and `filterCustomers`, so it verifies only the route's wiring. Field hiding (CUS-17, CUS-18) and deleted rows (CUS-19, CUS-20) need service-level or E2E tests.
- Add/edit routes and the payment terms list are not in the provided code. CUS-11 to CUS-16 should be updated once the real routes and allowed terms are known.
 
