CREATE TABLE public.mechanic_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mechanic_id uuid NOT NULL REFERENCES public.mechanics(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  author_name text NOT NULL DEFAULT 'Kullanıcı',
  author_avatar text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (mechanic_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mechanic_reviews TO authenticated;
GRANT SELECT ON public.mechanic_reviews TO anon;
GRANT ALL ON public.mechanic_reviews TO service_role;

ALTER TABLE public.mechanic_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mechanic_reviews_select_all" ON public.mechanic_reviews FOR SELECT USING (true);
CREATE POLICY "mechanic_reviews_insert_own" ON public.mechanic_reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "mechanic_reviews_update_own" ON public.mechanic_reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "mechanic_reviews_delete_own" ON public.mechanic_reviews FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_mechanic_reviews_mechanic ON public.mechanic_reviews (mechanic_id, created_at DESC);

CREATE TRIGGER mechanic_reviews_set_updated_at
BEFORE UPDATE ON public.mechanic_reviews
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.mechanic_rating_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mid uuid := COALESCE(NEW.mechanic_id, OLD.mechanic_id);
BEGIN
  UPDATE public.mechanics m
  SET avg_rating = COALESCE(s.avg_r, 0),
      rating_count = COALESCE(s.cnt, 0)
  FROM (
    SELECT AVG(rating)::numeric(3,2) AS avg_r, COUNT(*) AS cnt
    FROM public.mechanic_reviews WHERE mechanic_id = mid
  ) s
  WHERE m.id = mid;
  RETURN NULL;
END; $$;

REVOKE EXECUTE ON FUNCTION public.mechanic_rating_sync() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER mechanic_reviews_rating_sync
AFTER INSERT OR UPDATE OR DELETE ON public.mechanic_reviews
FOR EACH ROW EXECUTE FUNCTION public.mechanic_rating_sync();