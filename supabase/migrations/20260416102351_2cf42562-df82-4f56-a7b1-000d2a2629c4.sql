
-- Lead forms table
CREATE TABLE public.lead_forms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  fields_config JSONB NOT NULL DEFAULT '[]'::jsonb,
  form_slug TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own lead forms"
  ON public.lead_forms FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Public read for displaying forms
CREATE POLICY "Anyone can read active forms by slug"
  ON public.lead_forms FOR SELECT TO anon
  USING (is_active = true);

CREATE TRIGGER update_lead_forms_updated_at
  BEFORE UPDATE ON public.lead_forms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Leads table
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  form_id UUID REFERENCES public.lead_forms(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'new',
  notes TEXT,
  source TEXT,
  linkedin_url TEXT,
  email TEXT,
  phone TEXT,
  company TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own leads"
  ON public.leads FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow service role / edge function to insert leads (public submissions)
CREATE POLICY "Service can insert leads"
  ON public.leads FOR INSERT TO anon
  WITH CHECK (true);

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for leads
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;

-- Index for performance
CREATE INDEX idx_leads_user_status ON public.leads(user_id, status);
CREATE INDEX idx_leads_form_id ON public.leads(form_id);
CREATE INDEX idx_lead_forms_slug ON public.lead_forms(form_slug);
