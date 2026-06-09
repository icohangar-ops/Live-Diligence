
CREATE TABLE public.webhook_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source text NOT NULL DEFAULT 'stripe',
  event_id text,
  event_type text,
  payload_style text NOT NULL DEFAULT 'snapshot',
  verified boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'received',
  error text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.webhook_events TO authenticated;
GRANT ALL ON public.webhook_events TO service_role;

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read webhook events"
ON public.webhook_events
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX webhook_events_created_at_idx ON public.webhook_events (created_at DESC);
