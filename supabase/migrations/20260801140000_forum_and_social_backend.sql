-- Forum ve Sosyal Medya (Feed) için gerçek backend.
-- Daha önce istemci tarafında (zustand/localStorage) simüle edilen gönderi,
-- yorum, beğeni ve takip özellikleri artık gerçek tablolara taşınıyor.
--
-- Demo personaları (ahmet_gt, usta_mehmet, vb.) gerçek auth.users hesabı değil —
-- `mechanics` tablosundaki Google Maps/Tavily import deseniyle aynı şekilde
-- user_id NULL + source='seed' olarak saklanıyor. Gerçek kullanıcı gönderileri
-- user_id dolu ve source='user' olacak.

-- ============ forum_posts ============
CREATE TABLE public.forum_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'user' CHECK (source IN ('user', 'seed')),
  author_name TEXT NOT NULL,
  author_avatar TEXT NOT NULL DEFAULT '🙂',
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 5000),
  tags TEXT[] NOT NULL DEFAULT '{}',
  media_url TEXT,
  media_type TEXT CHECK (media_type IN ('image', 'video')),
  like_count INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (source = 'seed' OR user_id IS NOT NULL)
);
CREATE INDEX idx_forum_posts_created ON public.forum_posts(created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.forum_posts TO authenticated;
GRANT ALL ON public.forum_posts TO service_role;
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "forum_posts_select_authenticated" ON public.forum_posts FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "forum_posts_insert_own" ON public.forum_posts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "forum_posts_update_own" ON public.forum_posts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "forum_posts_delete_own" ON public.forum_posts FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "forum_posts_admin_all" ON public.forum_posts FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ forum_comments ============
CREATE TABLE public.forum_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'user' CHECK (source IN ('user', 'seed')),
  author_name TEXT NOT NULL,
  author_avatar TEXT NOT NULL DEFAULT '🙂',
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  like_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (source = 'seed' OR user_id IS NOT NULL)
);
CREATE INDEX idx_forum_comments_post_created ON public.forum_comments(post_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.forum_comments TO authenticated;
GRANT ALL ON public.forum_comments TO service_role;
ALTER TABLE public.forum_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "forum_comments_select_authenticated" ON public.forum_comments FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "forum_comments_insert_own" ON public.forum_comments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "forum_comments_delete_own" ON public.forum_comments FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "forum_comments_admin_all" ON public.forum_comments FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ forum_post_likes ============
CREATE TABLE public.forum_post_likes (
  post_id UUID NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.forum_post_likes TO authenticated;
GRANT ALL ON public.forum_post_likes TO service_role;
ALTER TABLE public.forum_post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "forum_post_likes_select_own" ON public.forum_post_likes FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "forum_post_likes_insert_own" ON public.forum_post_likes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "forum_post_likes_delete_own" ON public.forum_post_likes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ============ forum_comment_likes ============
CREATE TABLE public.forum_comment_likes (
  comment_id UUID NOT NULL REFERENCES public.forum_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.forum_comment_likes TO authenticated;
GRANT ALL ON public.forum_comment_likes TO service_role;
ALTER TABLE public.forum_comment_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "forum_comment_likes_select_own" ON public.forum_comment_likes FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "forum_comment_likes_insert_own" ON public.forum_comment_likes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "forum_comment_likes_delete_own" ON public.forum_comment_likes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ============ user_follows (Forum + Sosyal Medya ortak takip grafiği) ============
CREATE TABLE public.user_follows (
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  followee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, followee_id),
  CHECK (follower_id <> followee_id)
);
CREATE INDEX idx_user_follows_followee ON public.user_follows(followee_id);
GRANT SELECT, INSERT, DELETE ON public.user_follows TO authenticated;
GRANT ALL ON public.user_follows TO service_role;
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_follows_select_related" ON public.user_follows FOR SELECT TO authenticated
  USING (auth.uid() = follower_id OR auth.uid() = followee_id);
CREATE POLICY "user_follows_insert_own" ON public.user_follows FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "user_follows_delete_own" ON public.user_follows FOR DELETE TO authenticated
  USING (auth.uid() = follower_id);

-- ============ social_posts (Reels + Hikayeler) ============
CREATE TABLE public.social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'user' CHECK (source IN ('user', 'seed')),
  author_name TEXT NOT NULL,
  author_avatar TEXT NOT NULL DEFAULT '🙂',
  kind TEXT NOT NULL CHECK (kind IN ('reel', 'story')),
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  caption TEXT,
  tag TEXT,
  like_count INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (source = 'seed' OR user_id IS NOT NULL)
);
CREATE INDEX idx_social_posts_kind_created ON public.social_posts(kind, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_posts TO authenticated;
GRANT ALL ON public.social_posts TO service_role;
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "social_posts_select_authenticated" ON public.social_posts FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "social_posts_insert_own" ON public.social_posts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "social_posts_delete_own" ON public.social_posts FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "social_posts_admin_all" ON public.social_posts FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ social_post_likes ============
CREATE TABLE public.social_post_likes (
  post_id UUID NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.social_post_likes TO authenticated;
GRANT ALL ON public.social_post_likes TO service_role;
ALTER TABLE public.social_post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "social_post_likes_select_own" ON public.social_post_likes FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "social_post_likes_insert_own" ON public.social_post_likes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "social_post_likes_delete_own" ON public.social_post_likes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ============ Sayaç tetikleyicileri (like_count / comment_count) ============
CREATE OR REPLACE FUNCTION public.forum_post_like_count_sync()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.forum_posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSE
    UPDATE public.forum_posts SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
END;
$$;
CREATE TRIGGER trg_forum_post_likes_sync
AFTER INSERT OR DELETE ON public.forum_post_likes
FOR EACH ROW EXECUTE FUNCTION public.forum_post_like_count_sync();

CREATE OR REPLACE FUNCTION public.forum_comment_like_count_sync()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.forum_comments SET like_count = like_count + 1 WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSE
    UPDATE public.forum_comments SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
END;
$$;
CREATE TRIGGER trg_forum_comment_likes_sync
AFTER INSERT OR DELETE ON public.forum_comment_likes
FOR EACH ROW EXECUTE FUNCTION public.forum_comment_like_count_sync();

CREATE OR REPLACE FUNCTION public.forum_comment_count_sync()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.forum_posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSE
    UPDATE public.forum_posts SET comment_count = GREATEST(0, comment_count - 1) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
END;
$$;
CREATE TRIGGER trg_forum_comments_count_sync
AFTER INSERT OR DELETE ON public.forum_comments
FOR EACH ROW EXECUTE FUNCTION public.forum_comment_count_sync();

CREATE OR REPLACE FUNCTION public.social_post_like_count_sync()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.social_posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSE
    UPDATE public.social_posts SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
END;
$$;
CREATE TRIGGER trg_social_post_likes_sync
AFTER INSERT OR DELETE ON public.social_post_likes
FOR EACH ROW EXECUTE FUNCTION public.social_post_like_count_sync();

REVOKE ALL ON FUNCTION public.forum_post_like_count_sync() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.forum_comment_like_count_sync() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.forum_comment_count_sync() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.social_post_like_count_sync() FROM PUBLIC, anon, authenticated;

-- ============ Storage: kullanıcı medyası (gönderi/yorum eki, reels, hikayeler) ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-media', 'user-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "user_media_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'user-media');
CREATE POLICY "user_media_owner_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'user-media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "user_media_owner_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'user-media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ============ Demo içerik (source='seed', user_id NULL) ============
WITH p1 AS (
  INSERT INTO public.forum_posts (source, author_name, author_avatar, title, body, tags, media_url, media_type, like_count, comment_count)
  VALUES ('seed', 'ahmet_gt', '🏎️', 'Soğuk havada turbo sesi normal mi?',
    'Sabahları ilk çalıştırmada hafif bir ıslık sesi geliyor, motor ısındıktan yaklaşık 2 dakika sonra kayboluyor. Aracı 3 gündür bu şekilde kullanıyorum, performans kaybı hissetmiyorum ama sesi merak ettim. Turboyu servise götürmeden önce benzer bir şey yaşayan var mı?',
    ARRAY['Turbo', 'Motor', 'Kış'], NULL, NULL, 84, 3)
  RETURNING id
),
p2 AS (
  INSERT INTO public.forum_posts (source, author_name, author_avatar, title, body, tags, media_url, media_type, like_count, comment_count)
  VALUES ('seed', 'usta_mehmet', '🛠️', 'Turbo değişimi sonrası 60 saniyelik özet',
    'Turbo değişimini adım adım anlattım, öncesi/sonrası fark inanılmaz. Videoyu akışta bulabilirsiniz, burada sadece parça listesini paylaşıyorum.',
    ARRAY['Tamir', 'Turbo'], NULL, NULL, 512, 1)
  RETURNING id
),
p3 AS (
  INSERT INTO public.forum_posts (source, author_name, author_avatar, title, body, tags, media_url, media_type, like_count, comment_count)
  VALUES ('seed', 'garaj42', '🔧', 'E46 restorasyonu bitti! Öncesi/sonrası',
    '8 ay süren restorasyon sonunda tamamlandı. Kaporta, boya, iç döşeme ve süspansiyon yenilendi. Sorularınızı yanıtlamaktan mutluluk duyarım.',
    ARRAY['Resto', 'BMW'], NULL, NULL, 891, 0)
  RETURNING id
)
INSERT INTO public.forum_comments (post_id, source, author_name, author_avatar, content, like_count)
SELECT id, 'seed', 'usta_mehmet', '🛠️', 'Soğukta kısa süreli ıslık genelde turbo yataklarının henüz tam yağlanmamasından kaynaklanır, 2 dakikadan uzun sürüyorsa contaya baktır.', 12 FROM p1
UNION ALL
SELECT id, 'seed', 'dieselking', '⛽', 'Bende de aynısı var, 60.000 km''de sorun çıkarmadı.', 4 FROM p1
UNION ALL
SELECT id, 'seed', 'garaj42', '🔧', 'Emin olmak için basınç testi yaptırman en sağlıklısı.', 2 FROM p1
UNION ALL
SELECT id, 'seed', 'elektrikci_ali', '⚡', 'Orijinal parça mı kullandın yoksa muadil mi?', 6 FROM p2;

INSERT INTO public.social_posts (source, author_name, author_avatar, kind, media_url, media_type, caption, tag, like_count, comment_count, expires_at)
VALUES
  ('seed', '@drift_kral', '💨', 'reel', 'https://placehold.co/540x960/1a1a2e/ffffff?text=Drift', 'image', 'M3 ile gece turu — Boğaz köprüsü 🌉', 'Drift', 12400, 342, NULL),
  ('seed', '@usta_mehmet', '🛠️', 'reel', 'https://placehold.co/540x960/0f2027/ffffff?text=Tamir', 'image', 'Turbo değişimi nasıl yapılır — 60 saniyede özet 🔧', 'Tamir', 8900, 512, NULL),
  ('seed', '@garaj42', '🔧', 'reel', 'https://placehold.co/540x960/134e4a/ffffff?text=Resto', 'image', 'E46 restorasyonu bitti! Öncesi/sonrası 😍', 'Resto', 24100, 891, NULL),
  ('seed', '@elektrikci_ali', '⚡', 'reel', 'https://placehold.co/540x960/78350f/ffffff?text=EV', 'image', 'EV bakımı — 5 altın kural ⚡', 'EV', 5600, 128, NULL),
  ('seed', 'ahmet_gt', '🏎️', 'story', 'https://placehold.co/540x960/1e3a5f/ffffff?text=Hikaye', 'image', NULL, NULL, 0, 0, now() + interval '10 years'),
  ('seed', 'bmwlife', '🚗', 'story', 'https://placehold.co/540x960/312e81/ffffff?text=Hikaye', 'image', NULL, NULL, 0, 0, now() + interval '10 years'),
  ('seed', 'drift_kral', '💨', 'story', 'https://placehold.co/540x960/831843/ffffff?text=Hikaye', 'image', NULL, NULL, 0, 0, now() + interval '10 years'),
  ('seed', 'motorsporu', '🏁', 'story', 'https://placehold.co/540x960/365314/ffffff?text=Hikaye', 'image', NULL, NULL, 0, 0, now() + interval '10 years');
