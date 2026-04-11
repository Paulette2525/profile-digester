
-- Create sequence steps table
CREATE TABLE public.prospection_sequence_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.prospection_campaigns(id) ON DELETE CASCADE NOT NULL,
  step_order integer NOT NULL DEFAULT 1,
  delay_days integer NOT NULL DEFAULT 0,
  message_template text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.prospection_sequence_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own sequence steps"
ON public.prospection_sequence_steps
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.prospection_campaigns c
    WHERE c.id = campaign_id AND c.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.prospection_campaigns c
    WHERE c.id = campaign_id AND c.user_id = auth.uid()
  )
);

-- Add columns to prospection_messages
ALTER TABLE public.prospection_messages
  ADD COLUMN step_order integer NOT NULL DEFAULT 1,
  ADD COLUMN next_followup_at timestamptz;
