ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avg_rating numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating_count integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.profile_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rater_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profile_ratings_unique UNIQUE (rater_id, profile_id),
  CONSTRAINT profile_ratings_no_self CHECK (rater_id <> profile_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_ratings TO authenticated;
GRANT ALL ON public.profile_ratings TO service_role;

ALTER TABLE public.profile_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read profile ratings"
  ON public.profile_ratings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users insert own rating"
  ON public.profile_ratings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = rater_id AND rater_id <> profile_id);

CREATE POLICY "Users update own rating"
  ON public.profile_ratings FOR UPDATE TO authenticated
  USING (auth.uid() = rater_id) WITH CHECK (auth.uid() = rater_id);

CREATE POLICY "Users delete own rating"
  ON public.profile_ratings FOR DELETE TO authenticated
  USING (auth.uid() = rater_id);

CREATE TRIGGER profile_ratings_set_updated_at
  BEFORE UPDATE ON public.profile_ratings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.profile_rating_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE target uuid;
BEGIN
  target := COALESCE(NEW.profile_id, OLD.profile_id);
  UPDATE public.profiles p
  SET avg_rating = COALESCE(s.avg, 0), rating_count = COALESCE(s.cnt, 0)
  FROM (
    SELECT AVG(rating)::numeric(3,2) AS avg, COUNT(*) AS cnt
    FROM public.profile_ratings WHERE profile_id = target
  ) s
  WHERE p.id = target;
  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.profile_rating_sync() FROM anon, authenticated;

CREATE TRIGGER profile_ratings_sync
  AFTER INSERT OR UPDATE OR DELETE ON public.profile_ratings
  FOR EACH ROW EXECUTE FUNCTION public.profile_rating_sync();