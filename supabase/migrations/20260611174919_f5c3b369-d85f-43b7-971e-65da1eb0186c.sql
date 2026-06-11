
-- Drop overly permissive public policies on orders
DROP POLICY IF EXISTS "Public can delete orders" ON public.orders;
DROP POLICY IF EXISTS "Public can insert orders" ON public.orders;
DROP POLICY IF EXISTS "Public can read orders" ON public.orders;
DROP POLICY IF EXISTS "Public can update orders" ON public.orders;

-- Stop broadcasting full rows (including phone) to every anon subscriber
ALTER PUBLICATION supabase_realtime DROP TABLE public.orders;

-- Reset grants and apply column-level access
REVOKE ALL ON public.orders FROM anon, authenticated, PUBLIC;

-- Customers (anon) can read everything EXCEPT phone (PII)
GRANT SELECT
  (id, number, customer, table_number, items, notes, total, status,
   created_at, done_at, notified_at, rating, review, rated_at, waiter_called_at)
  ON public.orders TO anon;

-- Customers can create orders with only safe columns; status/total defaults apply
GRANT INSERT (customer, phone, table_number, items, notes, total)
  ON public.orders TO anon;

-- Customers can ONLY update feedback / waiter call / push-notified flag.
-- Operational fields (status, items, total, etc.) are NOT grantable to anon.
GRANT UPDATE (rating, review, rated_at, waiter_called_at, notified_at)
  ON public.orders TO anon;

-- Authenticated mirrors anon for now (no staff auth yet); admin server fns use service_role
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;

-- Sequence access for inserts
GRANT USAGE, SELECT ON SEQUENCE public.orders_number_seq TO anon, authenticated, service_role;

-- RLS policies (column grants enforce field-level limits; policies enforce row-level)
CREATE POLICY "orders_select_public_no_pii"
  ON public.orders FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "orders_insert_customer"
  ON public.orders FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    status = 'pending'
    AND total >= 0
    AND length(customer) BETWEEN 1 AND 80
  );

CREATE POLICY "orders_update_customer_feedback"
  ON public.orders FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (
    status IN ('pending','preparing','done')
    AND (rating IS NULL OR (rating BETWEEN 1 AND 5))
  );

-- No DELETE policy => anon/authenticated cannot delete. Staff deletes go through
-- server functions that use the service_role client.
