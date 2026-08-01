REVOKE EXECUTE ON FUNCTION public.forum_post_like_count_sync() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.forum_comment_like_count_sync() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.forum_comment_count_sync() FROM PUBLIC, anon, authenticated;