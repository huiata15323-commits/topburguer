UPDATE public.orders
SET items = (
  SELECT jsonb_agg(
    CASE
      WHEN (it ->> 'image') LIKE 'data:%' THEN jsonb_set(it, '{image}', '""'::jsonb)
      ELSE it
    END
  )
  FROM jsonb_array_elements(items) AS it
)
WHERE items::text LIKE '%data:image%';

CREATE INDEX IF NOT EXISTS orders_created_at_desc_idx ON public.orders (created_at DESC);