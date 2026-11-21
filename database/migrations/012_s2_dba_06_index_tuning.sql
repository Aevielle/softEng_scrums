-- S2-DBA-06 (#104): Search performance check and idempotent index tuning

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. Price history: fast lookup of latest active price per product (eliminates Seq Scan + Sort)
CREATE INDEX IF NOT EXISTS idx_pricehist_active_prodcode_effdate
    ON public.pricehist (prodcode, effdate DESC)
    WHERE is_deleted = false;

-- 2. Customer: fast active prefix & substring case-insensitive search
CREATE INDEX IF NOT EXISTS idx_customer_active_lower_custname_pattern
    ON public.customer (LOWER(custname) text_pattern_ops)
    WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_customer_active_custname_trgm
    ON public.customer USING gin (LOWER(custname) gin_trgm_ops)
    WHERE is_deleted = false;