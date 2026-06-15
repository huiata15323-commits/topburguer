
-- 1) Protect phone column via column-level grants (PostgREST honors these).
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.orders FROM anon, authenticated;

-- Public/anon can read all columns EXCEPT phone
GRANT SELECT (id, number, customer, table_number, items, notes, total, status,
              created_at, done_at, notified_at, rating, review, rated_at, waiter_called_at)
  ON public.orders TO anon, authenticated;

-- Anon/authenticated can insert only the customer-facing columns (phone allowed on insert)
GRANT INSERT (customer, phone, table_number, items, notes, total)
  ON public.orders TO anon, authenticated;

-- Anon/authenticated can update only feedback/notification columns
GRANT UPDATE (rating, review, rated_at, waiter_called_at, notified_at)
  ON public.orders TO anon, authenticated;

GRANT ALL ON public.orders TO service_role;

-- 2) Tighten UPDATE policy
DROP POLICY IF EXISTS orders_update_customer_feedback ON public.orders;
CREATE POLICY orders_update_customer_feedback ON public.orders
  FOR UPDATE TO anon, authenticated
  USING (status = ANY (ARRAY['pending'::text, 'preparing'::text, 'done'::text]))
  WITH CHECK (
    status = ANY (ARRAY['pending'::text, 'preparing'::text, 'done'::text])
    AND (rating IS NULL OR (rating >= 1 AND rating <= 5))
    AND (review IS NULL OR length(review) <= 300)
  );

-- 3) Lock down SECURITY DEFINER functions: revoke from PUBLIC/anon/authenticated,
-- then re-grant only where intentionally callable from the client.
REVOKE EXECUTE ON FUNCTION public.tg_menu_items_touch() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_first_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.decrement_menu_stock(jsonb) FROM PUBLIC;

-- claim_first_admin: only signed-in users may attempt to claim
GRANT EXECUTE ON FUNCTION public.claim_first_admin() TO authenticated;

-- decrement_menu_stock: called from the guest checkout RPC
GRANT EXECUTE ON FUNCTION public.decrement_menu_stock(jsonb) TO anon, authenticated;

-- has_role and tg_menu_items_touch are used internally (RLS policies / trigger)
-- and do not need EXECUTE granted to API roles.
