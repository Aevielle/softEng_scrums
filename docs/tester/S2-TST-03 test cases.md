# Test Plan for S2-TST-03: Soft Delete and Restore (Customers & Products)

## Test Setup
Automated unit and API integration testing using Jest for customer and product soft delete and restore operations, role authorization, active sales verification, stamp lifecycle progression, and UI shading/masking.

## Tester
Franchesca E. Ramirez

## Testing Start Time
Sprint 2 (Soft Delete & Restore)

## Test Setup Notes
Simulate Admin, Superadmin, and standard User sessions. Verify role access controls (Admin/Superadmin permitted to soft delete and restore; User forbidden from delete and restore operations). Ensure foreign key constraints / business rules are honored: a customer with active sales cannot be deleted (`HAS_ACTIVE_SALES`, 409), and a product present on active sales detail lines cannot be deleted (`IN_USE`, 409). Verify the audit stamp progression (`CREATED` -> `EDITED` -> `DELETED` -> `EDITED` upon restore) and verify that soft-deleted rows are completely hidden from regular users and shaded for admins.

**Result key:** Pass | Fail | Not implemented | Not tested | Not run

## Automated Test Files
| File | Type | Covers |
|---|---|---|
| `web/src/test/unit/api/customers/customers.delete-restore.test.jsx` | Jest | Customer delete (`DELETE /api/customers/[custno]`), customer restore (`POST /api/customers/[custno]/restore`), active sales guard, role checks, stamp lifecycle |
| `web/src/test/unit/api/products/products.delete-restore.test.jsx` | Jest | Product delete (`DELETE /api/products/[prodcode]`), product restore (`POST /api/products/[prodcode]/restore`), active sales lines guard, role checks, stamp lifecycle |
| `web/src/test/unit/api/customers/customers.service.test.jsx` | Jest | Customer listing, field masking for Users, deleted row exclusion |
| `web/src/test/unit/api/products/products.service.test.jsx` | Jest | Product listing, field masking for Users, deleted row exclusion |

## Acceptance Criteria Checklist
- [x] Delete then Restore works for a customer and for a product
- [x] A deleted row is hidden for a User and shaded for an Admin
- [x] Delete is refused when the customer or product has active sales
- [x] The Stamp changes correctly after each action (`CREATED` -> `EDITED` -> `DELETED` -> `EDITED` on restore)
- [x] Every Fail is reported as a bug Issue / mishap

---

## Pass-Fail Conditions and Results

### 1. Customer Soft Delete and Restore

| ID | Scenario | Steps | Pass | Fail | Result | Test File |
|---|---|---|---|---|---|---|
| DEL-CUST-01 | Delete customer is refused when active sales exist | 1. Attempt soft delete on customer with active sales records (`activeSalesCount > 0`).<br>2. Call `deleteCustomer(supabase, actor, custno)`. | Operation throws `ServiceError` with status `409` and code `HAS_ACTIVE_SALES`. No update occurs. | Customer is deleted or non-409 error returned. | Pass | customers.delete-restore.test.jsx |
| DEL-CUST-02 | Delete customer succeeds when no active sales exist | 1. Customer has 0 active sales.<br>2. Admin calls `deleteCustomer(supabase, actor, custno)`. | Customer `is_deleted` set to `true`. Stamp updated with `DELETED <user> <timestamp>`. | Customer not deleted, wrong stamp prefix, or error thrown. | Pass | customers.delete-restore.test.jsx |
| DEL-CUST-03 | Delete customer refused if already deleted | 1. Customer has `is_deleted = true`.<br>2. Call `deleteCustomer`. | Throws `ServiceError(409, 'DELETED', 'Customer already deleted')`. | Customer re-deleted or non-409 code. | Pass | customers.delete-restore.test.jsx |
| DEL-CUST-04 | Delete customer refused if customer does not exist | 1. Call `deleteCustomer` with non-existent `custno`. | Throws `ServiceError(404, 'NOT_FOUND', 'Customer not found')`. | Non-404 status returned. | Pass | customers.delete-restore.test.jsx |
| DEL-CUST-05 | Delete customer refused without Delete Customer permission | 1. User lacking `Delete Customer` permission attempts delete. | Throws `ServiceError(403, 'FORBIDDEN', ...)`. | Delete succeeds or wrong status code. | Pass | customers.delete-restore.test.jsx |
| DEL-CUST-06 | Restore customer succeeds for Admin | 1. Customer has `is_deleted = true`.<br>2. Admin calls `restoreCustomer(supabase, actor, custno)`. | Customer `is_deleted` set to `false`. Stamp updated with `EDITED <user> <timestamp>`. | Restore fails, wrong stamp prefix, or error thrown. | Pass | customers.delete-restore.test.jsx |
| DEL-CUST-07 | Restore customer refused for standard User role | 1. User with role `user` calls `restoreCustomer`. | Throws `ServiceError(403, 'FORBIDDEN', 'Only admins can restore customers')`. | Restore allowed for regular user. | Pass | customers.delete-restore.test.jsx |
| DEL-CUST-08 | Restore customer refused if customer is already active | 1. Customer has `is_deleted = false`.<br>2. Admin calls `restoreCustomer`. | Throws `ServiceError(409, 'ACTIVE', 'Customer already active')`. | Non-409 status or customer altered. | Pass | customers.delete-restore.test.jsx |
| DEL-CUST-09 | Route `DELETE /api/customers/[custno]` enforces authorization | 1. Caller lacks `Delete Customer` right.<br>2. Send `DELETE /api/customers/1001`. | Returns HTTP `403` with code `FORBIDDEN`. Service is not called. | Customer deleted or non-403 returned. | Pass | customers.delete-restore.test.jsx |
| DEL-CUST-10 | Route `POST /api/customers/[custno]/restore` rejects non-JSON payload | 1. Send `POST /api/customers/1001/restore` with content-type `text/plain`. | Returns HTTP `415` with code `UNSUPPORTED_MEDIA_TYPE`. | Non-415 response. | Pass | customers.delete-restore.test.jsx |

---

### 2. Product Soft Delete and Restore

| ID | Scenario | Steps | Pass | Fail | Result | Test File |
|---|---|---|---|---|---|---|
| DEL-PROD-01 | Delete product is refused when active sale lines exist | 1. Product is referenced on active sale line items (`activeSaleLines > 0`).<br>2. Call `deleteProduct(supabase, actor, prodcode)`. | Throws `ProductError` with code `IN_USE` and status `409`. Product remains active. | Product soft-deleted or non-409 error. | Pass | products.delete-restore.test.jsx |
| DEL-PROD-02 | Delete product succeeds when not on active sale lines | 1. Product has 0 active sale line references.<br>2. Admin calls `deleteProduct(supabase, actor, prodcode)`. | Product `is_deleted` set to `true`. Stamp updated with `DELETED <user> <timestamp>`. | Product not marked deleted, wrong stamp prefix, or error thrown. | Pass | products.delete-restore.test.jsx |
| DEL-PROD-03 | Delete product refused if already inactive | 1. Product has `is_deleted = true`.<br>2. Admin calls `deleteProduct`. | Throws `ProductError(409, 'DELETED', 'Product already inactive')`. | Product re-deleted or non-409 code. | Pass | products.delete-restore.test.jsx |
| DEL-PROD-04 | Delete product refused if product does not exist | 1. Call `deleteProduct` with unknown `prodcode`. | Throws `ProductError(404, 'NOT_FOUND', 'Product not found')`. | Non-404 status returned. | Pass | products.delete-restore.test.jsx |
| DEL-PROD-05 | Delete product route enforces rights check | 1. User without `Delete Product` right calls `DELETE /api/products/P-001`. | Returns HTTP `403` with code `FORBIDDEN`. Service is not called. | Product deleted or non-403 returned. | Pass | products.delete-restore.test.jsx |
| DEL-PROD-06 | Restore product succeeds for Admin | 1. Product has `is_deleted = true`.<br>2. Admin calls `restoreProduct(supabase, actor, prodcode)`. | Product `is_deleted` set to `false`. Stamp updated with `EDITED <user> <timestamp>`. | Restore fails, wrong stamp prefix, or error thrown. | Pass | products.delete-restore.test.jsx |
| DEL-PROD-07 | Restore product refused for standard User role | 1. User with role `user` calls `restoreProduct`. | Throws `ProductError(404, 'NOT_FOUND')` / returns `403` from route check. | User allowed to restore product. | Pass | products.delete-restore.test.jsx |
| DEL-PROD-08 | Restore product refused if product is already active | 1. Product has `is_deleted = false`.<br>2. Admin calls `restoreProduct`. | Throws `ProductError(409, 'NOT_DELETED', 'Product is already active')`. | Non-409 code or product modified. | Pass | products.delete-restore.test.jsx |
| DEL-PROD-09 | Route `POST /api/products/[prodcode]/restore` rejects User role | 1. User role sends `POST /api/products/P-001/restore`. | Returns HTTP `403` with code `FORBIDDEN`. | Non-403 response or restore processed. | Pass | products.delete-restore.test.jsx |
| DEL-PROD-10 | Route `POST /api/products/[prodcode]/restore` rejects non-JSON content-type | 1. Send `POST /api/products/P-001/restore` with `text/plain`. | Returns HTTP `415` with code `UNSUPPORTED_MEDIA_TYPE`. | Non-415 response. | Pass | products.delete-restore.test.jsx |

---

### 3. Visibility and UI Shading (Admin vs User)

| ID | Scenario | Steps | Pass | Fail | Result | Test File / Implementation |
|---|---|---|---|---|---|---|
| VIS-01 | Deleted customer and product rows are completely hidden for User | 1. Standard user calls `listCustomers` / `listProducts`. | Database query filters `is_deleted = false`. Inactive rows are not returned in list payload. `status` and `stamp` columns are stripped. | Deleted rows returned or visible in user UI. | Pass | customers.service.test.jsx; products.service.test.jsx |
| VIS-02 | Deleted customer and product rows are returned and shaded for Admin | 1. Admin views customer and product tables.<br>2. Row has `status === 'Inactive'`. | Admin receives all rows. UI applies `styles.deleted` class shading to inactive rows. | Deleted rows missing for Admin or not visually styled. | Pass | CustomersClient.jsx; ProductsClient.jsx; products.service.test.jsx |

---

### 4. Stamp Lifecycle Progression

| ID | Scenario | Steps | Pass | Fail | Result | Test File |
|---|---|---|---|---|---|---|
| STM-01 | Stamp changes correctly across full lifecycle | 1. Customer/Product created -> `CREATED <user> <time>`.<br>2. Updated -> `EDITED <user> <time>`.<br>3. Soft deleted -> `DELETED <user> <time>`.<br>4. Restored -> `EDITED <user> <time>`. | Stamp prefix transitions cleanly across each state. Exact email prefix and ISO/formatted timestamp recorded. | Stamp missing, unchanged, or incorrect prefix applied. | Pass | customers.delete-restore.test.jsx; products.delete-restore.test.jsx |

---

## Mishaps and Bugs Encountered & Fixed

1. **Mishap 1: Missing Application-Level Stamp Update in `products/service.ts`**
   - **Description:** In `web/src/lib/products/service.ts`, `deleteProduct` and `restoreProduct` only sent `{ is_deleted: true }` and `{ is_deleted: false }` to Supabase without updating `stamp`. The code assumed a Postgres SQL trigger existed to update the stamp, but unit/mock tests (and environments lacking that trigger) left `stamp` unmanaged during product delete and restore actions.
   - **Resolution:** Updated `deleteProduct` to write `stamp: makeStamp('DELETED', actor.email)` and `restoreProduct` to write `stamp: makeStamp('EDITED', actor.email)`, aligning product stamp behavior with `customers/service.ts`.
