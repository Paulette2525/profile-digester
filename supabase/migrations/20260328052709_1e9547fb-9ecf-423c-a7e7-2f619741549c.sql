
-- Add new columns to user_memory
ALTER TABLE public.user_memory ADD COLUMN IF NOT EXISTS achievements text;
ALTER TABLE public.user_memory ADD COLUMN IF NOT EXISTS unique_methodology text;
ALTER TABLE public.user_memory ADD COLUMN IF NOT EXISTS key_results text;
ALTER TABLE public.user_memory ADD COLUMN IF NOT EXISTS differentiators text;
ALTER TABLE public.user_memory ADD COLUMN IF NOT EXISTS audience_pain_points text;
ALTER TABLE public.user_memory ADD COLUMN IF NOT EXISTS call_to_action_style text;
ALTER TABLE public.user_memory ADD COLUMN IF NOT EXISTS linkedin_goals text;
ALTER TABLE public.user_memory ADD COLUMN IF NOT EXISTS target_followers integer;
ALTER TABLE public.user_memory ADD COLUMN IF NOT EXISTS target_connections integer;
ALTER TABLE public.user_memory ADD COLUMN IF NOT EXISTS target_engagement_rate numeric;
ALTER TABLE public.user_memory ADD COLUMN IF NOT EXISTS goal_timeline text;
ALTER TABLE public.user_memory ADD COLUMN IF NOT EXISTS competitors text;
ALTER TABLE public.user_memory ADD COLUMN IF NOT EXISTS content_pillars text[] DEFAULT '{}'::text[];
ALTER TABLE public.user_memory ADD COLUMN IF NOT EXISTS brand_keywords text[] DEFAULT '{}'::text[];

-- Add image_url to content_ideas
ALTER TABLE public.content_ideas ADD COLUMN IF NOT EXISTS image_url text;

-- Create post_dm_rules table
CREATE TABLE public.post_dm_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.suggested_posts(id) ON DELETE CASCADE,
  trigger_keyword text NOT NULL,
  dm_message text NOT NULL,
  resource_url text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.post_dm_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to post_dm_rules" ON public.post_dm_rules FOR ALL TO public USING (true) WITH CHECK (true);
