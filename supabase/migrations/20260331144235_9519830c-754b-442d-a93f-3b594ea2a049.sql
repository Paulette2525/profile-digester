
-- Add resource_url to content_ideas
ALTER TABLE public.content_ideas ADD COLUMN IF NOT EXISTS resource_url text;

-- Create prospection_campaigns table
CREATE TABLE public.prospection_campaigns (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  message_template text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  total_prospects integer NOT NULL DEFAULT 0,
  sent_count integer NOT NULL DEFAULT 0,
  reply_count integer NOT NULL DEFAULT 0,
  accepted_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.prospection_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own campaigns" ON public.prospection_campaigns
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create prospection_messages table
CREATE TABLE public.prospection_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id uuid REFERENCES public.prospection_campaigns(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  prospect_name text,
  prospect_headline text,
  prospect_linkedin_url text,
  prospect_avatar_url text,
  message_sent text,
  status text NOT NULL DEFAULT 'pending',
  sent_at timestamp with time zone,
  replied_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.prospection_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own prospect messages" ON public.prospection_messages
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
