REVOKE EXECUTE ON FUNCTION public.grant_mechanic_role() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_request_quoted() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_quote_request_ratelimit() FROM PUBLIC, anon, authenticated;