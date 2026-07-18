
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
-- has_role stays callable by authenticated (needed for policies from client contexts)
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
