ALTER TABLE public.auto_engagement_config
ADD COLUMN IF NOT EXISTS like_delay_seconds integer NOT NULL DEFAULT 5,
ADD COLUMN IF NOT EXISTS reply_delay_seconds integer NOT NULL DEFAULT 10,
ADD COLUMN IF NOT EXISTS dm_delay_seconds integer NOT NULL DEFAULT 15;