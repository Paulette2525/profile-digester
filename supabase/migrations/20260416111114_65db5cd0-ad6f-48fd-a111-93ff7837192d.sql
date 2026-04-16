
ALTER TABLE public.prospection_autopilot_config
  ADD COLUMN profiles_location text,
  ADD COLUMN profiles_industry text,
  ADD COLUMN profiles_title_filter text,
  ADD COLUMN profiles_company_size text,
  ADD COLUMN commenters_min_likes integer DEFAULT 0,
  ADD COLUMN commenters_filter_headline text,
  ADD COLUMN commenters_exclude_keywords text,
  ADD COLUMN companies_location text,
  ADD COLUMN companies_size_min integer,
  ADD COLUMN companies_size_max integer,
  ADD COLUMN companies_industry_filter text;
