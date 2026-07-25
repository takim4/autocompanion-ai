
-- ============================================================
-- Şikayet sistemi.
-- Genel (topluluk dışı) içerik şikayetleri sadece uygulama adminlerine gider.
-- Topluluk içi şikayetler sadece o topluluğun kurucu/co-admin'lerine gider;
-- onlar gerekli görürse `escalated = true` yaparak uygulama adminlerine iletir.
-- ============================================================

CREATE TYPE public.report_target AS ENUM (
  'post', 'forum_thread', 'forum_reply', 'comment', 'community', 'community_message', 'mechanic', 'user'
);
CREATE TYPE public.report_reason AS ENUM (
  'spam', 'harassment', 'hate_speech', 'nudity', 'misinformation', 'scam', 'illegal', 'other'
);
CREATE TYPE public.report_status AS ENUM ('open', 'reviewing', 'resolved', 'dismissed');

CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type public.report_target NOT NULL,
  target_id UUID NOT NULL,
  community_id UUID REFERENCES public.communities(id) ON DELETE CASCADE,
  reason public.report_reason NOT NULL,
  details TEXT CHECK (char_length(coalesce(details, '')) <= 1000),
  status public.report_status NOT NULL DEFAULT 'open',
  escalated BOOLEAN NOT NULL DEFAULT false,
  handled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_note TEXT CHECK (char_length(coalesce(resolution_note, '')) <= 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reports_target ON public.reports(target_type, target_id);
CREATE INDEX idx_reports_community ON public.reports(community_id, status);
CREATE INDEX idx_reports_status ON public.reports(status);

GRANT SELECT, INSERT, UPDATE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_reports_updated BEFORE UPDATE ON public.reports
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "reports_insert_own" ON public.reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "reports_select_own" ON public.reports FOR SELECT USING (auth.uid() = reporter_id);

-- Uygulama adminleri: sadece topluluk-dışı (genel) şikayetleri VEYA eskale edilmiş
-- topluluk şikayetlerini görebilir/yönetebilir.
CREATE POLICY "reports_select_app_admin" ON public.reports FOR SELECT
  USING (public.has_role(auth.uid(), 'admin') AND (community_id IS NULL OR escalated = true));
CREATE POLICY "reports_update_app_admin" ON public.reports FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin') AND (community_id IS NULL OR escalated = true))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Topluluk kurucu/co-admin'leri: sadece kendi topluluklarının şikayetlerini görür/yönetir.
CREATE POLICY "reports_select_community_admin" ON public.reports FOR SELECT
  USING (
    community_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.community_members cm
      WHERE cm.community_id = reports.community_id
        AND cm.user_id = auth.uid() AND cm.status = 'active' AND cm.role IN ('founder', 'co_admin')
    )
  );
CREATE POLICY "reports_update_community_admin" ON public.reports FOR UPDATE
  USING (
    community_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.community_members cm
      WHERE cm.community_id = reports.community_id
        AND cm.user_id = auth.uid() AND cm.status = 'active' AND cm.role IN ('founder', 'co_admin')
    )
  )
  WITH CHECK (
    community_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.community_members cm
      WHERE cm.community_id = reports.community_id
        AND cm.user_id = auth.uid() AND cm.status = 'active' AND cm.role IN ('founder', 'co_admin')
    )
  );
