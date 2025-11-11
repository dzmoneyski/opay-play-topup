-- Fix merchant_transfer_from_user_balance to properly deduct from user balance using withdrawal

CREATE OR REPLACE FUNCTION public.merchant_transfer_from_user_balance(
  _amount NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _merchant_id UUID;
  _user_balance NUMERIC;
BEGIN
  -- Validate amount
  IF _amount <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'المبلغ غير صالح');
  END IF;

  -- Get merchant
  SELECT id INTO _merchant_id
  FROM public.merchants
  WHERE user_id = auth.uid() AND is_active = true;

  IF _merchant_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'حساب التاجر غير موجود');
  END IF;

  -- Ensure latest user balance
  PERFORM public.recalculate_user_balance(auth.uid());

  -- Check user balance
  SELECT balance INTO _user_balance
  FROM public.user_balances
  WHERE user_id = auth.uid();

  IF _user_balance IS NULL OR _user_balance < _amount THEN
    RETURN json_build_object('success', false, 'error', 'رصيد غير كافي في حسابك الشخصي');
  END IF;

  -- Create a withdrawal record to deduct from user balance
  INSERT INTO public.withdrawals (
    user_id, amount, withdrawal_method, status, 
    admin_notes, processed_at
  ) VALUES (
    auth.uid(), _amount, 'merchant_transfer', 'approved',
    'تحويل إلى رصيد التاجر', now()
  );

  -- Recalculate user balance after withdrawal
  PERFORM public.recalculate_user_balance(auth.uid());

  -- Add to merchant balance
  UPDATE public.merchants
  SET balance = balance + _amount,
      updated_at = now()
  WHERE id = _merchant_id;

  -- Record merchant transaction
  INSERT INTO public.merchant_transactions (
    merchant_id, transaction_type, amount, status, notes
  ) VALUES (
    _merchant_id, 'balance_transfer', _amount, 'completed', 
    'تحويل من الرصيد الشخصي إلى رصيد التاجر'
  );

  RETURN json_build_object(
    'success', true,
    'amount', _amount,
    'new_merchant_balance', (SELECT balance FROM public.merchants WHERE id = _merchant_id)
  );
END;
$$;