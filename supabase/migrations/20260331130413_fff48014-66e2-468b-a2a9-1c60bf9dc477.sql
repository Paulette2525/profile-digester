ALTER TABLE public.autopilot_config 
  ADD COLUMN IF NOT EXISTS daily_content_plan jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS auto_visuals boolean NOT NULL DEFAULT false;