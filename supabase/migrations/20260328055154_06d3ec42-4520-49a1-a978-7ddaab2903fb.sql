
-- Add user_id to main tables
ALTER TABLE public.user_memory ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.suggested_posts ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.auto_engagement_config ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.auto_engagement_logs ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.tracked_profiles ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.linkedin_posts ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.content_ideas ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_photos ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.post_dm_rules ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.virality_analyses ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.post_interactions ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Drop old permissive policies and create user-scoped ones
-- user_memory
DROP POLICY IF EXISTS "Allow all access to user_memory" ON public.user_memory;
CREATE POLICY "Users manage own memory" ON public.user_memory FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- suggested_posts
DROP POLICY IF EXISTS "Allow all access to suggested_posts" ON public.suggested_posts;
CREATE POLICY "Users manage own posts" ON public.suggested_posts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- auto_engagement_config
DROP POLICY IF EXISTS "Allow all access to auto_engagement_config" ON public.auto_engagement_config;
CREATE POLICY "Users manage own config" ON public.auto_engagement_config FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- auto_engagement_logs
DROP POLICY IF EXISTS "Allow all access to auto_engagement_logs" ON public.auto_engagement_logs;
CREATE POLICY "Users manage own logs" ON public.auto_engagement_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- tracked_profiles
DROP POLICY IF EXISTS "Allow all access to tracked_profiles" ON public.tracked_profiles;
CREATE POLICY "Users manage own tracked profiles" ON public.tracked_profiles FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- linkedin_posts
DROP POLICY IF EXISTS "Allow all access to linkedin_posts" ON public.linkedin_posts;
CREATE POLICY "Users manage own linkedin posts" ON public.linkedin_posts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- content_ideas
DROP POLICY IF EXISTS "Allow all access to content_ideas" ON public.content_ideas;
CREATE POLICY "Users manage own ideas" ON public.content_ideas FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- user_photos
DROP POLICY IF EXISTS "Allow all access to user_photos" ON public.user_photos;
CREATE POLICY "Users manage own photos" ON public.user_photos FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- post_dm_rules
DROP POLICY IF EXISTS "Allow all access to post_dm_rules" ON public.post_dm_rules;
CREATE POLICY "Users manage own dm rules" ON public.post_dm_rules FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- virality_analyses
DROP POLICY IF EXISTS "Allow all access to virality_analyses" ON public.virality_analyses;
CREATE POLICY "Users manage own analyses" ON public.virality_analyses FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- post_interactions
DROP POLICY IF EXISTS "Allow all access to post_interactions" ON public.post_interactions;
CREATE POLICY "Users manage own interactions" ON public.post_interactions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
