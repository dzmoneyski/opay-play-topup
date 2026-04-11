
CREATE TABLE public.agent_settlements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id uuid NOT NULL,
  amount numeric NOT NULL,
  notes text,
  settled_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage settlements"
ON public.agent_settlements
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Agents can view own settlements"
ON public.agent_settlements
FOR SELECT
TO authenticated
USING (auth.uid() = agent_id);

CREATE INDEX idx_agent_settlements_agent_id ON public.agent_settlements (agent_id);
