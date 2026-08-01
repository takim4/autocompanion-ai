-- Profil ve işletme (usta) puanlama/değerlendirme sistemi.
-- Profiller: sadece 1-5 yıldız puan. İşletmeler (ustalar): puan + yazılı
-- geri bildirim yorumu — Google Maps yorumlarına benzer, herkese açık.

-- ============ profiles: denormalize puan alanları ============
ALTER TABLE public.profiles ADD COLUMN avg_rating NUMERIC(3,2) NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN rating_count INTEGER NOT NULL DEFAULT 0;

-- ============ profile_ratings ============
CREATE TABLE public.profile_ratings (
  rater_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (rater_id, profile_id),
  CHECK (rater_id <> profile_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_ratings TO authenticated;
GRANT ALL ON public.profile_ratings TO service_role;
ALTER TABLE public.profile_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profile_ratings_select_related" ON public.profile_ratings FOR SELECT TO authenticated
  USING (auth.uid() = rater_id OR auth.uid() = profile_id);
CREATE POLICY "profile_ratings_insert_own" ON public.profile_ratings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = rater_id);
CREATE POLICY "profile_ratings_update_own" ON public.profile_ratings FOR UPDATE TO authenticated
  USING (auth.uid() = rater_id) WITH CHECK (auth.uid() = rater_id);
CREATE POLICY "profile_ratings_delete_own" ON public.profile_ratings FOR DELETE TO authenticated
  USING (auth.uid() = rater_id);

CREATE TRIGGER trg_profile_ratings_updated BEFORE UPDATE ON public.profile_ratings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.profile_rating_sync()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  target_id UUID := COALESCE(NEW.profile_id, OLD.profile_id);
BEGIN
  UPDATE public.profiles p
  SET avg_rating = COALESCE((SELECT ROUND(AVG(rating), 2) FROM public.profile_ratings WHERE profile_id = target_id), 0),
      rating_count = (SELECT COUNT(*) FROM public.profile_ratings WHERE profile_id = target_id)
  WHERE p.id = target_id;
  RETURN COALESCE(NEW, OLD);
END;
$$;
CREATE TRIGGER trg_profile_ratings_sync
AFTER INSERT OR UPDATE OR DELETE ON public.profile_ratings
FOR EACH ROW EXECUTE FUNCTION public.profile_rating_sync();
REVOKE ALL ON FUNCTION public.profile_rating_sync() FROM PUBLIC, anon, authenticated;

-- ============ mechanic_reviews ============
CREATE TABLE public.mechanic_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mechanic_id UUID NOT NULL REFERENCES public.mechanics(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_avatar TEXT,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT CHECK (comment IS NULL OR char_length(comment) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (mechanic_id, user_id)
);
CREATE INDEX idx_mechanic_reviews_mechanic ON public.mechanic_reviews(mechanic_id, created_at DESC);
GRANT SELECT ON public.mechanic_reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mechanic_reviews TO authenticated;
GRANT ALL ON public.mechanic_reviews TO service_role;
ALTER TABLE public.mechanic_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mechanic_reviews_select_all" ON public.mechanic_reviews FOR SELECT
  USING (true);
CREATE POLICY "mechanic_reviews_insert_own" ON public.mechanic_reviews FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "mechanic_reviews_update_own" ON public.mechanic_reviews FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "mechanic_reviews_delete_own" ON public.mechanic_reviews FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "mechanic_reviews_admin_all" ON public.mechanic_reviews FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_mechanic_reviews_updated BEFORE UPDATE ON public.mechanic_reviews
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.mechanic_rating_sync()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  target_id UUID := COALESCE(NEW.mechanic_id, OLD.mechanic_id);
BEGIN
  UPDATE public.mechanics m
  SET avg_rating = COALESCE((SELECT ROUND(AVG(rating), 2) FROM public.mechanic_reviews WHERE mechanic_id = target_id), 0),
      rating_count = (SELECT COUNT(*) FROM public.mechanic_reviews WHERE mechanic_id = target_id)
  WHERE m.id = target_id;
  RETURN COALESCE(NEW, OLD);
END;
$$;
CREATE TRIGGER trg_mechanic_reviews_sync
AFTER INSERT OR UPDATE OR DELETE ON public.mechanic_reviews
FOR EACH ROW EXECUTE FUNCTION public.mechanic_rating_sync();
REVOKE ALL ON FUNCTION public.mechanic_rating_sync() FROM PUBLIC, anon, authenticated;
