DROP INDEX IF EXISTS idx_linkedin_posts_unipile;
ALTER TABLE public.linkedin_posts
  ADD CONSTRAINT uq_linkedin_posts_unipile
  UNIQUE (unipile_post_id, profile_id);