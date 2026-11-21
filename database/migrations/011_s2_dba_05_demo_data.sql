-- S2-DBA-05 (#103): Idempotent demo data for customer, product, and pricehist

BEGIN;

-- 1. Customers (C-001 to C-005, with C-005 soft-deleted / Inactive)
INSERT INTO public.customer (custno, custname, address, payterm, is_deleted)
VALUES
    ('C-001', 'Northstar Mart',     '12 Aurora Blvd, Quezon City',   'Net 30', false),
    ('C-002', 'Metro Supply Hub',   '45 Katipunan Ave, Quezon City', 'COD',    false),
    ('C-003', 'Sunrise Grocer',     '88 Commonwealth Ave, QC',       'Net 15', false),
    ('C-004', 'Bayanihan Trading',  '104 Visayas Ave, Quezon City',  'Net 45', false),
    ('C-005', 'Harbor Retail Co',   '210 EDSA, Mandaluyong City',    'COD',    true)
ON CONFLICT (custno) DO UPDATE
SET custname   = EXCLUDED.custname,
    address    = EXCLUDED.address,
    payterm    = EXCLUDED.payterm,
    is_deleted = EXCLUDED.is_deleted;

-- 2. Products (P-001 to P-005, with P-005 soft-deleted / Inactive)
INSERT INTO public.product (prodcode, description, unit, status, is_deleted)
VALUES
    ('P-001', 'Premium Bottled Water 500ml', 'pcs', 'Active', false),
    ('P-002', 'Canned Tuna Flakes in Oil',   'can', 'Active', false),
    ('P-003', 'Instant Oatmeal Pack 400g',   'pcs', 'Active', false),
    ('P-004', 'Unpriced Promo Sample Item',  'pcs', 'Active', false),
    ('P-005', 'Discontinued Canned Sardines','can', 'Active', true)
ON CONFLICT (prodcode) DO UPDATE
SET description = EXCLUDED.description,
    unit        = EXCLUDED.unit,
    status      = EXCLUDED.status,
    is_deleted  = EXCLUDED.is_deleted;

-- 3. Price History
-- P-001 has multiple price points; P-004 intentionally has no price history
INSERT INTO public.pricehist (effdate, prodcode, unitprice, is_deleted)
VALUES
    ('2026-01-15', 'P-001', 15.00, false),
    ('2026-06-01', 'P-001', 18.00, false),
    ('2026-02-01', 'P-002', 42.50, false),
    ('2026-03-10', 'P-003', 65.00, false),
    ('2026-01-10', 'P-005', 24.00, true)
ON CONFLICT (effdate, prodcode) DO UPDATE
SET unitprice  = EXCLUDED.unitprice,
    is_deleted = EXCLUDED.is_deleted;

COMMIT;