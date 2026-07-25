CREATE OR REPLACE FUNCTION public.grant_mechanic_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.user_id, 'mechanic')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;