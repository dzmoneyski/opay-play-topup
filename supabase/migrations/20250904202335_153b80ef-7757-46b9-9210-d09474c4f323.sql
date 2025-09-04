-- Create transfers table
CREATE TABLE public.transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  sender_phone TEXT NOT NULL,
  recipient_phone TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;

-- Create policies for transfers
CREATE POLICY "Users can view their own transfers" 
ON public.transfers 
FOR SELECT 
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can create transfers as sender" 
ON public.transfers 
FOR INSERT 
WITH CHECK (auth.uid() = sender_id);

-- Create function to process transfer
CREATE OR REPLACE FUNCTION public.process_transfer(
  recipient_phone_param TEXT,
  amount_param NUMERIC,
  note_param TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  sender_user_id UUID;
  recipient_user_id UUID;
  sender_balance_record RECORD;
  recipient_balance_record RECORD;
  transfer_id UUID;
  sender_phone_record TEXT;
BEGIN
  -- Get current user
  sender_user_id := auth.uid();
  
  IF sender_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not authenticated');
  END IF;

  -- Get sender's phone
  SELECT phone INTO sender_phone_record 
  FROM public.profiles 
  WHERE user_id = sender_user_id;

  -- Find recipient by phone
  SELECT user_id INTO recipient_user_id
  FROM public.profiles 
  WHERE phone = recipient_phone_param;
  
  IF recipient_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Recipient not found');
  END IF;

  IF sender_user_id = recipient_user_id THEN
    RETURN json_build_object('success', false, 'error', 'Cannot transfer to yourself');
  END IF;

  -- Get sender balance
  SELECT * INTO sender_balance_record 
  FROM public.user_balances 
  WHERE user_id = sender_user_id;
  
  IF sender_balance_record IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Sender balance not found');
  END IF;

  -- Check if sender has enough balance
  IF sender_balance_record.balance < amount_param THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  -- Get or create recipient balance
  SELECT * INTO recipient_balance_record 
  FROM public.user_balances 
  WHERE user_id = recipient_user_id;
  
  IF recipient_balance_record IS NULL THEN
    INSERT INTO public.user_balances (user_id, balance)
    VALUES (recipient_user_id, 0)
    RETURNING * INTO recipient_balance_record;
  END IF;

  -- Create transfer record
  INSERT INTO public.transfers (sender_id, recipient_id, sender_phone, recipient_phone, amount, note)
  VALUES (sender_user_id, recipient_user_id, sender_phone_record, recipient_phone_param, amount_param, note_param)
  RETURNING id INTO transfer_id;

  -- Update balances
  UPDATE public.user_balances 
  SET balance = balance - amount_param, updated_at = now()
  WHERE user_id = sender_user_id;

  UPDATE public.user_balances 
  SET balance = balance + amount_param, updated_at = now()
  WHERE user_id = recipient_user_id;

  RETURN json_build_object(
    'success', true, 
    'transfer_id', transfer_id,
    'recipient_id', recipient_user_id
  );
END;
$$;