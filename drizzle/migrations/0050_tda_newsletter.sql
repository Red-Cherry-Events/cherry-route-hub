CREATE TABLE public.tda_newsletter_campaign (id boolean PRIMARY KEY DEFAULT true CHECK(id), enabled boolean NOT NULL DEFAULT false, delivery_verified boolean NOT NULL DEFAULT false, enabled_at timestamptz, updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.tda_newsletter_campaign TO authenticated; GRANT ALL ON public.tda_newsletter_campaign TO service_role;
ALTER TABLE public.tda_newsletter_campaign ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin newsletter campaign" ON public.tda_newsletter_campaign FOR SELECT TO authenticated USING(private.is_admin());
CREATE TABLE public.tda_newsletter_signups (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text NOT NULL UNIQUE CHECK(email=lower(trim(email)) AND length(email)<=255), name text, source text, consent_at timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now(), status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','entered','unsubscribed','finished')), unsubscribed_at timestamptz, unsubscribe_token uuid NOT NULL DEFAULT gen_random_uuid(), generation integer NOT NULL DEFAULT 1, series_started_at timestamptz, next_email integer NOT NULL DEFAULT 1 CHECK(next_email BETWEEN 1 AND 5), everlytic_synced boolean NOT NULL DEFAULT false, everlytic_error text);
GRANT SELECT ON public.tda_newsletter_signups TO authenticated; GRANT ALL ON public.tda_newsletter_signups TO service_role;
ALTER TABLE public.tda_newsletter_signups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin newsletter signups" ON public.tda_newsletter_signups FOR SELECT TO authenticated USING(private.is_admin());
CREATE TABLE public.tda_newsletter_sends (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), signup_id uuid NOT NULL REFERENCES public.tda_newsletter_signups(id) ON DELETE CASCADE, generation integer NOT NULL, email_number integer NOT NULL CHECK(email_number BETWEEN 1 AND 4), status text NOT NULL DEFAULT 'claimed' CHECK(status IN ('claimed','accepted','failed','uncertain','stopped')), provider_list_id text, provider_email_id text, error text, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(signup_id,generation,email_number));
GRANT SELECT ON public.tda_newsletter_sends TO authenticated; GRANT ALL ON public.tda_newsletter_sends TO service_role;
ALTER TABLE public.tda_newsletter_sends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin newsletter sends" ON public.tda_newsletter_sends FOR SELECT TO authenticated USING(private.is_admin());
CREATE FUNCTION public.subscribe_tda_newsletter(_email text,_name text,_source text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE r public.tda_newsletter_signups; BEGIN
IF length(_email)>255 OR length(coalesce(_name,''))>120 OR length(coalesce(_source,''))>500 THEN RAISE EXCEPTION 'Invalid sign-up'; END IF;
INSERT INTO public.tda_newsletter_signups(email,name,source) VALUES(lower(trim(_email)),_name,_source) ON CONFLICT(email) DO NOTHING;
SELECT * INTO r FROM public.tda_newsletter_signups WHERE email=lower(trim(_email)) FOR UPDATE;
IF r.status='unsubscribed' THEN UPDATE public.tda_newsletter_signups SET consent_at=now(),name=_name,source=_source,status='active',unsubscribed_at=NULL,unsubscribe_token=gen_random_uuid(),generation=generation+1,series_started_at=NULL,next_email=1 WHERE id=r.id; END IF;
RETURN r.id; END $$;
REVOKE ALL ON FUNCTION public.subscribe_tda_newsletter(text,text,text) FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.subscribe_tda_newsletter(text,text,text) TO service_role;
CREATE FUNCTION public.set_tda_newsletter_enabled(_enabled boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
IF _enabled AND NOT EXISTS(SELECT 1 FROM public.tda_newsletter_campaign WHERE id AND delivery_verified) THEN RAISE EXCEPTION 'Delivery is not verified'; END IF;
INSERT INTO public.tda_newsletter_campaign(id,enabled,enabled_at) VALUES(true,_enabled,CASE WHEN _enabled THEN now() END) ON CONFLICT(id) DO UPDATE SET enabled=_enabled,enabled_at=CASE WHEN _enabled AND NOT tda_newsletter_campaign.enabled THEN now() ELSE tda_newsletter_campaign.enabled_at END,updated_at=now();
IF _enabled THEN UPDATE public.tda_newsletter_signups SET series_started_at=now() WHERE status='active' AND series_started_at IS NULL; END IF;
END $$;
REVOKE ALL ON FUNCTION public.set_tda_newsletter_enabled(boolean) FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.set_tda_newsletter_enabled(boolean) TO service_role;