
-- Update approve_merchant_request to transfer user balance to merchant balance
CREATE OR REPLACE FUNCTION approve_merchant_request(
  _request_id UUID,
  _admin_id UUID,
  _commission_rate NUMERIC DEFAULT 2.00
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _request RECORD;
  _merchant_id UUID;
  _merchant_code TEXT;
  _user_balance NUMERIC := 0;
BEGIN
  -- Check admin permission
  IF NOT has_role(_admin_id, 'admin') THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Get request details
  SELECT * INTO _request
  FROM public.merchant_requests
  WHERE id = _request_id AND status = 'pending';

  IF _request IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Request not found or already processed');
  END IF;

  -- Get user's current balance
  SELECT COALESCE(balance, 0) INTO _user_balance
  FROM public.user_balances
  WHERE user_id = _request.user_id;

  -- Generate unique merchant code
  _merchant_code := 'M' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');

  -- Create merchant with user's current balance
  INSERT INTO public.merchants (
    user_id, business_name, business_type, phone, address, 
    merchant_code, commission_rate, balance
  ) VALUES (
    _request.user_id, _request.business_name, _request.business_type,
    _request.phone, _request.address, _merchant_code, _commission_rate, _user_balance
  ) RETURNING id INTO _merchant_id;

  -- Update request status
  UPDATE public.merchant_requests
  SET status = 'approved',
      reviewed_by = _admin_id,
      reviewed_at = now()
  WHERE id = _request_id;

  RETURN json_build_object(
    'success', true,
    'merchant_id', _merchant_id,
    'merchant_code', _merchant_code,
    'initial_balance', _user_balance
  );
END;
$$;

-- Create function to transfer balance from user account to merchant account
CREATE OR REPLACE FUNCTION merchant_transfer_from_user_balance(
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

  -- Check user balance
  SELECT balance INTO _user_balance
  FROM public.user_balances
  WHERE user_id = auth.uid();

  IF _user_balance IS NULL OR _user_balance < _amount THEN
    RETURN json_build_object('success', false, 'error', 'رصيد غير كافي في حسابك الشخصي');
  END IF;

  -- Deduct from user balance
  UPDATE public.user_balances
  SET balance = balance - _amount,
      updated_at = now()
  WHERE user_id = auth.uid();

  -- Add to merchant balance
  UPDATE public.merchants
  SET balance = balance + _amount,
      updated_at = now()
  WHERE id = _merchant_id;

  -- Record transaction
  INSERT INTO public.merchant_transactions (
    merchant_id, transaction_type, amount, status, notes
  ) VALUES (
    _merchant_id, 'balance_transfer', _amount, 'completed', 
    'تحويل من الرصيد الشخصي إلى رصيد التاجر'
  );

  RETURN json_build_object(
    'success', true,
    'amount', _amount,
    'new_merchant_balance', (SELECT balance FROM merchants WHERE id = _merchant_id)
  );
END;
$$;
