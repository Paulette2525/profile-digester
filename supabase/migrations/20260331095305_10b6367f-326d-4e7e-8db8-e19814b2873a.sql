
-- Table de configuration de l'autopilote
CREATE TABLE public.autopilot_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  posts_per_day integer NOT NULL DEFAULT 2,
  active_days text[] NOT NULL DEFAULT '{monday,tuesday,wednesday,thursday,friday}'::text[],
  posting_hours integer[] NOT NULL DEFAULT '{9,12,17}'::integer[],
  industries_to_watch text[] NOT NULL DEFAULT '{}'::text[],
  approval_mode text NOT NULL DEFAULT 'review',
  last_run_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.autopilot_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own autopilot config"
  ON public.autopilot_config FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Table des tendances détectées
CREATE TABLE public.trend_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  topic text NOT NULL,
  source text,
  summary text,
  used boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.trend_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own trend insights"
  ON public.trend_insights FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
