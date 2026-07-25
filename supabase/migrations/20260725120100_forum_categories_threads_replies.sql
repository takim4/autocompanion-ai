
-- ============================================================
-- Gerçek forum: kategoriler, konular (threads), yanıtlar (replies).
-- forum_threads.community_id şimdilik FK'siz — topluluklar migration'ında
-- FK ve topluluk-özel RLS politikaları eklenecek.
-- ============================================================

CREATE TABLE public.forum_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL DEFAULT 'MessagesSquare',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.forum_categories TO anon, authenticated;
GRANT ALL ON public.forum_categories TO service_role;
ALTER TABLE public.forum_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "forum_categories_select_all" ON public.forum_categories FOR SELECT USING (true);
CREATE POLICY "forum_categories_admin_all" ON public.forum_categories FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.forum_categories (slug, name, description, icon, sort_order) VALUES
  ('genel', 'Genel', 'Otomobil dünyasından her şey', 'MessagesSquare', 0),
  ('motor-mekanik', 'Motor & Mekanik', 'Motor arızaları, bakım, onarım', 'Wrench', 1),
  ('elektrik-elektronik', 'Elektrik & Elektronik', 'Arıza kodları, sensörler, ECU', 'Zap', 2),
  ('kaporta-boya', 'Kaporta & Boya', 'Kaza sonrası, boya, kaporta işleri', 'PaintBucket', 3),
  ('lastik-suspansiyon', 'Lastik & Süspansiyon', 'Lastik, rot balans, amortisör', 'CircleDot', 4),
  ('elektrikli-hibrit', 'Elektrikli & Hibrit', 'EV / Hibrit bakım, şarj, batarya', 'BatteryCharging', 5),
  ('modifiye-tuning', 'Modifiye & Tuning', 'Performans, görsel modifiye', 'Gauge', 6),
  ('alim-satim', 'Alım & Satım', 'İkinci el tecrübeleri, fiyat sorgusu', 'Tag', 7),
  ('sigorta-hukuk', 'Sigorta & Hukuk', 'Kasko, trafik sigortası, mevzuat', 'Shield', 8);

CREATE TABLE public.forum_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.forum_categories(id) ON DELETE SET NULL,
  community_id UUID,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 3 AND 200),
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 8000),
  vehicle_brand TEXT,
  vehicle_model TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'solved')),
  pinned BOOLEAN NOT NULL DEFAULT false,
  view_count INTEGER NOT NULL DEFAULT 0,
  like_count INTEGER NOT NULL DEFAULT 0,
  save_count INTEGER NOT NULL DEFAULT 0,
  reply_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_forum_threads_category ON public.forum_threads(category_id, created_at DESC);
CREATE INDEX idx_forum_threads_community ON public.forum_threads(community_id, created_at DESC);
CREATE INDEX idx_forum_threads_user ON public.forum_threads(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.forum_threads TO authenticated;
GRANT SELECT ON public.forum_threads TO anon;
GRANT ALL ON public.forum_threads TO service_role;
ALTER TABLE public.forum_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "forum_threads_select_public" ON public.forum_threads FOR SELECT USING (community_id IS NULL);
CREATE POLICY "forum_threads_insert_own" ON public.forum_threads FOR INSERT
  WITH CHECK (auth.uid() = user_id AND community_id IS NULL);
CREATE POLICY "forum_threads_update_own" ON public.forum_threads FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "forum_threads_delete_own" ON public.forum_threads FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "forum_threads_admin_all" ON public.forum_threads FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_forum_threads_updated BEFORE UPDATE ON public.forum_threads
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.increment_thread_view(_thread_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.forum_threads SET view_count = view_count + 1 WHERE id = _thread_id;
$$;
GRANT EXECUTE ON FUNCTION public.increment_thread_view(UUID) TO authenticated, anon;

CREATE TABLE public.forum_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.forum_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_reply_id UUID REFERENCES public.forum_replies(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
  is_solution BOOLEAN NOT NULL DEFAULT false,
  like_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_forum_replies_thread ON public.forum_replies(thread_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.forum_replies TO authenticated;
GRANT SELECT ON public.forum_replies TO anon;
GRANT ALL ON public.forum_replies TO service_role;
ALTER TABLE public.forum_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "forum_replies_select_public" ON public.forum_replies FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.forum_threads t WHERE t.id = thread_id AND t.community_id IS NULL));
CREATE POLICY "forum_replies_insert_own" ON public.forum_replies FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.forum_threads t WHERE t.id = thread_id AND t.community_id IS NULL)
  );
CREATE POLICY "forum_replies_update_own" ON public.forum_replies FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "forum_replies_delete_own" ON public.forum_replies FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "forum_replies_admin_all" ON public.forum_replies FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_forum_replies_updated BEFORE UPDATE ON public.forum_replies
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.bump_thread_reply_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.forum_threads SET reply_count = reply_count + 1, updated_at = now() WHERE id = NEW.thread_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.forum_threads SET reply_count = GREATEST(reply_count - 1, 0) WHERE id = OLD.thread_id;
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER trg_forum_replies_count AFTER INSERT OR DELETE ON public.forum_replies
FOR EACH ROW EXECUTE FUNCTION public.bump_thread_reply_count();

-- Sadece konu sahibi (veya admin) bir yanıtı "çözüm" olarak işaretleyebilir.
CREATE OR REPLACE FUNCTION public.mark_reply_solution(_reply_id UUID, _solved BOOLEAN)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _thread_id UUID;
  _owner UUID;
BEGIN
  SELECT thread_id INTO _thread_id FROM public.forum_replies WHERE id = _reply_id;
  IF _thread_id IS NULL THEN
    RAISE EXCEPTION 'Yanıt bulunamadı';
  END IF;
  SELECT user_id INTO _owner FROM public.forum_threads WHERE id = _thread_id;
  IF _owner IS DISTINCT FROM auth.uid() AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Sadece konu sahibi çözümü işaretleyebilir';
  END IF;

  IF _solved THEN
    UPDATE public.forum_replies SET is_solution = false WHERE thread_id = _thread_id AND is_solution = true;
    UPDATE public.forum_replies SET is_solution = true WHERE id = _reply_id;
    UPDATE public.forum_threads SET status = 'solved' WHERE id = _thread_id;
  ELSE
    UPDATE public.forum_replies SET is_solution = false WHERE id = _reply_id;
    UPDATE public.forum_threads SET status = 'open' WHERE id = _thread_id
      AND NOT EXISTS (SELECT 1 FROM public.forum_replies WHERE thread_id = _thread_id AND is_solution = true);
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.mark_reply_solution(UUID, BOOLEAN) TO authenticated;
