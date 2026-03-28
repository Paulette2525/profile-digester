
CREATE TABLE public.content_strategy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  strategy_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.content_strategy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own strategy" ON public.content_strategy
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_content_strategy_updated_at
  BEFORE UPDATE ON public.content_strategy
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
