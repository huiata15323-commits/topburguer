
-- Sequência para o número do pedido (visível ao cliente)
CREATE SEQUENCE IF NOT EXISTS public.orders_number_seq START 1;

CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  number INTEGER NOT NULL DEFAULT nextval('public.orders_number_seq'),
  customer TEXT NOT NULL,
  phone TEXT,
  table_number INTEGER,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','preparing','done')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  done_at TIMESTAMPTZ,
  notified_at TIMESTAMPTZ,
  rating SMALLINT CHECK (rating BETWEEN 1 AND 5),
  review TEXT,
  rated_at TIMESTAMPTZ
);

ALTER SEQUENCE public.orders_number_seq OWNED BY public.orders.number;

CREATE INDEX orders_status_idx ON public.orders(status);
CREATE INDEX orders_created_at_idx ON public.orders(created_at DESC);

-- Grants (Data API)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO anon, authenticated;
GRANT ALL ON public.orders TO service_role;
GRANT USAGE, SELECT, UPDATE ON SEQUENCE public.orders_number_seq TO anon, authenticated;

-- RLS: acesso público (simulação escolar — sem login)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read orders"   ON public.orders FOR SELECT USING (true);
CREATE POLICY "Public can insert orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update orders" ON public.orders FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public can delete orders" ON public.orders FOR DELETE USING (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER TABLE public.orders REPLICA IDENTITY FULL;
