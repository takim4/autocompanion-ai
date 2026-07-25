
-- fact_checks table
CREATE TABLE public.fact_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('text','vehicle')),
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  input_text text NOT NULL,
  input_url text,
  score double precision NOT NULL,
  passed boolean NOT NULL,
  verdict jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_fact_checks_user ON public.fact_checks(user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fact_checks TO authenticated;
GRANT ALL ON public.fact_checks TO service_role;
ALTER TABLE public.fact_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own fact_checks" ON public.fact_checks
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own fact_checks" ON public.fact_checks
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins read all fact_checks" ON public.fact_checks
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- mechanics: support Google Maps imports without a user account
ALTER TABLE public.mechanics ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.mechanics DROP CONSTRAINT IF EXISTS mechanics_user_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS mechanics_user_id_unique
  ON public.mechanics(user_id) WHERE user_id IS NOT NULL;
ALTER TABLE public.mechanics ADD COLUMN IF NOT EXISTS external_id text;
ALTER TABLE public.mechanics ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';
CREATE UNIQUE INDEX IF NOT EXISTS mechanics_external_id_unique
  ON public.mechanics(external_id) WHERE external_id IS NOT NULL;
