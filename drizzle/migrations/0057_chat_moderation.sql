ALTER TABLE public.event_chat_messages
  ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hidden_at timestamptz,
  ADD COLUMN IF NOT EXISTS hidden_by uuid;

DROP POLICY IF EXISTS "chat read: entrants or admin" ON public.event_chat_messages;
CREATE POLICY "chat read: entrants or admin" ON public.event_chat_messages
  FOR SELECT TO authenticated USING (
    public.is_crew_or_admin() OR (private.is_event_entrant(event_id) AND NOT hidden)
  );
CREATE POLICY "chat moderate: crew or admin" ON public.event_chat_messages
  FOR UPDATE TO authenticated USING (public.is_crew_or_admin()) WITH CHECK (public.is_crew_or_admin());

CREATE OR REPLACE FUNCTION public.mask_profanity(_body text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT regexp_replace(
    _body,
    '\m(f+u+c+k+\w*|motherf\w*|sh+i+t+\w*|bitch\w*|cunt\w*|dick(head)?s?|cocks?|puss(y|ies)|twats?|wank\w*|bastards?|assholes?|arseholes?|fag(got)?s?|nigg\w*|kaffir\w*|k\*ffir|poes|naai\w*|moer\w*|slut\w*|whores?|retards?)\M',
    '***', 'gi')
$$;

CREATE OR REPLACE FUNCTION public.chat_mask_profanity()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.body := public.mask_profanity(NEW.body);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS chat_mask_profanity ON public.event_chat_messages;
CREATE TRIGGER chat_mask_profanity BEFORE INSERT OR UPDATE OF body ON public.event_chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.chat_mask_profanity();

CREATE TABLE public.chat_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.event_chat_messages(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL,
  reason text CHECK (reason IS NULL OR char_length(reason) <= 500),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid,
  UNIQUE (message_id, reporter_id)
);
CREATE INDEX chat_reports_status_idx ON public.chat_reports (status, created_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.chat_reports TO authenticated;
GRANT ALL ON public.chat_reports TO service_role;
ALTER TABLE public.chat_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reports insert own" ON public.chat_reports FOR INSERT TO authenticated
  WITH CHECK (
    reporter_id = auth.uid() AND status = 'open'
    AND EXISTS (SELECT 1 FROM public.event_chat_messages m
      WHERE m.id = message_id AND m.event_id = chat_reports.event_id AND m.author_id <> auth.uid())
  );
CREATE POLICY "reports read own or staff" ON public.chat_reports FOR SELECT TO authenticated
  USING (reporter_id = auth.uid() OR public.is_crew_or_admin());
CREATE POLICY "reports staff update" ON public.chat_reports FOR UPDATE TO authenticated
  USING (public.is_crew_or_admin()) WITH CHECK (public.is_crew_or_admin());

CREATE TABLE public.user_blocks (
  blocker_id uuid NOT NULL,
  blocked_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);
GRANT SELECT, INSERT, DELETE ON public.user_blocks TO authenticated;
GRANT ALL ON public.user_blocks TO service_role;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blocks read own" ON public.user_blocks FOR SELECT TO authenticated USING (blocker_id = auth.uid());
CREATE POLICY "blocks insert own" ON public.user_blocks FOR INSERT TO authenticated WITH CHECK (blocker_id = auth.uid());
CREATE POLICY "blocks delete own" ON public.user_blocks FOR DELETE TO authenticated USING (blocker_id = auth.uid());