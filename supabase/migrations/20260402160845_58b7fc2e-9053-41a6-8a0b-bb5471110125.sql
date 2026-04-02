
CREATE INDEX IF NOT EXISTS idx_tracked_profiles_user_created ON public.tracked_profiles (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_linkedin_posts_user_posted ON public.linkedin_posts (user_id, posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_suggested_posts_user_status_created ON public.suggested_posts (user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_suggested_posts_user_scheduled ON public.suggested_posts (user_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_suggested_posts_user_published ON public.suggested_posts (user_id, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_ideas_user_used_created ON public.content_ideas (user_id, used, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_photos_user_created ON public.user_photos (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trend_insights_user_created ON public.trend_insights (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auto_engagement_logs_user_created ON public.auto_engagement_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_dm_rules_user_created ON public.post_dm_rules (user_id, created_at DESC);
