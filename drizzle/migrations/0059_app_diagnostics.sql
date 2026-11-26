CREATE TABLE public.app_diagnostics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  event text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX app_diagnostics_created_idx ON public.app_diagnostics (created_at DESC);
GRANT SELECT, INSERT ON public.app_diagnostics TO authenticated;
GRANT ALL ON public.app_diagnostics TO service_role;
ALTER TABLE public.app_diagnostics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users insert own diagnostics" ON public.app_diagnostics FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());
CREATE POLICY "Admins read diagnostics" ON public.app_diagnostics FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));