
-- ============================================================
-- Hizmetler bölümü: uygulama içi kullanıcı yorumları/puanları +
-- Google puanı alanları. Google Places API anahtarı bu ortamda
-- tanımlı değil; google_rating/google_rating_count usta tarafından
-- (veya ileride bir senkron job'ıyla) elle girilir.
-- ============================================================

ALTER TABLE public.mechanics
  ADD COLUMN google_rating NUMERIC(2, 1) CHECK (google_rating IS NULL OR (google_rating BETWEEN 0 AND 5)),
  ADD COLUMN google_rating_count INTEGER CHECK (google_rating_count IS NULL OR google_rating_count >= 0),
  ADD COLUMN google_place_id TEXT,
  ADD COLUMN google_maps_url TEXT;

CREATE TABLE public.mechanic_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mechanic_id UUID NOT NULL REFERENCES public.mechanics(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT CHECK (char_length(coalesce(comment, '')) <= 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (mechanic_id, user_id)
);
CREATE INDEX idx_mechanic_reviews_mechanic ON public.mechanic_reviews(mechanic_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mechanic_reviews TO authenticated;
GRANT SELECT ON public.mechanic_reviews TO anon;
GRANT ALL ON public.mechanic_reviews TO service_role;
ALTER TABLE public.mechanic_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mechanic_reviews_select_all" ON public.mechanic_reviews FOR SELECT USING (true);
CREATE POLICY "mechanic_reviews_insert_own" ON public.mechanic_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "mechanic_reviews_update_own" ON public.mechanic_reviews FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "mechanic_reviews_delete_own" ON public.mechanic_reviews FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "mechanic_reviews_admin_all" ON public.mechanic_reviews FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_mechanic_reviews_updated BEFORE UPDATE ON public.mechanic_reviews
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.recompute_mechanic_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _mechanic_id UUID;
BEGIN
  _mechanic_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.mechanic_id ELSE NEW.mechanic_id END;
  UPDATE public.mechanics m
  SET avg_rating = COALESCE(
        (SELECT ROUND(AVG(rating)::numeric, 2) FROM public.mechanic_reviews WHERE mechanic_id = _mechanic_id), 0
      ),
      rating_count = (SELECT COUNT(*) FROM public.mechanic_reviews WHERE mechanic_id = _mechanic_id)
  WHERE m.id = _mechanic_id;
  RETURN NULL;
END;
$$;
CREATE TRIGGER trg_mechanic_reviews_recompute AFTER INSERT OR UPDATE OR DELETE ON public.mechanic_reviews
FOR EACH ROW EXECUTE FUNCTION public.recompute_mechanic_rating();
