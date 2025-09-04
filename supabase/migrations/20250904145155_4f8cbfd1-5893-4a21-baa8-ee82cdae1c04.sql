-- Create user_balances table
CREATE TABLE public.user_balances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on user_balances
ALTER TABLE public.user_balances ENABLE ROW LEVEL SECURITY;

-- Create policies for user_balances
CREATE POLICY "Users can view their own balance" 
ON public.user_balances 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own balance" 
ON public.user_balances 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all balances" 
ON public.user_balances 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all balances" 
ON public.user_balances 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_balances_updated_at
BEFORE UPDATE ON public.user_balances
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update the approve_deposit function to add balance
CREATE OR REPLACE FUNCTION public.approve_deposit(_deposit_id uuid, _admin_id uuid, _notes text DEFAULT NULL::text, _adjusted_amount numeric DEFAULT NULL::numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _user_id UUID;
  _final_amount DECIMAL(10,2);
BEGIN
  -- Check if caller is admin
  IF NOT public.has_role(_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can approve deposits';
  END IF;
  
  -- Get deposit details and update it
  UPDATE public.deposits 
  SET status = 'approved',
      processed_at = now(),
      processed_by = _admin_id,
      admin_notes = _notes,
      amount = COALESCE(_adjusted_amount, amount)
  WHERE id = _deposit_id
  RETURNING user_id, amount INTO _user_id, _final_amount;
  
  -- Create user balance if it doesn't exist
  INSERT INTO public.user_balances (user_id, balance)
  VALUES (_user_id, 0.00)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Add the deposit amount to user balance
  UPDATE public.user_balances 
  SET balance = balance + _final_amount,
      updated_at = now()
  WHERE user_id = _user_id;
END;
$function$;