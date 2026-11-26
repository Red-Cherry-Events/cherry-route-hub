ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS everlytic_synced_at timestamptz, ADD COLUMN IF NOT EXISTS everlytic_error text;
CREATE OR REPLACE FUNCTION public.rider_hub_audience_pending(_limit int)
RETURNS TABLE(id uuid, email text, full_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, lower(u.email), p.full_name FROM public.profiles p JOIN auth.users u ON u.id = p.id
  WHERE p.everlytic_synced_at IS NULL AND u.email IS NOT NULL AND u.email_confirmed_at IS NOT NULL
  ORDER BY u.created_at LIMIT _limit
$$;
REVOKE ALL ON FUNCTION public.rider_hub_audience_pending(int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rider_hub_audience_pending(int) TO service_role;