-- Fact-Checker log table + mechanics table support for Apify (Google Maps) imports

-- ============ fact_checks ============
CREATE TABLE public.fact_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('vehicle', 'text')),
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  input_text TEXT,
  input_url TEXT,
  score NUMERIC(4,3) NOT NULL CHECK (score >= 0 AND score <= 1),
  passed BOOLEAN NOT NULL,
  verdict JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_fact_checks_user_created ON public.fact_checks(user_id, created_at DESC);
GRANT SELECT, INSERT ON public.fact_checks TO authenticated;
GRANT ALL ON public.fact_checks TO service_role;
ALTER TABLE public.fact_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fact_checks_owner_select" ON public.fact_checks FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "fact_checks_owner_insert" ON public.fact_checks FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fact_checks_admin_all" ON public.fact_checks FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ mechanics: allow imported (unclaimed) listings ============
-- Apify/Google Maps imports have no auth.users account, so user_id must become optional.
ALTER TABLE public.mechanics ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.mechanics DROP CONSTRAINT IF EXISTS mechanics_user_id_key;
CREATE UNIQUE INDEX mechanics_user_id_key ON public.mechanics(user_id) WHERE user_id IS NOT NULL;

ALTER TABLE public.mechanics ADD COLUMN source TEXT NOT NULL DEFAULT 'self';
ALTER TABLE public.mechanics ADD COLUMN external_id TEXT;
CREATE UNIQUE INDEX idx_mechanics_external_id ON public.mechanics(external_id) WHERE external_id IS NOT NULL;

-- Guard the role-grant trigger against imported rows with no user_id
CREATE OR REPLACE FUNCTION public.grant_mechanic_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, 'mechanic')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
