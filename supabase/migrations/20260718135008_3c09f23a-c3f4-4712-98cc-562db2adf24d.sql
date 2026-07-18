-- 1. app_role enum'una 'mechanic' ekle
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'mechanic';

-- 2. mechanics tablosu
CREATE TABLE public.mechanics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name text NOT NULL,
  owner_name text,
  phone text NOT NULL,
  whatsapp text,
  email text,
  address text NOT NULL,
  city text NOT NULL,
  district text,
  lat double precision,
  lng double precision,
  specialties text[] NOT NULL DEFAULT '{}',
  brands text[] NOT NULL DEFAULT '{}',
  bio text,
  hours jsonb,
  verified boolean NOT NULL DEFAULT true, -- MVP: auto-approve
  active boolean NOT NULL DEFAULT true,
  avg_rating numeric(3,2) NOT NULL DEFAULT 0,
  rating_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mechanics_city ON public.mechanics(city) WHERE active AND verified;
CREATE INDEX idx_mechanics_specialties ON public.mechanics USING GIN(specialties);
CREATE INDEX idx_mechanics_geo ON public.mechanics(lat, lng) WHERE lat IS NOT NULL AND lng IS NOT NULL;

GRANT SELECT ON public.mechanics TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.mechanics TO authenticated;
GRANT ALL ON public.mechanics TO service_role;

ALTER TABLE public.mechanics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view verified active mechanics"
  ON public.mechanics FOR SELECT
  USING (verified = true AND active = true);

CREATE POLICY "Owner can view own profile"
  ON public.mechanics FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Owner can insert own profile"
  ON public.mechanics FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can update own profile"
  ON public.mechanics FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage all mechanics"
  ON public.mechanics FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_mechanics_updated
  BEFORE UPDATE ON public.mechanics
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Usta kayıt olduğunda user_roles'a 'mechanic' rolü ekle
CREATE OR REPLACE FUNCTION public.grant_mechanic_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.user_id, 'mechanic')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_mechanic_role
  AFTER INSERT ON public.mechanics
  FOR EACH ROW EXECUTE FUNCTION public.grant_mechanic_role();

-- 3. quote_requests
CREATE TABLE public.quote_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mechanic_id uuid NOT NULL REFERENCES public.mechanics(id) ON DELETE CASCADE,
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  issue_summary text NOT NULL,
  diagnosis_snapshot text,
  preferred_contact text NOT NULL DEFAULT 'in_app' CHECK (preferred_contact IN ('in_app','phone','whatsapp')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','quoted','accepted','declined','closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_quote_requests_user ON public.quote_requests(user_id, created_at DESC);
CREATE INDEX idx_quote_requests_mechanic ON public.quote_requests(mechanic_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.quote_requests TO authenticated;
GRANT ALL ON public.quote_requests TO service_role;

ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User sees own quote requests"
  ON public.quote_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Mechanic sees requests to self"
  ON public.quote_requests FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.mechanics m WHERE m.id = mechanic_id AND m.user_id = auth.uid()));

CREATE POLICY "User creates own quote request"
  ON public.quote_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "User updates own status"
  ON public.quote_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Mechanic updates request status"
  ON public.quote_requests FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.mechanics m WHERE m.id = mechanic_id AND m.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.mechanics m WHERE m.id = mechanic_id AND m.user_id = auth.uid()));

CREATE TRIGGER trg_quote_requests_updated
  BEFORE UPDATE ON public.quote_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 24h rate limit: aynı user-mechanic çifti için son 24 saatte tekrar istek atılamaz
CREATE OR REPLACE FUNCTION public.enforce_quote_request_ratelimit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.quote_requests
    WHERE user_id = NEW.user_id
      AND mechanic_id = NEW.mechanic_id
      AND created_at > now() - interval '24 hours'
  ) THEN
    RAISE EXCEPTION 'Bu ustaya son 24 saatte zaten teklif isteği gönderdiniz.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_quote_requests_ratelimit
  BEFORE INSERT ON public.quote_requests
  FOR EACH ROW EXECUTE FUNCTION public.enforce_quote_request_ratelimit();

-- 4. quote_responses
CREATE TABLE public.quote_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.quote_requests(id) ON DELETE CASCADE,
  mechanic_id uuid NOT NULL REFERENCES public.mechanics(id) ON DELETE CASCADE,
  price_min numeric(10,2),
  price_max numeric(10,2),
  currency text NOT NULL DEFAULT 'TRY',
  message text NOT NULL,
  eta_days integer,
  parts_included boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_quote_responses_request ON public.quote_responses(request_id);

GRANT SELECT, INSERT, UPDATE ON public.quote_responses TO authenticated;
GRANT ALL ON public.quote_responses TO service_role;

ALTER TABLE public.quote_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Request owner sees response"
  ON public.quote_responses FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.quote_requests q WHERE q.id = request_id AND q.user_id = auth.uid()));

CREATE POLICY "Mechanic sees own responses"
  ON public.quote_responses FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.mechanics m WHERE m.id = mechanic_id AND m.user_id = auth.uid()));

CREATE POLICY "Mechanic creates response"
  ON public.quote_responses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.mechanics m WHERE m.id = mechanic_id AND m.user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.quote_requests q WHERE q.id = request_id AND q.mechanic_id = mechanic_id)
  );

CREATE POLICY "Mechanic updates own response"
  ON public.quote_responses FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.mechanics m WHERE m.id = mechanic_id AND m.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.mechanics m WHERE m.id = mechanic_id AND m.user_id = auth.uid()));

CREATE TRIGGER trg_quote_responses_updated
  BEFORE UPDATE ON public.quote_responses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Cevap eklendiğinde request'in status'unu 'quoted' yap
CREATE OR REPLACE FUNCTION public.mark_request_quoted()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE public.quote_requests
  SET status = 'quoted', updated_at = now()
  WHERE id = NEW.request_id AND status = 'pending';
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_mark_request_quoted
  AFTER INSERT ON public.quote_responses
  FOR EACH ROW EXECUTE FUNCTION public.mark_request_quoted();