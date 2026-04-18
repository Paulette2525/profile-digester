-- Table 1: engaged_profiles
CREATE TABLE public.engaged_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  linkedin_url TEXT NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  headline TEXT,
  unipile_provider_id TEXT,
  auto_like BOOLEAN NOT NULL DEFAULT true,
  auto_comment BOOLEAN NOT NULL DEFAULT true,
  comment_tone TEXT NOT NULL DEFAULT 'professionnel',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, linkedin_url)
);

ALTER TABLE public.engaged_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own engaged profiles"
ON public.engaged_profiles FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_engaged_profiles_user_active ON public.engaged_profiles(user_id, is_active);

CREATE TRIGGER update_engaged_profiles_updated_at
BEFORE UPDATE ON public.engaged_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Table 2: engaged_interactions
CREATE TABLE public.engaged_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  engaged_profile_id UUID NOT NULL REFERENCES public.engaged_profiles(id) ON DELETE CASCADE,
  linkedin_post_id TEXT NOT NULL,
  post_content_preview TEXT,
  post_url TEXT,
  action_type TEXT NOT NULL,
  comment_text TEXT,
  status TEXT NOT NULL DEFAULT 'success',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.engaged_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own engaged interactions"
ON public.engaged_interactions FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE UNIQUE INDEX idx_engaged_interactions_unique
ON public.engaged_interactions(user_id, linkedin_post_id, action_type);

CREATE INDEX idx_engaged_interactions_user_created
ON public.engaged_interactions(user_id, created_at DESC);

CREATE INDEX idx_engaged_interactions_profile
ON public.engaged_interactions(engaged_profile_id);

-- Table 3: engaged_config
CREATE TABLE public.engaged_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  check_frequency_minutes INTEGER NOT NULL DEFAULT 60,
  comment_prompt TEXT NOT NULL DEFAULT 'Tu es un professionnel LinkedIn bienveillant. Génère un commentaire court (1-2 phrases), naturel, pertinent et personnalisé en fonction du contenu du post. Évite les emojis excessifs, le spam ou la promotion. Sois authentique et ajoute de la valeur à la conversation.',
  daily_comment_limit INTEGER NOT NULL DEFAULT 30,
  delay_between_actions_seconds INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.engaged_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own engaged config"
ON public.engaged_config FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_engaged_config_updated_at
BEFORE UPDATE ON public.engaged_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();