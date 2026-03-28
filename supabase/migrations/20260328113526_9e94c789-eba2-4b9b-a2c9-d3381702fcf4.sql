ALTER TABLE public.tracked_profiles 
ADD COLUMN IF NOT EXISTS last_analyzed_at timestamptz,
ADD COLUMN IF NOT EXISTS analysis_summary jsonb DEFAULT '{}'::jsonb;