-- 1) Hide phone from anon/authenticated SELECT (column-level revoke)
REVOKE SELECT (phone) ON public.orders FROM anon;
REVOKE SELECT (phone) ON public.orders FROM authenticated;
-- Service role keeps full access (used by staff edge/server functions)

-- 2) Tighten UPDATE: anon can only touch feedback + waiter columns, never status/done_at/etc.
REVOKE UPDATE ON public.orders FROM anon;
REVOKE UPDATE ON public.orders FROM authenticated;
GRANT  UPDATE (rating, review, rated_at, waiter_called_at, notified_at)
       ON public.orders TO anon, authenticated;

-- Replace the permissive UPDATE policy with one that re-asserts the constraints
DROP POLICY IF EXISTS orders_update_customer_feedback ON public.orders;
CREATE POLICY orders_update_customer_feedback
ON public.orders
FOR UPDATE
TO anon, authenticated
USING (status = ANY (ARRAY['pending'::text, 'preparing'::text, 'done'::text]))
WITH CHECK (
  status = ANY (ARRAY['pending'::text, 'preparing'::text, 'done'::text])
  AND (rating IS NULL OR (rating >= 1 AND rating <= 5))
  AND (review IS NULL OR length(review) <= 300)
);

-- 3) Make sure orders is NOT in the realtime publication (Realtime was removed in app code;
--    drop from publication so even if a client tries to subscribe, no rows are broadcast).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orders'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.orders';
  END IF;
END $$;