DROP TRIGGER IF EXISTS tg_orders_decrement_stock ON public.orders;
CREATE TRIGGER tg_orders_decrement_stock
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.tg_orders_decrement_stock();