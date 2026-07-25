
-- ============================================================
-- Sosyal katman: takip sistemi, gönderiler (metin/foto/video/canlı)
-- ve forum+sosyal medya ortak beğeni/kaydetme/yorum sistemi.
-- ============================================================

-- ============ follows ============
CREATE TABLE public.follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (follower_id, following_id),
  CHECK (follower_id <> following_id)
);
CREATE INDEX idx_follows_follower ON public.follows(follower_id);
CREATE INDEX idx_follows_following ON public.follows(following_id);
GRANT SELECT, INSERT, DELETE ON public.follows TO authenticated;
GRANT SELECT ON public.follows TO anon;
GRANT ALL ON public.follows TO service_role;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "follows_select_all" ON public.follows FOR SELECT USING (true);
CREATE POLICY "follows_insert_own" ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "follows_delete_own" ON public.follows FOR DELETE USING (auth.uid() = follower_id);

-- Denormalized follower/following counters on profiles
ALTER TABLE public.profiles ADD COLUMN follower_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN following_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN post_count INTEGER NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.bump_follow_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
    UPDATE public.profiles SET follower_count = follower_count + 1 WHERE id = NEW.following_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles SET following_count = GREATEST(following_count - 1, 0) WHERE id = OLD.follower_id;
    UPDATE public.profiles SET follower_count = GREATEST(follower_count - 1, 0) WHERE id = OLD.following_id;
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER trg_follow_counts AFTER INSERT OR DELETE ON public.follows
FOR EACH ROW EXECUTE FUNCTION public.bump_follow_counts();

-- ============ posts ============
CREATE TYPE public.post_type AS ENUM ('text', 'image', 'video', 'live');

CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type public.post_type NOT NULL DEFAULT 'text',
  caption TEXT CHECK (char_length(coalesce(caption, '')) <= 2200),
  media_urls TEXT[] NOT NULL DEFAULT '{}',
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  tag TEXT CHECK (char_length(coalesce(tag, '')) <= 40),
  live_title TEXT CHECK (char_length(coalesce(live_title, '')) <= 140),
  live_started_at TIMESTAMPTZ,
  live_ended_at TIMESTAMPTZ,
  like_count INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  save_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_posts_created ON public.posts(created_at DESC);
CREATE INDEX idx_posts_user ON public.posts(user_id, created_at DESC);
CREATE INDEX idx_posts_type ON public.posts(type);
CREATE INDEX idx_posts_live_active ON public.posts(live_started_at DESC) WHERE type = 'live' AND live_ended_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT SELECT ON public.posts TO anon;
GRANT ALL ON public.posts TO service_role;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "posts_select_all" ON public.posts FOR SELECT USING (true);
CREATE POLICY "posts_insert_own" ON public.posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "posts_update_own" ON public.posts FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "posts_delete_own" ON public.posts FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "posts_admin_all" ON public.posts FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_posts_updated BEFORE UPDATE ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.bump_post_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles SET post_count = post_count + 1 WHERE id = NEW.user_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles SET post_count = GREATEST(post_count - 1, 0) WHERE id = OLD.user_id;
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER trg_posts_count AFTER INSERT OR DELETE ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.bump_post_count();

-- ============ likes / saves / comments (forum + sosyal ortak) ============
CREATE TYPE public.engagement_target AS ENUM ('post', 'forum_thread', 'forum_reply', 'comment');

CREATE TABLE public.likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type public.engagement_target NOT NULL,
  target_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, target_type, target_id)
);
CREATE INDEX idx_likes_target ON public.likes(target_type, target_id);
CREATE INDEX idx_likes_user ON public.likes(user_id);
GRANT SELECT, INSERT, DELETE ON public.likes TO authenticated;
GRANT SELECT ON public.likes TO anon;
GRANT ALL ON public.likes TO service_role;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "likes_select_all" ON public.likes FOR SELECT USING (true);
CREATE POLICY "likes_insert_own" ON public.likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "likes_delete_own" ON public.likes FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.saves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type public.engagement_target NOT NULL,
  target_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, target_type, target_id)
);
CREATE INDEX idx_saves_user ON public.saves(user_id, created_at DESC);
GRANT SELECT, INSERT, DELETE ON public.saves TO authenticated;
GRANT ALL ON public.saves TO service_role;
ALTER TABLE public.saves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saves_select_own" ON public.saves FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "saves_insert_own" ON public.saves FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "saves_delete_own" ON public.saves FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type public.engagement_target NOT NULL,
  target_id UUID NOT NULL,
  parent_comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  like_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_comments_target ON public.comments(target_type, target_id, created_at);
CREATE INDEX idx_comments_user ON public.comments(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO authenticated;
GRANT SELECT ON public.comments TO anon;
GRANT ALL ON public.comments TO service_role;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comments_select_all" ON public.comments FOR SELECT USING (true);
CREATE POLICY "comments_insert_own" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comments_update_own" ON public.comments FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comments_delete_own" ON public.comments FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "comments_admin_all" ON public.comments FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_comments_updated BEFORE UPDATE ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Generic counters. Uses dynamic SQL against a fixed whitelist of target tables so this
-- migration doesn't need to know about forum_threads/forum_replies (added in a later migration).
CREATE OR REPLACE FUNCTION public.bump_like_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tt public.engagement_target;
  tid UUID;
  tbl TEXT;
  delta INT;
BEGIN
  tt := CASE WHEN TG_OP = 'DELETE' THEN OLD.target_type ELSE NEW.target_type END;
  tid := CASE WHEN TG_OP = 'DELETE' THEN OLD.target_id ELSE NEW.target_id END;
  tbl := CASE tt
    WHEN 'post' THEN 'posts'
    WHEN 'forum_thread' THEN 'forum_threads'
    WHEN 'forum_reply' THEN 'forum_replies'
    WHEN 'comment' THEN 'comments'
  END;
  delta := CASE WHEN TG_OP = 'INSERT' THEN 1 ELSE -1 END;
  IF tbl IS NOT NULL AND to_regclass('public.' || tbl) IS NOT NULL THEN
    EXECUTE format('UPDATE public.%I SET like_count = GREATEST(like_count + %s, 0) WHERE id = $1', tbl, delta) USING tid;
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER trg_likes_count AFTER INSERT OR DELETE ON public.likes
FOR EACH ROW EXECUTE FUNCTION public.bump_like_count();

CREATE OR REPLACE FUNCTION public.bump_save_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tt public.engagement_target;
  tid UUID;
  tbl TEXT;
  delta INT;
BEGIN
  tt := CASE WHEN TG_OP = 'DELETE' THEN OLD.target_type ELSE NEW.target_type END;
  tid := CASE WHEN TG_OP = 'DELETE' THEN OLD.target_id ELSE NEW.target_id END;
  tbl := CASE tt WHEN 'post' THEN 'posts' WHEN 'forum_thread' THEN 'forum_threads' ELSE NULL END;
  delta := CASE WHEN TG_OP = 'INSERT' THEN 1 ELSE -1 END;
  IF tbl IS NOT NULL AND to_regclass('public.' || tbl) IS NOT NULL THEN
    EXECUTE format('UPDATE public.%I SET save_count = GREATEST(save_count + %s, 0) WHERE id = $1', tbl, delta) USING tid;
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER trg_saves_count AFTER INSERT OR DELETE ON public.saves
FOR EACH ROW EXECUTE FUNCTION public.bump_save_count();

CREATE OR REPLACE FUNCTION public.bump_comment_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tt public.engagement_target;
  tid UUID;
  tbl TEXT;
  delta INT;
BEGIN
  tt := CASE WHEN TG_OP = 'DELETE' THEN OLD.target_type ELSE NEW.target_type END;
  tid := CASE WHEN TG_OP = 'DELETE' THEN OLD.target_id ELSE NEW.target_id END;
  tbl := CASE tt WHEN 'post' THEN 'posts' WHEN 'forum_thread' THEN 'forum_threads' ELSE NULL END;
  delta := CASE WHEN TG_OP = 'INSERT' THEN 1 ELSE -1 END;
  IF tbl IS NOT NULL AND to_regclass('public.' || tbl) IS NOT NULL THEN
    EXECUTE format('UPDATE public.%I SET comment_count = GREATEST(comment_count + %s, 0) WHERE id = $1', tbl, delta) USING tid;
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER trg_comments_count AFTER INSERT OR DELETE ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.bump_comment_count();

-- ============ Storage: profil fotoğrafı, gönderi medyası, topluluk görselleri ============
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('posts', 'posts', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('communities', 'communities', true) ON CONFLICT (id) DO NOTHING;

-- Upload path convention: `${auth.uid()}/...` — first folder segment must be the uploader's own id.
CREATE POLICY "avatars_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "avatars_owner_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars_owner_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars_owner_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "posts_media_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'posts');
CREATE POLICY "posts_media_owner_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'posts' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "posts_media_owner_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'posts' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'posts' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "posts_media_owner_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'posts' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "communities_media_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'communities');
CREATE POLICY "communities_media_owner_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'communities' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "communities_media_owner_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'communities' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'communities' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "communities_media_owner_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'communities' AND (storage.foldername(name))[1] = auth.uid()::text);
