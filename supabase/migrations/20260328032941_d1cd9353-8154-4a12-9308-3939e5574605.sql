
ALTER TABLE public.linkedin_posts 
ADD COLUMN IF NOT EXISTS media_urls jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS media_type text DEFAULT 'none';

ALTER TABLE public.post_interactions 
ADD COLUMN IF NOT EXISTS unipile_comment_id text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_post_interactions_unipile_comment 
ON public.post_interactions (post_id, unipile_comment_id) 
WHERE unipile_comment_id IS NOT NULL;
