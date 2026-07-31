-- images: owner-only SELECT
DROP POLICY IF EXISTS images_select_all ON public.images;
CREATE POLICY images_select_own ON public.images
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- profiles: authenticated-only SELECT
DROP POLICY IF EXISTS profiles_select_all ON public.profiles;
CREATE POLICY profiles_select_authenticated ON public.profiles
  FOR SELECT TO authenticated
  USING (true);

REVOKE SELECT ON public.profiles FROM anon;
REVOKE SELECT ON public.images FROM anon;

-- quote_responses: fix tautology
DROP POLICY IF EXISTS "Mechanic creates response" ON public.quote_responses;
CREATE POLICY "Mechanic creates response" ON public.quote_responses
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.mechanics m
      JOIN public.quote_requests q ON q.mechanic_id = m.id
      WHERE m.id = quote_responses.mechanic_id
        AND m.user_id = auth.uid()
        AND q.id = quote_responses.request_id
    )
  );

-- lock down trigger-only SECURITY DEFINER functions
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.grant_mechanic_role() FROM PUBLIC, anon, authenticated;