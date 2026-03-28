-- Create tracked_profiles table
CREATE TABLE public.tracked_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  linkedin_url TEXT NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  headline TEXT,
  unipile_account_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create linkedin_posts table
CREATE TABLE public.linkedin_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.tracked_profiles(id) ON DELETE CASCADE,
  unipile_post_id TEXT,
  content TEXT,
  post_url TEXT,
  likes_count INTEGER NOT NULL DEFAULT 0,
  comments_count INTEGER NOT NULL DEFAULT 0,
  shares_count INTEGER NOT NULL DEFAULT 0,
  posted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create post_interactions table
CREATE TABLE public.post_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.linkedin_posts(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('like', 'comment')),
  author_name TEXT,
  author_avatar_url TEXT,
  author_linkedin_url TEXT,
  comment_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tracked_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.linkedin_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_interactions ENABLE ROW LEVEL SECURITY;

-- Public read/write policies (no auth for this app)
CREATE POLICY "Allow all access to tracked_profiles" ON public.tracked_profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to linkedin_posts" ON public.linkedin_posts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to post_interactions" ON public.post_interactions FOR ALL USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX idx_linkedin_posts_profile_id ON public.linkedin_posts(profile_id);
CREATE INDEX idx_linkedin_posts_posted_at ON public.linkedin_posts(posted_at DESC);
CREATE INDEX idx_post_interactions_post_id ON public.post_interactions(post_id);

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers
CREATE TRIGGER update_tracked_profiles_updated_at
  BEFORE UPDATE ON public.tracked_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_linkedin_posts_updated_at
  BEFORE UPDATE ON public.linkedin_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();