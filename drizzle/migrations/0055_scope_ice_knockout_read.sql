DROP POLICY IF EXISTS "Signed-in users read knockout" ON public.ice_knockout_riders;
CREATE POLICY "Signed-in users read knockout for visible events" ON public.ice_knockout_riders
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = ice_knockout_riders.event_id));