-- Create gift_cards table for plastic card system
CREATE TABLE public.gift_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  card_code TEXT NOT NULL UNIQUE,
  amount DECIMAL(10,2) NOT NULL,
  is_used BOOLEAN NOT NULL DEFAULT FALSE,
  used_by UUID REFERENCES auth.users(id),
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.gift_cards ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view and use gift cards" 
ON public.gift_cards 
FOR SELECT 
USING (true);

CREATE POLICY "Users can update gift cards when using them" 
ON public.gift_cards 
FOR UPDATE 
USING (NOT is_used OR used_by = auth.uid());

-- Create function to redeem gift card
CREATE OR REPLACE FUNCTION public.redeem_gift_card(_card_code TEXT, _user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _card_record RECORD;
  _card_amount DECIMAL(10,2);
BEGIN
  -- Check if user exists and is authenticated
  IF _user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not authenticated');
  END IF;

  -- Find the gift card
  SELECT * INTO _card_record 
  FROM public.gift_cards 
  WHERE card_code = _card_code;
  
  IF _card_record IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'رقم البطاقة غير صحيح');
  END IF;
  
  -- Check if card is already used
  IF _card_record.is_used THEN
    RETURN json_build_object('success', false, 'error', 'تم استخدام هذه البطاقة مسبقاً');
  END IF;
  
  _card_amount := _card_record.amount;
  
  -- Mark card as used
  UPDATE public.gift_cards 
  SET is_used = TRUE,
      used_by = _user_id,
      used_at = now(),
      updated_at = now()
  WHERE card_code = _card_code;
  
  -- Create or update user balance
  INSERT INTO public.user_balances (user_id, balance)
  VALUES (_user_id, _card_amount)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    balance = user_balances.balance + _card_amount,
    updated_at = now();
    
  -- Recalculate balance to ensure accuracy
  PERFORM public.recalculate_user_balance(_user_id);
  
  RETURN json_build_object(
    'success', true, 
    'message', 'تم تعمير حسابك بنجاح',
    'amount', _card_amount
  );
END;
$$;

-- Create trigger for updated_at
CREATE TRIGGER update_gift_cards_updated_at
BEFORE UPDATE ON public.gift_cards
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some sample gift cards for testing
INSERT INTO public.gift_cards (card_code, amount) VALUES 
('1000-2024-0001', 1000.00),
('2000-2024-0001', 2000.00),
('1000-2024-0002', 1000.00),
('2000-2024-0002', 2000.00),
('5000-2024-0001', 5000.00);