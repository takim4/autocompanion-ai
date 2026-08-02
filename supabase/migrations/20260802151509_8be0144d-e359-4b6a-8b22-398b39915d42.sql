CREATE TABLE public.ad_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ad_type text NOT NULL CHECK (ad_type IN ('banner','square','native','video')),
  business_name text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text,
  title text NOT NULL,
  description text NOT NULL,
  cta_label text NOT NULL DEFAULT 'İncele',
  target_url text NOT NULL,
  image_url text,
  budget_try numeric NOT NULL DEFAULT 0,
  duration_days integer NOT NULL DEFAULT 14,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  admin_note text,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ad_requests TO authenticated;
GRANT ALL ON public.ad_requests TO service_role;

ALTER TABLE public.ad_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own ad requests" ON public.ad_requests
  FOR SELECT TO authenticated USING (auth.uid() = advertiser_id);

CREATE POLICY "Anyone authenticated reads live approved ads" ON public.ad_requests
  FOR SELECT TO authenticated USING (
    status = 'approved'
    AND starts_at IS NOT NULL AND ends_at IS NOT NULL
    AND now() BETWEEN starts_at AND ends_at
  );

CREATE POLICY "Admins read all ad requests" ON public.ad_requests
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users create own ad requests" ON public.ad_requests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = advertiser_id AND status = 'pending');

CREATE POLICY "Users update own pending ad requests" ON public.ad_requests
  FOR UPDATE TO authenticated USING (auth.uid() = advertiser_id AND status = 'pending')
  WITH CHECK (auth.uid() = advertiser_id AND status = 'pending');

CREATE POLICY "Admins manage all ad requests" ON public.ad_requests
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users delete own pending ad requests" ON public.ad_requests
  FOR DELETE TO authenticated USING (auth.uid() = advertiser_id AND status = 'pending');

CREATE TRIGGER ad_requests_set_updated_at
  BEFORE UPDATE ON public.ad_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX ad_requests_advertiser_idx ON public.ad_requests (advertiser_id, created_at DESC);
CREATE INDEX ad_requests_live_idx ON public.ad_requests (status, starts_at, ends_at);