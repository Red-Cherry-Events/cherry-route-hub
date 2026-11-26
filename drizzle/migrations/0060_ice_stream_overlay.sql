ALTER TABLE public.ice_control_links ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'control' CHECK (kind IN ('control','overlay'));
CREATE TABLE public.ice_stream_push (
  event_id uuid PRIMARY KEY,
  race_class text,
  rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  visible boolean NOT NULL DEFAULT false,
  pushed_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.ice_stream_push TO service_role;
ALTER TABLE public.ice_stream_push ENABLE ROW LEVEL SECURITY;