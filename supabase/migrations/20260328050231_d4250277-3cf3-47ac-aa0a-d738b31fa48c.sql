
-- Config table for auto-engagement toggles and prompts
CREATE TABLE public.auto_engagement_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auto_reply boolean NOT NULL DEFAULT false,
  auto_dm boolean NOT NULL DEFAULT false,
  auto_like boolean NOT NULL DEFAULT false,
  reply_prompt text DEFAULT 'Tu es un community manager LinkedIn professionnel. Réponds de manière chaleureuse, pertinente et concise au commentaire suivant.',
  dm_template text DEFAULT 'Bonjour {author_name}, merci pour votre commentaire sur mon post ! N''hésitez pas à me contacter si vous souhaitez en discuter davantage.',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.auto_engagement_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to auto_engagement_config" ON public.auto_engagement_config FOR ALL TO public USING (true) WITH CHECK (true);

-- Logs table for tracking automated actions
CREATE TABLE public.auto_engagement_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type text NOT NULL, -- 'reply', 'dm', 'like'
  post_id uuid REFERENCES public.suggested_posts(id) ON DELETE SET NULL,
  comment_id text,
  author_name text,
  author_linkedin_url text,
  content_sent text,
  status text NOT NULL DEFAULT 'success', -- 'success', 'error'
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.auto_engagement_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to auto_engagement_logs" ON public.auto_engagement_logs FOR ALL TO public USING (true) WITH CHECK (true);

-- Insert default config row
INSERT INTO public.auto_engagement_config (auto_reply, auto_dm, auto_like) VALUES (false, false, false);
