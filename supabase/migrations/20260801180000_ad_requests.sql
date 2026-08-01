-- Reklam talepleri: gerçek reklamverenler (kullanıcı/işletme) bir form
-- doldurup reklam talebinde bulunur; admin onaylar/reddeder. Şu an gerçek bir
-- ödeme sağlayıcısı (Stripe/iyzico vb.) bağlı değil — ücret manuel olarak
-- (fatura/banka havalesi ile) tahsil edilir, admin onayı ödemenin alındığını
-- teyit eder. Onaylanan ve tarih aralığı içindeki talepler uygulama genelinde
-- gerçek reklam alanlarında (banner/square/native/video) gösterilir.

CREATE TABLE public.ad_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ad_type TEXT NOT NULL CHECK (ad_type IN ('banner', 'square', 'native', 'video')),
  business_name TEXT NOT NULL CHECK (char_length(business_name) BETWEEN 1 AND 120),
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 100),
  description TEXT NOT NULL CHECK (char_length(description) BETWEEN 1 AND 300),
  cta_label TEXT NOT NULL DEFAULT 'İncele' CHECK (char_length(cta_label) BETWEEN 1 AND 30),
  target_url TEXT NOT NULL,
  image_url TEXT,
  budget_try NUMERIC(10,2) NOT NULL CHECK (budget_try >= 0),
  duration_days INTEGER NOT NULL CHECK (duration_days BETWEEN 1 AND 90),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note TEXT,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ad_requests_advertiser ON public.ad_requests(advertiser_id, created_at DESC);
CREATE INDEX idx_ad_requests_active ON public.ad_requests(ad_type, status, ends_at);

GRANT SELECT, INSERT, UPDATE ON public.ad_requests TO authenticated;
GRANT ALL ON public.ad_requests TO service_role;
ALTER TABLE public.ad_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ad_requests_select_own" ON public.ad_requests FOR SELECT TO authenticated
  USING (auth.uid() = advertiser_id);
CREATE POLICY "ad_requests_select_live" ON public.ad_requests FOR SELECT TO authenticated
  USING (status = 'approved' AND now() BETWEEN starts_at AND ends_at);
CREATE POLICY "ad_requests_insert_own" ON public.ad_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = advertiser_id AND status = 'pending');
CREATE POLICY "ad_requests_update_own_pending" ON public.ad_requests FOR UPDATE TO authenticated
  USING (auth.uid() = advertiser_id AND status = 'pending')
  WITH CHECK (auth.uid() = advertiser_id AND status = 'pending');
CREATE POLICY "ad_requests_admin_all" ON public.ad_requests FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_ad_requests_updated BEFORE UPDATE ON public.ad_requests
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
