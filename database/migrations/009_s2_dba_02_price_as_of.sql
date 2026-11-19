-- Migration: S2-DBA-02 (#100) - Current price as of a given date

CREATE OR REPLACE FUNCTION public.get_product_price_as_of(
    p_prodcode VARCHAR,
    p_as_of_date DATE
)
RETURNS DECIMAL(10,2)
LANGUAGE sql
STABLE
AS $$
    SELECT ph.unitprice
    FROM public.pricehist ph
    WHERE ph.prodcode = p_prodcode
      AND ph.effdate <= p_as_of_date
    ORDER BY ph.effdate DESC
    LIMIT 1;
$$;