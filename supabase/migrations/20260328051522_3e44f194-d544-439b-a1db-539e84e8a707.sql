
-- User memory table
CREATE TABLE public.user_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  full_name text,
  profession text,
  company text,
  industry text,
  target_audience text,
  offers_description text,
  ambitions text,
  "values" text,
  tone_of_voice text,
  content_themes text[] DEFAULT '{}',
  content_types text[] DEFAULT '{}',
  personal_story text,
  expertise_areas text,
  posting_frequency text,
  preferred_formats text,
  additional_notes text
);

ALTER TABLE public.user_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to user_memory" ON public.user_memory FOR ALL TO public USING (true) WITH CHECK (true);

CREATE TRIGGER update_user_memory_updated_at BEFORE UPDATE ON public.user_memory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- User photos table
CREATE TABLE public.user_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  image_url text NOT NULL,
  description text
);

ALTER TABLE public.user_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to user_photos" ON public.user_photos FOR ALL TO public USING (true) WITH CHECK (true);

-- Content ideas table
CREATE TABLE public.content_ideas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  idea_text text NOT NULL,
  used boolean NOT NULL DEFAULT false
);

ALTER TABLE public.content_ideas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to content_ideas" ON public.content_ideas FOR ALL TO public USING (true) WITH CHECK (true);

-- Storage bucket for user photos
INSERT INTO storage.buckets (id, name, public) VALUES ('user-photos', 'user-photos', true);

CREATE POLICY "Allow public read on user-photos" ON storage.objects FOR SELECT TO public USING (bucket_id = 'user-photos');
CREATE POLICY "Allow public insert on user-photos" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'user-photos');
CREATE POLICY "Allow public delete on user-photos" ON storage.objects FOR DELETE TO public USING (bucket_id = 'user-photos');
