
REVOKE EXECUTE ON FUNCTION public.tg_menu_items_touch() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_first_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.decrement_menu_stock(jsonb) FROM PUBLIC;
-- claim_first_admin: keep for authenticated (admin bootstrap)
GRANT EXECUTE ON FUNCTION public.claim_first_admin() TO authenticated;
-- decrement_menu_stock: intentional public RPC for guest checkout
GRANT EXECUTE ON FUNCTION public.decrement_menu_stock(jsonb) TO anon, authenticated;
