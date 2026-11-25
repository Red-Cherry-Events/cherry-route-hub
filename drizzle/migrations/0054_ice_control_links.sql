CREATE TABLE public.ice_control_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.ice_control_links TO service_role;
ALTER TABLE public.ice_control_links ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.ice_control_links IS 'Private trackside control links; only token hashes stored; service-role only.';