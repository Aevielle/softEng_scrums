# Test Plan for S2-TST-02: Products and Prices
 
## Test Setup
Automated unit and API testing using Jest for the routes, filter, service, prices service, and validation logic.
 
## Tester
Franchesca E. Ramirez
 
## Testing Start Time
Sprint 2 (Products and Price History)
 
## Test Setup Notes
Use a test environment with simulated roles (Admin, Superadmin, and User). Seed or mock products with and without price histories, including both Active and soft-deleted (Inactive) products and prices. Ensure tests verify role-based permissions (Add/Edit/Delete Product, Add/Edit/Delete Price) and user-level field masking. Tests mock Supabase queries or run pure calculation/validation functions.
 
**Result key:** Pass | Fail | Not implemented | Not tested (no test written yet) | Not run (test exists, result not recorded yet)
 
## Automated Test Files
| File | Type | Covers |
|---|---|---|
| `web/src/test/unit/api/products/products.test.jsx` | Jest | `GET /api/products`, `POST /api/products`, `PATCH /api/products/[prodcode]` routes |
| `web/src/test/unit/api/products/products.filter.test.jsx` | Jest | `filterProducts`, `countByStatus`, `formatPrice` |
| `web/src/test/unit/api/products/products.service.test.jsx` | Jest | `listProducts`, `countProducts`, `createProduct`, `updateProduct`, `formatCode` |
| `web/src/test/unit/api/products/prices.test.jsx` | Jest | `GET/POST /api/products/[prodcode]/prices`, `PATCH/DELETE /api/products/[prodcode]/prices/[effdate]` routes |
| `web/src/test/unit/api/products/prices.service.test.jsx` | Jest | `listPrices`, `addPrice`, `updatePrice`, `deletePrice`, date uniqueness checks |
| `web/src/test/unit/api/products/prices.validate.test.jsx` | Jest | `isValidDate`, `validatePriceInput`, `pickCurrentPrice`, `countPrices`, `filterPrices` |
 
## Features to Test
- List and search products (Admin and User)
- Status filter for products (Active, Inactive, All)
- Add product (auto-incremented code `P-XXX`, unit validation, rights check)
- Edit product (description, unit, rights check, soft-deleted product handling)
- Price history list and current price calculation (latest non-future price, dash when none)
- Add, edit, and delete (soft-delete) price
- Duplicate effective date rejection (both active and inactive prices)
 
## Pass-Fail Conditions and Results
 
### 1. List and Search Products
 
| ID | Scenario | Steps | Pass | Fail | Result | Test |
|---|---|---|---|---|---|---|
| PRD-01 | Unauthenticated caller is blocked. | 1. Call `GET /api/products` with no session. | 401 with code `UNAUTHENTICATED` is returned; no products are fetched. | 200 or products returned. | Pass | products.test.jsx |
| PRD-02 | Caller without "products" right is blocked. | 1. Sign in as user lacking module right.<br>2. Call `GET /api/products`. | 403 with code `FORBIDDEN` is returned; list service is not called. | Products returned or non-403 status. | Pass | products.test.jsx |
| PRD-03 | Admin lists all products with status, stamp, and current price. | 1. Sign in as Admin.<br>2. Call `GET /api/products`. | 200 with `{ products }`. Active and Inactive rows appear with `status`, `stamp`, and `price` (or null). `is_deleted` is not exposed. | Non-200, deleted products missing, or Status/Stamp missing. | Pass | products.service.test.jsx; products.test.jsx |
| PRD-04 | User lists active products only with masked fields. | 1. Sign in as User.<br>2. Call `GET /api/products`. | 200 with `{ products }`. Inactive products are filtered out; `status` and `stamp` are omitted. | Inactive products returned or status/stamp exposed. | Pass | products.service.test.jsx; products.test.jsx |
| PRD-05 | Search products by keyword across code, description, and unit. | 1. Call `filterProducts` with search term `copper`, `P-003`, or `meter`. | Matching rows are returned (case-insensitive and trimmed). | Row missing or extra unrelated rows returned. | Pass | products.filter.test.jsx |
| PRD-06 | Blank or whitespace search defaults to all rows. | 1. Search with `   ` or empty string. | All rows are returned without error. | Empty array or error returned. | Pass | products.filter.test.jsx; products.test.jsx |
| PRD-07 | Admin filters products by status tab. | 1. Admin requests `?status=Active` then `?status=Inactive`. | Only rows matching the requested status are returned. | Status ignored or wrong rows returned. | Pass | products.filter.test.jsx; products.test.jsx |
| PRD-08 | Admin invalid status falls back to All. | 1. Admin sends `?status=InvalidStatus`. | Status defaults to `All`; request succeeds. | Error returned or invalid status reaches filter. | Pass | products.test.jsx |
| PRD-09 | User role ignores status query. | 1. User sends `?status=Inactive`. | Status defaults to `All`; user receives only Active rows from server. | Inactive rows returned to user. | Pass | products.test.jsx |
| PRD-10 | Unexpected error in product list delegates to fail(). | 1. Make `listProducts` throw an unexpected error. | Server error handled via `fail()`; raw stack not leaked. | Unhandled rejection or server crash. | Pass | products.test.jsx |
 
### 2. Add Product (POST /api/products)
 
| ID | Scenario | Steps | Pass | Fail | Result | Test |
|---|---|---|---|---|---|---|
| PRD-11 | Product added successfully with auto-numbering. | 1. Send `POST /api/products` with valid `description` and `unit`. | 201 `{ product }`. Code `P-XXX` is assigned, `CREATED` stamp is written, and initial price is `null`. | Row not created or code/stamp incorrect. | Pass | products.service.test.jsx; products.test.jsx |
| PRD-12 | Adding with empty description or unit is rejected. | 1. Send `POST /api/products` with empty fields. | 400 with code `VALIDATION` and field-level errors; no row inserted. | Row inserted or status not 400. | Pass | products.test.jsx |
| PRD-13 | Adding with invalid unit is rejected. | 1. Send `POST /api/products` with `unit: 'invalid_unit'`. | 400 with code `VALIDATION` specifying allowed units (`pcs`, `can`, `pair`, `meter`). | Row inserted or invalid unit allowed. | Pass | products.test.jsx |
| PRD-14 | Adding with description exceeding 100 characters is rejected. | 1. Send `POST /api/products` with `description` of 105 characters. | 400 with validation error indicating description limit. | Row saved or truncated silently. | Pass | products.filter.test.jsx |
| PRD-15 | Adding without "Add Product" right is refused. | 1. Sign in as account without `Add Product` right.<br>2. Send valid POST. | 403 with code `FORBIDDEN`; no row inserted. | Row inserted. | Pass | products.test.jsx |
| PRD-16 | Adding with non-JSON content type is rejected. | 1. Send `POST /api/products` with `Content-Type: text/plain`. | 415 with code `UNSUPPORTED_MEDIA_TYPE`. | Request accepted. | Pass | products.test.jsx |
 
### 3. Edit Product (PATCH /api/products/[prodcode])
 
| ID | Scenario | Steps | Pass | Fail | Result | Test |
|---|---|---|---|---|---|---|
| PRD-17 | Product edited successfully. | 1. Send `PATCH /api/products/P-001` with new `description` and `unit`. | 200 `{ product }`. `EDITED` stamp is written, `prodcode` remains unchanged, and current price is attached. | Changes not saved or code modified. | Pass | products.service.test.jsx; products.test.jsx |
| PRD-18 | Editing with invalid fields is rejected. | 1. Send PATCH with empty description or invalid unit. | 400 with code `VALIDATION`; product unchanged. | Invalid values saved. | Pass | products.test.jsx |
| PRD-19 | Editing without "Edit Product" right is refused. | 1. Sign in as account without `Edit Product` right.<br>2. Send valid PATCH. | 403 with code `FORBIDDEN`; product unchanged. | Product updated. | Pass | products.test.jsx |
| PRD-20 | Editing non-existent product returns 404. | 1. Send PATCH for unknown product code `P-999`. | 404 with code `NOT_FOUND`. | Non-404 status returned. | Pass | products.service.test.jsx; products.test.jsx |
| PRD-21 | Editing inactive (soft-deleted) product is refused. | 1. Send PATCH for an Inactive product code. | Admin gets 409 `DELETED` ("Restore it before editing"); User gets 404 `NOT_FOUND`. | Inactive product is modified. | Pass | products.service.test.jsx; products.test.jsx |
 
### 4. Current Price Calculation and Formatting
 
| ID | Scenario | Steps | Pass | Fail | Result | Test |
|---|---|---|---|---|---|---|
| PRD-22 | Current price selects latest active price on or before today. | 1. Supply price history with dates before today.<br>2. Call `pickCurrentPrice(history, today)`. | Returns unit price of the latest effective date. | Older price or null returned. | Pass | prices.validate.test.jsx |
| PRD-23 | Future prices are excluded from current price. | 1. Add price with effective date in the future.<br>2. Call `pickCurrentPrice(history, today)`. | Future price is skipped; latest past/present price returned. | Future price selected as current. | Pass | prices.validate.test.jsx |
| PRD-24 | Soft-deleted prices are excluded from current price. | 1. Add deleted price (stamp starts with `DELETED`).<br>2. Call `pickCurrentPrice(history, today)`. | Deleted price is skipped; falls back to earlier active price. | Deleted price returned. | Pass | prices.validate.test.jsx |
| PRD-25 | Product with no current price yields null / dash. | 1. Call `pickCurrentPrice` with empty history or only future/deleted prices. | Returns `null`. `formatPrice(null)` returns `'—'`. | Price or 0 returned instead of null/dash. | Pass | prices.validate.test.jsx; products.filter.test.jsx |
| PRD-26 | formatPrice formats currency values. | 1. Call `formatPrice(13.75)` and `formatPrice(25)`. | Returns `"$13.75"` and `"$25.00"`. | Unformatted number or raw decimal. | Pass | products.filter.test.jsx |
 
### 5. Price History - Add, Edit, and Delete Price
 
| ID | Scenario | Steps | Pass | Fail | Result | Test |
|---|---|---|---|---|---|---|
| PRD-27 | Admin lists prices with Status, Stamp, and current price. | 1. Call `GET /api/products/P-001/prices` as Admin. | 200 `{ product, prices, currentPrice }`. All rows show `status` and `stamp`. | Missing prices, currentPrice, or Status/Stamp. | Pass | prices.service.test.jsx; prices.test.jsx |
| PRD-28 | User lists active prices only with masked fields. | 1. Call `GET /api/products/P-001/prices` as User. | 200 with Active prices only; `status` and `stamp` omitted. | Inactive prices shown or status/stamp exposed. | Pass | prices.service.test.jsx |
| PRD-29 | Price added successfully. | 1. Send `POST /api/products/P-001/prices` with valid `effdate` and `unitprice`. | 201 `{ price, currentPrice }`. `CREATED` stamp written; `status` is Active. | Price not saved or status not 201. | Pass | prices.service.test.jsx; prices.test.jsx |
| PRD-30 | Adding with invalid date is rejected. | 1. Send POST with `effdate: '2026-02-30'` or `'invalid'`. | 400 with code `VALIDATION` ("Enter a real date (YYYY-MM-DD)"). | Non-date accepted. | Pass | prices.validate.test.jsx; prices.test.jsx |
| PRD-31 | Adding with zero or negative price is rejected. | 1. Send POST with `unitprice: 0` or `-10`. | 400 with code `VALIDATION` ("Unit price must be above zero"). | Invalid price accepted. | Pass | prices.validate.test.jsx; prices.test.jsx |
| PRD-32 | Adding price refused without "Add Price" right. | 1. Sign in as account without `Add Price` right.<br>2. Send valid POST. | 403 with code `FORBIDDEN`. | Price created. | Pass | prices.test.jsx |
| PRD-33 | Price edited successfully. | 1. Send `PATCH /api/products/P-001/prices/2026-03-01` with new unit price. | 200 `{ price, currentPrice }`. `EDITED` stamp written; `currentPrice` recomputed. | Not updated or stamp unchanged. | Pass | prices.service.test.jsx; prices.test.jsx |
| PRD-34 | Editing price refused without "Edit Price" right. | 1. Sign in as account without `Edit Price` right.<br>2. Send valid PATCH. | 403 with code `FORBIDDEN`. | Price updated. | Pass | prices.test.jsx |
| PRD-35 | Editing non-existent price returns 404. | 1. Send PATCH for an unknown effective date. | 404 with code `NOT_FOUND`. | Non-404 status returned. | Pass | prices.service.test.jsx; prices.test.jsx |
| PRD-36 | Price deleted successfully (soft delete). | 1. Send `DELETE /api/products/P-001/prices/2026-03-01`. | 200 `{ price, currentPrice }`. Status becomes Inactive, `DELETED` stamp written; `currentPrice` recomputed. | Hard deleted or status unchanged. | Pass | prices.service.test.jsx; prices.test.jsx |
| PRD-37 | Deleting price refused without "Delete Price" right. | 1. Sign in as account without `Delete Price` right.<br>2. Send DELETE. | 403 with code `FORBIDDEN`. | Price deleted. | Pass | prices.test.jsx |
| PRD-38 | Deleting an already inactive price returns 409. | 1. Send DELETE for an already soft-deleted price. | 409 with code `PRICE_DELETED` ("This price is already Inactive."). | Accepted or 500 error. | Pass | prices.service.test.jsx; prices.test.jsx |
 
### 6. Duplicate Effective Date Rejection
 
| ID | Scenario | Steps | Pass | Fail | Result | Test |
|---|---|---|---|---|---|---|
| PRD-39 | Adding duplicate effective date of active price is rejected. | 1. Send `POST /api/products/P-001/prices` with date already in active price history. | 409 with code `DUPLICATE_DATE` ("This product already has a price for that effective date."). | Duplicate price inserted. | Pass | prices.service.test.jsx; prices.test.jsx |
| PRD-40 | Adding duplicate effective date of inactive (deleted) price is rejected. | 1. Send POST with date of a soft-deleted price. | 409 with code `DUPLICATE_DATE` ("An Inactive (deleted) price already uses this effective date."). | Duplicate price inserted. | Pass | prices.service.test.jsx; prices.test.jsx |
| PRD-41 | Editing price to collide with another price date is rejected. | 1. Send `PATCH /api/products/P-001/prices/2026-03-01` with `effdate: '2026-05-01'` (which already exists). | 409 with code `DUPLICATE_DATE`. | Colliding date accepted. | Pass | prices.service.test.jsx; prices.test.jsx |
| PRD-42 | Editing price while keeping its own date is accepted. | 1. Send `PATCH /api/products/P-001/prices/2026-03-01` with same date `2026-03-01` and new price. | 200 with updated price; no false duplicate date error. | Erroneously rejected as duplicate. | Pass | prices.service.test.jsx |
 
## Notes
- Soft-deleted prices retain their `(prodcode, effdate)` database key with a `DELETED <who> <when>` stamp. Because the primary constraint is composite `(prodcode, effdate)`, duplicate effective dates must be rejected even if the existing record is soft-deleted.
- The `pickCurrentPrice` logic enforces business rules client-side and server-side: future dates (`effdate > asOf`) and deleted prices are ignored; if no valid active price remains on or before today, `null` is returned and formatted as a dash (`'—'`).
