-- Migration: S2-DBA-03 (#101) - Validation constraints (payTerms, unit) and Active default

-- Drop all dependent views before altering column types (recreated at the end)
DROP VIEW IF EXISTS public.customer_active;
DROP VIEW IF EXISTS public.product_active;
DROP VIEW IF EXISTS public.v_active_customers;
DROP VIEW IF EXISTS public.v_active_products;

-- 1. Payment terms validation on public.customer
ALTER TABLE public.customer
    ALTER COLUMN payterm TYPE VARCHAR(20);

ALTER TABLE public.customer
    DROP CONSTRAINT IF EXISTS pay_ck;

ALTER TABLE public.customer
    ADD CONSTRAINT pay_ck
    CHECK (payterm IN ('COD', '30D', '45D', 'Net 15', 'Net 30', 'Net 45', 'Prepaid'));

-- 2. Product unit validation on public.product
ALTER TABLE public.product
    ALTER COLUMN unit TYPE VARCHAR(20);

ALTER TABLE public.product
    DROP CONSTRAINT IF EXISTS unit_ck;

ALTER TABLE public.product
    ADD CONSTRAINT unit_ck
    CHECK (unit IN ('pc', 'ea', 'mtr', 'pkg', 'ltr', 'pcs', 'can', 'pair', 'meter'));

-- 3. Product status defaults to 'Active'
ALTER TABLE public.product
    ADD COLUMN IF NOT EXISTS status VARCHAR(20);

UPDATE public.product
SET status = 'Active'
WHERE status IS NULL;

ALTER TABLE public.product
    ALTER COLUMN status SET DEFAULT 'Active';

ALTER TABLE public.product
    ALTER COLUMN status SET NOT NULL;

-- 4. Recreate all dependent views
CREATE OR REPLACE VIEW public.customer_active AS
SELECT custno, custname, address, payterm, is_deleted, stamp
FROM public.customer
WHERE (NOT is_deleted);

CREATE OR REPLACE VIEW public.product_active AS
SELECT prodcode, description, unit, is_deleted, stamp
FROM public.product
WHERE (NOT is_deleted);

CREATE OR REPLACE VIEW public.v_active_customers AS
SELECT custno, custname, address, payterm
FROM public.customer;

CREATE OR REPLACE VIEW public.v_active_products AS
SELECT prodcode, description, unit
FROM public.product;