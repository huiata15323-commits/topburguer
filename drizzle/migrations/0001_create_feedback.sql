CREATE TABLE public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  presentation_rating smallint NOT NULL CHECK (presentation_rating BETWEEN 1 AND 5),
  system_rating smallint NOT NULL CHECK (system_rating BETWEEN 1 AND 5),
  comment text CHECK (comment IS NULL OR length(comment) <= 300),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.feedback TO anon, authenticated;
GRANT ALL ON public.feedback TO service_role;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY feedback_read_all ON public.feedback FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY feedback_insert_all ON public.feedback FOR INSERT TO anon, authenticated WITH CHECK (name IS NULL OR length(name) <= 60);