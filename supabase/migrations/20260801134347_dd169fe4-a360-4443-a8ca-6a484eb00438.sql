CREATE TABLE public.social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('reel','story')),
  media_url text NOT NULL,
  media_type text NOT NULL CHECK (media_type IN ('image','video')),
  caption text,
  tag text,
  author_name text NOT NULL DEFAULT 'Kullanıcı',
  author_avatar text NOT NULL DEFAULT '🙂',
  source text NOT NULL DEFAULT 'user',
  like_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_posts TO authenticated;
GRANT ALL ON public.social_posts TO service_role;

ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "social_posts_select" ON public.social_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "social_posts_insert_own" ON public.social_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "social_posts_update_own" ON public.social_posts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "social_posts_delete_own" ON public.social_posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.social_post_likes (
  post_id uuid NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

GRANT SELECT, INSERT, DELETE ON public.social_post_likes TO authenticated;
GRANT ALL ON public.social_post_likes TO service_role;

ALTER TABLE public.social_post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "social_post_likes_select" ON public.social_post_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "social_post_likes_insert_own" ON public.social_post_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "social_post_likes_delete_own" ON public.social_post_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_social_posts_kind_created ON public.social_posts (kind, created_at DESC);
CREATE INDEX idx_social_post_likes_user ON public.social_post_likes (user_id);

CREATE OR REPLACE FUNCTION public.social_post_like_count_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.social_posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
  ELSE
    UPDATE public.social_posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END; $$;

REVOKE EXECUTE ON FUNCTION public.social_post_like_count_sync() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_social_post_like_count
AFTER INSERT OR DELETE ON public.social_post_likes
FOR EACH ROW EXECUTE FUNCTION public.social_post_like_count_sync();

CREATE TRIGGER trg_social_posts_updated_at
BEFORE UPDATE ON public.social_posts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();