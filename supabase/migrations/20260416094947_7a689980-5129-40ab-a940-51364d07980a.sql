
ALTER TABLE public.prospection_campaigns
  ADD COLUMN warmup_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN warmup_delay_hours integer NOT NULL DEFAULT 2;

ALTER TABLE public.prospection_messages
  ADD COLUMN warmup_status text DEFAULT null;
