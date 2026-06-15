
-- 1) Tabela menu_items
CREATE TABLE IF NOT EXISTS public.menu_items (
  id text PRIMARY KEY,
  name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  category text NOT NULL CHECK (category IN ('burger','side','drink')),
  emoji text NOT NULL DEFAULT '🍔',
  image text NOT NULL DEFAULT '',
  description text,
  sold_out boolean NOT NULL DEFAULT false,
  stock integer,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2) GRANTS (leitura pública; escrita só authenticated, filtrada por RLS)
GRANT SELECT ON public.menu_items TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.menu_items TO authenticated;
GRANT ALL ON public.menu_items TO service_role;

-- 3) RLS
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY menu_items_read_all ON public.menu_items
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY menu_items_admin_insert ON public.menu_items
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY menu_items_admin_update ON public.menu_items
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY menu_items_admin_delete ON public.menu_items
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 4) updated_at trigger
CREATE OR REPLACE FUNCTION public.tg_menu_items_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_menu_items_touch BEFORE UPDATE ON public.menu_items
  FOR EACH ROW EXECUTE FUNCTION public.tg_menu_items_touch();

-- 5) Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_items;

-- 6) RPC atômico para decrementar estoque (anti-oversell)
-- p_items: jsonb array [{ "menu_id":"b1", "quantity": 2 }, ...]
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
    v_id  := it->>'menu_id';
    v_qty := COALESCE((it->>'quantity')::int, 0);
    IF v_id IS NULL OR v_qty <= 0 THEN CONTINUE; END IF;

    SELECT stock INTO v_stock FROM public.menu_items WHERE id = v_id FOR UPDATE;
    IF NOT FOUND THEN CONTINUE; END IF;
    IF v_stock IS NULL THEN CONTINUE; END IF; -- sem controle de estoque

    UPDATE public.menu_items
       SET stock = GREATEST(0, v_stock - v_qty),
           sold_out = CASE WHEN GREATEST(0, v_stock - v_qty) <= 0 THEN true ELSE sold_out END
     WHERE id = v_id;
  END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION public.decrement_menu_stock(jsonb) TO anon, authenticated;

-- 7) Seed inicial (idempotente). Imagens ficam vazias — o cliente usa o asset local pelo id.
INSERT INTO public.menu_items (id, name, price, category, emoji, description, sort_order) VALUES
  ('b1','Top Classic',28,'burger','🍔','Pão brioche, blend 160g, queijo, alface, tomate',1),
  ('b2','Top Bacon',34,'burger','🥓','Blend 160g, bacon crocante, cheddar, cebola caramelizada',2),
  ('b3','Top Cheddar Duplo',38,'burger','🧀','Dois blends, cheddar duplo, picles',3),
  ('b4','Top Veggie',30,'burger','🥬','Burger de grão de bico, rúcula, tomate seco',4),
  ('s1','Batata Frita',18,'side','🍟',NULL,5),
  ('s2','Onion Rings',20,'side','🧅',NULL,6),
  ('s3','Nuggets (8un)',22,'side','🍗',NULL,7),
  ('d1','Coca-Cola 350ml',8,'drink','🥤',NULL,8),
  ('d2','Suco Natural',10,'drink','🧃',NULL,9),
  ('d3','Milk Shake',16,'drink','🥛',NULL,10)
ON CONFLICT (id) DO NOTHING;
