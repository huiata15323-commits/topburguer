CREATE OR REPLACE FUNCTION public.decrement_menu_stock(p_items jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  it jsonb;
  v_id text;
  v_qty int;
  v_stock int;
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
    RETURN;
  END IF;

  FOR it IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_id := COALESCE(it->>'menu_id', it->>'menuId');
    v_qty := COALESCE((it->>'quantity')::int, 0);
    IF v_id IS NULL OR v_qty <= 0 THEN CONTINUE; END IF;

    SELECT stock INTO v_stock FROM public.menu_items WHERE id = v_id FOR UPDATE;
    IF NOT FOUND THEN CONTINUE; END IF;
    IF v_stock IS NULL THEN CONTINUE; END IF;

    UPDATE public.menu_items
       SET stock = GREATEST(0, v_stock - v_qty),
           sold_out = CASE WHEN GREATEST(0, v_stock - v_qty) <= 0 THEN true ELSE sold_out END
     WHERE id = v_id;
  END LOOP;
END
$$;

CREATE OR REPLACE FUNCTION public.tg_orders_decrement_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.decrement_menu_stock(NEW.items);
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS orders_decrement_stock_after_insert ON public.orders;
CREATE TRIGGER orders_decrement_stock_after_insert
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.tg_orders_decrement_stock();

DROP POLICY IF EXISTS menu_items_admin_insert ON public.menu_items;
DROP POLICY IF EXISTS menu_items_admin_update ON public.menu_items;
DROP POLICY IF EXISTS menu_items_admin_delete ON public.menu_items;

CREATE POLICY menu_items_admin_insert ON public.menu_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'::public.app_role
    )
  );

CREATE POLICY menu_items_admin_update ON public.menu_items
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'::public.app_role
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'::public.app_role
    )
  );

CREATE POLICY menu_items_admin_delete ON public.menu_items
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'::public.app_role
    )
  );

DROP POLICY IF EXISTS "admins manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "admins read all roles" ON public.user_roles;

REVOKE EXECUTE ON FUNCTION public.claim_first_admin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.decrement_menu_stock(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_orders_decrement_stock() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;