CREATE TABLE public.forum_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  tags text[] NOT NULL DEFAULT '{}',
  author_name text NOT NULL DEFAULT 'Kullanıcı',
  author_avatar text NOT NULL DEFAULT '🙂',
  media_url text,
  media_type text CHECK (media_type IN ('image','video')),
  source text NOT NULL DEFAULT 'user',
  like_count integer NOT NULL DEFAULT 0,
  comment_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.forum_posts TO authenticated;
GRANT ALL ON public.forum_posts TO service_role;
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "forum_posts_select" ON public.forum_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "forum_posts_insert" ON public.forum_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "forum_posts_update" ON public.forum_posts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "forum_posts_delete" ON public.forum_posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.forum_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  author_name text NOT NULL DEFAULT 'Kullanıcı',
  author_avatar text NOT NULL DEFAULT '🙂',
  source text NOT NULL DEFAULT 'user',
  like_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.forum_comments TO authenticated;
GRANT ALL ON public.forum_comments TO service_role;
ALTER TABLE public.forum_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "forum_comments_select" ON public.forum_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "forum_comments_insert" ON public.forum_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "forum_comments_update" ON public.forum_comments FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "forum_comments_delete" ON public.forum_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.forum_post_likes (
  post_id uuid NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.forum_post_likes TO authenticated;
GRANT ALL ON public.forum_post_likes TO service_role;
ALTER TABLE public.forum_post_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "forum_post_likes_select" ON public.forum_post_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "forum_post_likes_insert" ON public.forum_post_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "forum_post_likes_delete" ON public.forum_post_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.forum_comment_likes (
  comment_id uuid NOT NULL REFERENCES public.forum_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.forum_comment_likes TO authenticated;
GRANT ALL ON public.forum_comment_likes TO service_role;
ALTER TABLE public.forum_comment_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "forum_comment_likes_select" ON public.forum_comment_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "forum_comment_likes_insert" ON public.forum_comment_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "forum_comment_likes_delete" ON public.forum_comment_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.user_follows (
  follower_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  followee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, followee_id),
  CHECK (follower_id <> followee_id)
);
GRANT SELECT, INSERT, DELETE ON public.user_follows TO authenticated;
GRANT ALL ON public.user_follows TO service_role;
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_follows_select" ON public.user_follows FOR SELECT TO authenticated USING (true);
CREATE POLICY "user_follows_insert" ON public.user_follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "user_follows_delete" ON public.user_follows FOR DELETE TO authenticated USING (auth.uid() = follower_id);

CREATE TRIGGER forum_posts_updated_at BEFORE UPDATE ON public.forum_posts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER forum_comments_updated_at BEFORE UPDATE ON public.forum_comments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.forum_post_like_count_sync()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.forum_posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
  ELSE
    UPDATE public.forum_posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END; $$;
CREATE TRIGGER forum_post_likes_count AFTER INSERT OR DELETE ON public.forum_post_likes FOR EACH ROW EXECUTE FUNCTION public.forum_post_like_count_sync();

CREATE OR REPLACE FUNCTION public.forum_comment_like_count_sync()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.forum_comments SET like_count = like_count + 1 WHERE id = NEW.comment_id;
  ELSE
    UPDATE public.forum_comments SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.comment_id;
  END IF;
  RETURN NULL;
END; $$;
CREATE TRIGGER forum_comment_likes_count AFTER INSERT OR DELETE ON public.forum_comment_likes FOR EACH ROW EXECUTE FUNCTION public.forum_comment_like_count_sync();

CREATE OR REPLACE FUNCTION public.forum_comment_count_sync()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.forum_posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
  ELSE
    UPDATE public.forum_posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END; $$;
CREATE TRIGGER forum_comments_count AFTER INSERT OR DELETE ON public.forum_comments FOR EACH ROW EXECUTE FUNCTION public.forum_comment_count_sync();

CREATE INDEX idx_forum_posts_created_at ON public.forum_posts (created_at DESC);
CREATE INDEX idx_forum_comments_post ON public.forum_comments (post_id, created_at);