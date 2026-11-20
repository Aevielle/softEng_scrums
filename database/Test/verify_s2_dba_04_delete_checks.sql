-- Verification script for S2-DBA-04 (#102)
-- Checks delete protection, active child soft-delete blocks,
-- link retention on soft-deleted rows, and restore behavior
-- for public.customer and public.product.

-- 1. Hard delete blocked on customer with active sales (C0001)
-- Expected error: ERROR: P0001: Hard delete/truncate not allowed on customer. Use UPDATE ... SET is_deleted = true.
DELETE FROM public.customer WHERE custno = 'C0001';

-- 2. Soft delete blocked when active sales exist (C0001)
-- Expected error: ERROR: P0001: Cannot delete customer row: 3 active related record(s) still exist.
UPDATE public.customer SET is_deleted = true WHERE custno = 'C0001';

-- 3. Hard delete blocked on product with active sale lines (AD0001)
-- Expected error: ERROR: P0001: Hard delete/truncate not allowed on product. Use UPDATE ... SET is_deleted = true.
DELETE FROM public.product WHERE prodcode = 'AD0001';

-- 4. Soft delete blocked when active related records exist (AD0001)
-- Expected error: ERROR: P0001: Cannot delete product row: 3 active related record(s) still exist.
UPDATE public.product SET is_deleted = true WHERE prodcode = 'AD0001';

-- 5. Setup isolated test records and soft-delete children first
INSERT INTO public.customer (custno, custname, address, payterm)
VALUES ('C9904', 'Test Cust 9904', 'Quezon City', 'Net 30')
ON CONFLICT (custno) DO NOTHING;

INSERT INTO public.product (prodcode, description, unit)
VALUES ('ZZ9904', 'Test Prod 9904', 'pcs')
ON CONFLICT (prodcode) DO NOTHING;

INSERT INTO public.sales (transno, salesdate, custno)
VALUES ('TR9904', CURRENT_DATE, 'C9904')
ON CONFLICT (transno) DO NOTHING;

INSERT INTO public.salesdetail (transno, prodcode, quantity)
VALUES ('TR9904', 'ZZ9904', 2)
ON CONFLICT (transno, prodcode) DO NOTHING;

UPDATE public.salesdetail SET is_deleted = true WHERE transno = 'TR9904' AND prodcode = 'ZZ9904';
UPDATE public.sales SET is_deleted = true WHERE transno = 'TR9904';

-- 6. Soft-delete parent records and verify links remain intact
UPDATE public.customer SET is_deleted = true WHERE custno = 'C9904';
UPDATE public.product SET is_deleted = true WHERE prodcode = 'ZZ9904';

SELECT
    c.custno,
    c.is_deleted AS cust_deleted,
    c.stamp AS cust_stamp,
    p.prodcode,
    p.is_deleted AS prod_deleted,
    p.stamp AS prod_stamp,
    s.transno,
    sd.quantity
FROM public.sales s
JOIN public.customer c ON c.custno = s.custno
JOIN public.salesdetail sd ON sd.transno = s.transno
JOIN public.product p ON p.prodcode = sd.prodcode
WHERE s.transno = 'TR9904';

-- 7. Restore parent records and verify they appear in active views
UPDATE public.customer SET is_deleted = false WHERE custno = 'C9904';
UPDATE public.product SET is_deleted = false WHERE prodcode = 'ZZ9904';

SELECT
    c.custno,
    c.custname,
    c.is_deleted AS cust_deleted,
    c.stamp AS cust_stamp,
    p.prodcode,
    p.description,
    p.is_deleted AS prod_deleted,
    p.stamp AS prod_stamp
FROM public.customer_active c
CROSS JOIN public.product_active p
WHERE c.custno = 'C9904'
  AND p.prodcode = 'ZZ9904';