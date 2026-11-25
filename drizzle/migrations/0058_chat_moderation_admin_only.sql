DROP POLICY IF EXISTS "chat read: entrants or admin" ON public.event_chat_messages;
CREATE POLICY "chat read: entrants or admin" ON public.event_chat_messages
  FOR SELECT TO authenticated USING (
    private.is_admin() OR (private.is_event_entrant(event_id) AND NOT hidden)
  );
DROP POLICY IF EXISTS "chat moderate: crew or admin" ON public.event_chat_messages;
CREATE POLICY "chat moderate: admin" ON public.event_chat_messages
  FOR UPDATE TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());
DROP POLICY IF EXISTS "reports read own or staff" ON public.chat_reports;
CREATE POLICY "reports read own or admin" ON public.chat_reports FOR SELECT TO authenticated
  USING (reporter_id = auth.uid() OR private.is_admin());
DROP POLICY IF EXISTS "reports staff update" ON public.chat_reports;
CREATE POLICY "reports admin update" ON public.chat_reports FOR UPDATE TO authenticated
  USING (private.is_admin()) WITH CHECK (private.is_admin());