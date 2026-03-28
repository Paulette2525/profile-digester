CREATE TABLE public.account_stats_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  followers integer NOT NULL DEFAULT 0,
  connections integer NOT NULL DEFAULT 0,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, snapshot_date)
);

ALTER TABLE public.account_stats_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own stats history"
  ON public.account_stats_history
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_account_stats_history_user_date 
  ON public.account_stats_history (user_id, snapshot_date DESC);