
-- Create agent permissions table
CREATE TABLE public.agent_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  can_manage_game_topups boolean DEFAULT false,
  can_manage_betting boolean DEFAULT false,
  can_view_orders boolean DEFAULT true,
  daily_limit numeric DEFAULT 50000,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid
);

-- Enable RLS
ALTER TABLE public.agent_permissions ENABLE ROW LEVEL SECURITY;

-- Admins can manage agent permissions
CREATE POLICY "Admins can manage agent permissions"
ON public.agent_permissions
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Agents can view their own permissions
CREATE POLICY "Agents can view own permissions"
ON public.agent_permissions
FOR SELECT
USING (auth.uid() = user_id);

-- Create function to check if user is agent
CREATE OR REPLACE FUNCTION public.is_agent(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'agent'
  )
$$;

-- Create function to check agent permission
CREATE OR REPLACE FUNCTION public.agent_can(_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE _permission
    WHEN 'game_topups' THEN COALESCE((SELECT can_manage_game_topups FROM agent_permissions WHERE user_id = _user_id), false)
    WHEN 'betting' THEN COALESCE((SELECT can_manage_betting FROM agent_permissions WHERE user_id = _user_id), false)
    WHEN 'view_orders' THEN COALESCE((SELECT can_view_orders FROM agent_permissions WHERE user_id = _user_id), false)
    ELSE false
  END
$$;

-- Add agent policies for game_topup_orders
CREATE POLICY "Agents can view game topup orders"
ON public.game_topup_orders
FOR SELECT
USING (agent_can(auth.uid(), 'game_topups'));

CREATE POLICY "Agents can update game topup orders"
ON public.game_topup_orders
FOR UPDATE
USING (agent_can(auth.uid(), 'game_topups'));

-- Add agent policies for betting_transactions
CREATE POLICY "Agents can view betting transactions"
ON public.betting_transactions
FOR SELECT
USING (agent_can(auth.uid(), 'betting'));

CREATE POLICY "Agents can update betting transactions"
ON public.betting_transactions
FOR UPDATE
USING (agent_can(auth.uid(), 'betting'));
