DROP INDEX IF EXISTS public.entrants_email_idx;
CREATE INDEX entrants_email_idx ON public.entrants (lower(email));