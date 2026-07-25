
-- ============================================================
-- Özelleştirilebilir (ücretli olabilen) araç toplulukları:
-- kurucu / co-admin / üye rolleri, kabul sistemi, sohbet ve
-- topluluğa özel forum konuları.
-- ============================================================

CREATE TABLE public.communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 80),
  description TEXT CHECK (char_length(coalesce(description, '')) <= 1000),
  avatar_url TEXT,
  cover_url TEXT,
  brand TEXT,
  model TEXT,
  founder_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  price_amount NUMERIC(10, 2),
  price_currency TEXT NOT NULL DEFAULT 'TRY',
  member_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (NOT is_paid OR price_amount IS NOT NULL)
);
CREATE INDEX idx_communities_brand_model ON public.communities(brand, model);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.communities TO authenticated;
GRANT SELECT ON public.communities TO anon;
GRANT ALL ON public.communities TO service_role;
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "communities_select_all" ON public.communities FOR SELECT USING (true);
CREATE POLICY "communities_insert_own" ON public.communities FOR INSERT WITH CHECK (auth.uid() = founder_id);
CREATE POLICY "communities_update_founder" ON public.communities FOR UPDATE
  USING (auth.uid() = founder_id) WITH CHECK (auth.uid() = founder_id);
CREATE POLICY "communities_delete_founder" ON public.communities FOR DELETE USING (auth.uid() = founder_id);
CREATE POLICY "communities_admin_all" ON public.communities FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_communities_updated BEFORE UPDATE ON public.communities
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ community_members ============
CREATE TABLE public.community_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('founder', 'co_admin', 'member')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'rejected', 'banned')),
  payment_status TEXT NOT NULL DEFAULT 'not_required' CHECK (payment_status IN ('not_required', 'pending', 'paid')),
  join_message TEXT CHECK (char_length(coalesce(join_message, '')) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  UNIQUE (community_id, user_id)
);
CREATE INDEX idx_community_members_community ON public.community_members(community_id, status);
CREATE INDEX idx_community_members_user ON public.community_members(user_id);
-- Not: UPDATE bilinçli olarak `authenticated` rolüne GRANT edilmiyor. Onay/rol/çıkarma
-- işlemleri sadece aşağıdaki SECURITY DEFINER fonksiyonları üzerinden yapılabilir.
GRANT SELECT, INSERT, DELETE ON public.community_members TO authenticated;
GRANT ALL ON public.community_members TO service_role;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "community_members_insert_own" ON public.community_members FOR INSERT
  WITH CHECK (auth.uid() = user_id AND status = 'pending' AND role = 'member');
CREATE POLICY "community_members_delete_own" ON public.community_members FOR DELETE
  USING (auth.uid() = user_id);
CREATE POLICY "community_members_admin_all" ON public.community_members FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Bir kullanıcının bir topluluğa tam erişimi olup olmadığını hesaplar
-- (aktif üye + ücretli topluluklarda ödeme onaylanmış olmalı).
-- RLS politikaları içinden çağrılır; SECURITY DEFINER olduğu için özyineli RLS sorunu yaratmaz.
CREATE OR REPLACE FUNCTION public.is_active_community_member(_community_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.community_members cm
    JOIN public.communities c ON c.id = cm.community_id
    WHERE cm.community_id = _community_id
      AND cm.user_id = _user_id
      AND cm.status = 'active'
      AND (NOT c.is_paid OR cm.payment_status = 'paid')
  );
$$;

CREATE POLICY "community_members_select" ON public.community_members FOR SELECT
  USING (
    auth.uid() = user_id
    OR (status = 'active' AND public.is_active_community_member(community_id, auth.uid()))
    OR EXISTS (
      SELECT 1 FROM public.community_members admin_row
      WHERE admin_row.community_id = community_members.community_id
        AND admin_row.user_id = auth.uid()
        AND admin_row.status = 'active'
        AND admin_row.role IN ('founder', 'co_admin')
    )
  );

-- Topluluk oluşturulunca kurucu otomatik olarak aktif üye + 'founder' rolüyle eklenir.
CREATE OR REPLACE FUNCTION public.create_community_founder_membership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.community_members (community_id, user_id, role, status, payment_status, responded_at)
  VALUES (NEW.id, NEW.founder_id, 'founder', 'active', 'not_required', now());
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_community_founder AFTER INSERT ON public.communities
FOR EACH ROW EXECUTE FUNCTION public.create_community_founder_membership();

CREATE OR REPLACE FUNCTION public.bump_community_member_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'active' THEN
      UPDATE public.communities SET member_count = member_count + 1 WHERE id = NEW.community_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status <> 'active' AND NEW.status = 'active' THEN
      UPDATE public.communities SET member_count = member_count + 1 WHERE id = NEW.community_id;
    ELSIF OLD.status = 'active' AND NEW.status <> 'active' THEN
      UPDATE public.communities SET member_count = GREATEST(member_count - 1, 0) WHERE id = NEW.community_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.status = 'active' THEN
      UPDATE public.communities SET member_count = GREATEST(member_count - 1, 0) WHERE id = OLD.community_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER trg_community_member_count AFTER INSERT OR UPDATE OR DELETE ON public.community_members
FOR EACH ROW EXECUTE FUNCTION public.bump_community_member_count();

-- ============ Üyelik yönetimi RPC'leri ============
CREATE OR REPLACE FUNCTION public.request_join_community(_community_id UUID, _message TEXT DEFAULT NULL)
RETURNS public.community_members
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.community_members;
  _is_paid BOOLEAN;
  _existing public.community_members;
BEGIN
  SELECT is_paid INTO _is_paid FROM public.communities WHERE id = _community_id AND status = 'active';
  IF _is_paid IS NULL THEN
    RAISE EXCEPTION 'Topluluk bulunamadı';
  END IF;

  SELECT * INTO _existing FROM public.community_members
    WHERE community_id = _community_id AND user_id = auth.uid();

  IF _existing.id IS NOT NULL THEN
    IF _existing.status IN ('pending', 'active') THEN
      RETURN _existing;
    END IF;
    IF _existing.status = 'banned' THEN
      RAISE EXCEPTION 'Bu topluluktan uzaklaştırıldınız';
    END IF;
    UPDATE public.community_members
    SET status = 'pending', join_message = _message, responded_at = NULL,
        payment_status = CASE WHEN _is_paid THEN 'pending' ELSE 'not_required' END
    WHERE id = _existing.id
    RETURNING * INTO _row;
    RETURN _row;
  END IF;

  INSERT INTO public.community_members (community_id, user_id, role, status, payment_status, join_message)
  VALUES (
    _community_id, auth.uid(), 'member', 'pending',
    CASE WHEN _is_paid THEN 'pending' ELSE 'not_required' END, _message
  )
  RETURNING * INTO _row;
  RETURN _row;
END;
$$;
GRANT EXECUTE ON FUNCTION public.request_join_community(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.respond_join_request(_member_id UUID, _approve BOOLEAN)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _community_id UUID;
  _actor_role TEXT;
BEGIN
  SELECT community_id INTO _community_id FROM public.community_members WHERE id = _member_id;
  IF _community_id IS NULL THEN
    RAISE EXCEPTION 'Başvuru bulunamadı';
  END IF;

  SELECT role INTO _actor_role FROM public.community_members
    WHERE community_id = _community_id AND user_id = auth.uid() AND status = 'active';
  IF _actor_role NOT IN ('founder', 'co_admin') AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Yetkiniz yok';
  END IF;

  IF _approve THEN
    UPDATE public.community_members SET status = 'active', responded_at = now()
    WHERE id = _member_id AND status = 'pending';
  ELSE
    UPDATE public.community_members SET status = 'rejected', responded_at = now()
    WHERE id = _member_id AND status = 'pending';
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.respond_join_request(UUID, BOOLEAN) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_community_member_role(_member_id UUID, _role TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _community_id UUID;
  _target_role TEXT;
  _actor_role TEXT;
BEGIN
  IF _role NOT IN ('co_admin', 'member') THEN
    RAISE EXCEPTION 'Geçersiz rol';
  END IF;
  SELECT community_id, role INTO _community_id, _target_role FROM public.community_members WHERE id = _member_id;
  IF _community_id IS NULL THEN
    RAISE EXCEPTION 'Üye bulunamadı';
  END IF;
  IF _target_role = 'founder' THEN
    RAISE EXCEPTION 'Kurucunun rolü değiştirilemez';
  END IF;

  SELECT role INTO _actor_role FROM public.community_members
    WHERE community_id = _community_id AND user_id = auth.uid() AND status = 'active';
  IF _actor_role <> 'founder' AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Sadece kurucu yetkilendirme yapabilir';
  END IF;

  UPDATE public.community_members SET role = _role WHERE id = _member_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.set_community_member_role(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.remove_community_member(_member_id UUID, _ban BOOLEAN DEFAULT false)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _community_id UUID;
  _target_role TEXT;
  _actor_role TEXT;
BEGIN
  SELECT community_id, role INTO _community_id, _target_role FROM public.community_members WHERE id = _member_id;
  IF _community_id IS NULL THEN
    RAISE EXCEPTION 'Üye bulunamadı';
  END IF;
  IF _target_role = 'founder' THEN
    RAISE EXCEPTION 'Kurucu çıkarılamaz';
  END IF;

  SELECT role INTO _actor_role FROM public.community_members
    WHERE community_id = _community_id AND user_id = auth.uid() AND status = 'active';
  IF _actor_role NOT IN ('founder', 'co_admin') AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Yetkiniz yok';
  END IF;
  IF _actor_role = 'co_admin' AND _target_role = 'co_admin' THEN
    RAISE EXCEPTION 'Co-admin başka bir co-admini çıkaramaz';
  END IF;

  IF _ban THEN
    UPDATE public.community_members SET status = 'banned' WHERE id = _member_id;
  ELSE
    DELETE FROM public.community_members WHERE id = _member_id;
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.remove_community_member(UUID, BOOLEAN) TO authenticated;

-- Ödeme altyapısı (iyzico/Stripe vb.) bu ortamda tanımlı değil: kurucu/co-admin,
-- topluluk dışı bir kanaldan (havale, elden vb.) alınan ödemeyi burada elle onaylar.
CREATE OR REPLACE FUNCTION public.mark_member_paid(_member_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _community_id UUID;
  _actor_role TEXT;
BEGIN
  SELECT community_id INTO _community_id FROM public.community_members WHERE id = _member_id;
  IF _community_id IS NULL THEN
    RAISE EXCEPTION 'Üye bulunamadı';
  END IF;
  SELECT role INTO _actor_role FROM public.community_members
    WHERE community_id = _community_id AND user_id = auth.uid() AND status = 'active';
  IF _actor_role NOT IN ('founder', 'co_admin') AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Yetkiniz yok';
  END IF;
  UPDATE public.community_members SET payment_status = 'paid' WHERE id = _member_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.mark_member_paid(UUID) TO authenticated;

-- ============ community_messages (topluluk sohbeti) ============
CREATE TABLE public.community_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_community_messages_community ON public.community_messages(community_id, created_at);
GRANT SELECT, INSERT, DELETE ON public.community_messages TO authenticated;
GRANT ALL ON public.community_messages TO service_role;
ALTER TABLE public.community_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "community_messages_select_members" ON public.community_messages FOR SELECT
  USING (public.is_active_community_member(community_id, auth.uid()));
CREATE POLICY "community_messages_insert_members" ON public.community_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.is_active_community_member(community_id, auth.uid()));
CREATE POLICY "community_messages_delete_own_or_mod" ON public.community_messages FOR DELETE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.community_members cm
      WHERE cm.community_id = community_messages.community_id
        AND cm.user_id = auth.uid() AND cm.status = 'active' AND cm.role IN ('founder', 'co_admin')
    )
    OR public.has_role(auth.uid(), 'admin')
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.community_messages;

-- ============ forum_threads / forum_replies: topluluk bağlantısı ============
ALTER TABLE public.forum_threads
  ADD CONSTRAINT forum_threads_community_id_fkey
  FOREIGN KEY (community_id) REFERENCES public.communities(id) ON DELETE CASCADE;

CREATE POLICY "forum_threads_select_community" ON public.forum_threads FOR SELECT
  USING (community_id IS NOT NULL AND public.is_active_community_member(community_id, auth.uid()));
CREATE POLICY "forum_threads_insert_community" ON public.forum_threads FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND community_id IS NOT NULL
    AND public.is_active_community_member(community_id, auth.uid())
  );

CREATE POLICY "forum_replies_select_community" ON public.forum_replies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.forum_threads t
      WHERE t.id = thread_id AND t.community_id IS NOT NULL
        AND public.is_active_community_member(t.community_id, auth.uid())
    )
  );
CREATE POLICY "forum_replies_insert_community" ON public.forum_replies FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.forum_threads t
      WHERE t.id = thread_id AND t.community_id IS NOT NULL
        AND public.is_active_community_member(t.community_id, auth.uid())
    )
  );
