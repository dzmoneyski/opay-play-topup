-- Create function to deduct balance for AliExpress orders
CREATE OR REPLACE FUNCTION public.deduct_balance(
  _user_id uuid,
  _amount numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance numeric;
BEGIN
  -- Get current balance
  SELECT balance INTO current_balance
  FROM user_balances
  WHERE user_id = _user_id
  FOR UPDATE;

  -- Check if user has balance record
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User balance not found';
  END IF;

  -- Check if sufficient balance
  IF current_balance < _amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  -- Deduct balance
  UPDATE user_balances
  SET balance = balance - _amount,
      updated_at = now()
  WHERE user_id = _user_id;
END;
$$;