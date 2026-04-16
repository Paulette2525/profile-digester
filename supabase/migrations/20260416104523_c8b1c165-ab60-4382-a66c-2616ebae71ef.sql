
-- Add 3 independent enabled columns
ALTER TABLE public.prospection_autopilot_config
  ADD COLUMN profiles_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN commenters_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN companies_enabled boolean NOT NULL DEFAULT false;

-- Migrate existing data
UPDATE public.prospection_autopilot_config SET profiles_enabled = enabled WHERE mode = 'profiles';
UPDATE public.prospection_autopilot_config SET commenters_enabled = enabled WHERE mode = 'commenters';
UPDATE public.prospection_autopilot_config SET companies_enabled = enabled WHERE mode = 'companies';

-- Drop old columns
ALTER TABLE public.prospection_autopilot_config DROP COLUMN enabled;
ALTER TABLE public.prospection_autopilot_config DROP COLUMN mode;
