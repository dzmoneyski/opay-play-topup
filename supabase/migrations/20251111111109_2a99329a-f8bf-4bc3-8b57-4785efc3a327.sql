-- Fix merchant_recharge_customer logic to properly handle full amount deduction and commission return

CREATE OR REPLACE FUNCTION merchant_recharge_customer(
  _customer_phone TEXT,
  _amount NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _merchant_id UUID;
  _merchant RECORD;
  _customer_user_id UUID;
  _commission NUMERIC;
BEGIN
  -- Get merchant info
  SELECT * INTO _merchant
  FROM public.merchants
  WHERE user_id = auth.uid() AND is_active = true;

  IF _merchant IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Merchant account not found or inactive');
  END IF;

  -- Validate amount
  IF _amount <= 0 OR _amount > 100000 THEN
    RETURN json_build_object('success', false, 'error', 'Invalid amount');
  END IF;

  -- Calculate commission
  _commission := _amount * _merchant.commission_rate / 100;

  -- Check if merchant has enough balance to pay full amount
  IF _merchant.balance < _amount THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient merchant balance');
  END IF;

  -- Find customer by phone
  SELECT user_id INTO _customer_user_id
  FROM public.profiles
  WHERE phone = _customer_phone;

  IF _customer_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Customer not found');
  END IF;

  -- Deduct full amount from merchant balance
  UPDATE public.merchants
  SET balance = balance - _amount,
      updated_at = now()
  WHERE id = _merchant.id;

  -- Add commission back to merchant balance as profit
  UPDATE public.merchants
  SET balance = balance + _commission,
      total_earnings = total_earnings + _commission,
      updated_at = now()
  WHERE id = _merchant.id;

  -- Add to customer balance (as approved deposit)
  INSERT INTO public.deposits (user_id, amount, payment_method, status, admin_notes, processed_at)
  VALUES (_customer_user_id, _amount, 'merchant_recharge', 'approved', 'Recharged by merchant: ' || _merchant.merchant_code, now());

  -- Recalculate customer balance
  PERFORM recalculate_user_balance(_customer_user_id);

  -- Record transaction
  INSERT INTO public.merchant_transactions (
    merchant_id, transaction_type, customer_phone, customer_user_id,
    amount, commission_amount, status
  ) VALUES (
    _merchant.id, 'recharge', _customer_phone, _customer_user_id,
    _amount, _commission, 'completed'
  );

  RETURN json_build_object(
    'success', true,
    'amount', _amount,
    'commission', _commission,
    'cost', _amount - _commission
  );
END;
$$;