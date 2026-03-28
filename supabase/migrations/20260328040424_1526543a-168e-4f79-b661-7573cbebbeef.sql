
-- Table for virality analysis results
CREATE TABLE public.virality_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.tracked_profiles(id) ON DELETE CASCADE,
  analysis_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.virality_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to virality_analyses" ON public.virality_analyses FOR ALL TO public USING (true) WITH CHECK (true);

-- Table for AI-generated suggested posts
CREATE TABLE public.suggested_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  topic text,
  virality_score integer DEFAULT 0,
  source_analysis_id uuid REFERENCES public.virality_analyses(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft',
  scheduled_at timestamp with time zone,
  published_at timestamp with time zone,
  post_performance jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.suggested_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to suggested_posts" ON public.suggested_posts FOR ALL TO public USING (true) WITH CHECK (true);

-- Trigger for updated_at on suggested_posts
CREATE TRIGGER update_suggested_posts_updated_at
  BEFORE UPDATE ON public.suggested_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
