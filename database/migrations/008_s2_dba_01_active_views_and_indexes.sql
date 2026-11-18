-- Migration: S2-DBA-01 (#99) - Active Views and Indexes

-- Search and filter indexes
CREATE INDEX IF NOT EXISTS idx_customer_custname ON public.customer (custname);
CREATE INDEX IF NOT EXISTS idx_customer_payterm ON public.customer (payterm);
CREATE INDEX IF NOT EXISTS idx_product_description ON public.product (description);
CREATE INDEX IF NOT EXISTS idx_product_unit ON public.product (unit);

-- Active views
CREATE OR REPLACE VIEW public.v_active_customers AS
SELECT custno, custname, address, payterm
FROM public.customer;

CREATE OR REPLACE VIEW public.v_active_products AS
SELECT prodCode, description, unit
FROM public.product;