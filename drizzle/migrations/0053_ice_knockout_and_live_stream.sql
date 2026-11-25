CREATE OR REPLACE FUNCTION public.is_crew_or_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('crew','admin'))
$$;

CREATE OR REPLACE FUNCTION public.tidy_rider_name(_name text)
RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE w text; parts text[]; out text[] := '{}'; i int := 0;
BEGIN
  parts := regexp_split_to_array(btrim(coalesce(_name,'')), '\s+');
  FOREACH w IN ARRAY parts LOOP
    i := i + 1;
    IF w = '' THEN CONTINUE; END IF;
    IF i > 1 AND w IN ('van','de','du','der','le','da') THEN out := out || w;
    ELSE out := out || (upper(left(w,1)) || substr(w,2)); END IF;
  END LOOP;
  RETURN array_to_string(out, ' ');
END $$;

CREATE TABLE public.ice_knockout_riders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  race_class text NOT NULL CHECK (race_class IN ('pro','support')),
  full_name text NOT NULL,
  bib_number text,
  sort_order int NOT NULL DEFAULT 100,
  status text NOT NULL DEFAULT 'in' CHECK (status IN ('in','out')),
  out_round text,
  out_at timestamptz,
  event_entrant_id uuid UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ice_knockout_riders_event_idx ON public.ice_knockout_riders(event_id, race_class);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ice_knockout_riders TO authenticated;
GRANT ALL ON public.ice_knockout_riders TO service_role;
ALTER TABLE public.ice_knockout_riders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users read knockout" ON public.ice_knockout_riders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Crew insert knockout" ON public.ice_knockout_riders FOR INSERT TO authenticated WITH CHECK (public.is_crew_or_admin());
CREATE POLICY "Crew update knockout" ON public.ice_knockout_riders FOR UPDATE TO authenticated USING (public.is_crew_or_admin()) WITH CHECK (public.is_crew_or_admin());
CREATE POLICY "Crew delete knockout" ON public.ice_knockout_riders FOR DELETE TO authenticated USING (public.is_crew_or_admin());
CREATE TRIGGER ice_knockout_touch BEFORE UPDATE ON public.ice_knockout_riders FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
ALTER PUBLICATION supabase_realtime ADD TABLE public.ice_knockout_riders;

CREATE TABLE public.event_live_streams (
  event_id uuid PRIMARY KEY REFERENCES public.events(id) ON DELETE CASCADE,
  youtube_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_live_streams TO authenticated;
GRANT ALL ON public.event_live_streams TO service_role;
ALTER TABLE public.event_live_streams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users read live stream" ON public.event_live_streams FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins write live stream" ON public.event_live_streams FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_live_streams;

CREATE OR REPLACE FUNCTION public.ice_knockout_sync_entrant()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE nm text;
BEGIN
  IF NEW.event_id <> 'f046ce38-e687-4038-959d-271ba20825f0'::uuid OR NEW.category IS NULL OR NEW.category NOT ILIKE 'support%' THEN
    RETURN NEW;
  END IF;
  SELECT full_name INTO nm FROM public.entrants WHERE id = NEW.entrant_id;
  IF nm IS NULL OR btrim(nm) = '' THEN RETURN NEW; END IF;
  INSERT INTO public.ice_knockout_riders(event_id, race_class, full_name, bib_number, sort_order, event_entrant_id)
  VALUES (NEW.event_id, 'support', public.tidy_rider_name(nm), NEW.bib_number, 100, NEW.id)
  ON CONFLICT (event_entrant_id) DO UPDATE SET bib_number = COALESCE(EXCLUDED.bib_number, public.ice_knockout_riders.bib_number);
  RETURN NEW;
END $$;
CREATE TRIGGER ice_knockout_entrant_sync AFTER INSERT OR UPDATE OF category, bib_number ON public.event_entrants
  FOR EACH ROW EXECUTE FUNCTION public.ice_knockout_sync_entrant();

INSERT INTO public.ice_knockout_riders(event_id, race_class, full_name, sort_order)
SELECT 'f046ce38-e687-4038-959d-271ba20825f0'::uuid, 'pro', n, o FROM unnest(ARRAY[
 'Kyle Flanagan','Dylan Cox','Heinrich Aust','Liam Elks','Luke Walker','Thomas Scales','Michael Swanepoel','Wade Young','Adam Bac','Armand Fourie','Kyle Eggar','Brian Capper'
]) WITH ORDINALITY AS t(n, o);

INSERT INTO public.ice_knockout_riders(event_id, race_class, full_name, bib_number, sort_order, event_entrant_id)
SELECT ee.event_id, 'support', public.tidy_rider_name(e.full_name), ee.bib_number, 100, ee.id
FROM public.event_entrants ee JOIN public.entrants e ON e.id = ee.entrant_id
WHERE ee.event_id = 'f046ce38-e687-4038-959d-271ba20825f0' AND ee.category ILIKE 'support%';