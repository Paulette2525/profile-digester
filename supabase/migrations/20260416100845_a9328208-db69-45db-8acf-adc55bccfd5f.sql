
CREATE TABLE public.prospection_autopilot_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  mode text NOT NULL DEFAULT 'profiles',
  search_query text,
  post_ids text[] NOT NULL DEFAULT '{}',
  company_keywords text,
  daily_contact_limit integer NOT NULL DEFAULT 20,
  warmup_enabled boolean NOT NULL DEFAULT true,
  warmup_delay_hours integer NOT NULL DEFAULT 2,
  message_template text,
  sequence_steps jsonb NOT NULL DEFAULT '[]',
  offer_description text,
  conversation_guidelines text,
  delay_between_messages integer NOT NULL DEFAULT 5,
  last_run_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.prospection_autopilot_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own autopilot prospection config"
  ON public.prospection_autopilot_config
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_prospection_autopilot_config_updated_at
  BEFORE UPDATE ON public.prospection_autopilot_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_prospection_autopilot_config_user_id ON public.prospection_autopilot_config(user_id);
CREATE INDEX idx_prospection_autopilot_config_enabled ON public.prospection_autopilot_config(enabled) WHERE enabled = true;
