-- Update process_betting_deposit to deduct immediately
CREATE OR REPLACE FUNCTION public.process_betting_deposit(_platform_id uuid, _player_id text, _amount numeric)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  _user_id UUID;
  _current_balance NUMERIC;
  _transaction_id UUID;
  _fee_config JSONB;
  _fee_info JSONB;
  _total_deducted NUMERIC;
BEGIN
  _user_id := auth.uid();
  
  IF _user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'المستخدم غير مسجل الدخول');
  END IF;

  -- Validate amount
  IF _amount IS NULL OR _amount <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'المبلغ غير صحيح');
  END IF;

  -- Check if account is verified
  IF NOT EXISTS (
    SELECT 1 FROM public.betting_accounts
    WHERE user_id = _user_id 
      AND platform_id = _platform_id 
      AND player_id = _player_id
      AND is_verified = true
  ) THEN
    RETURN json_build_object('success', false, 'error', 'الحساب غير موثق');
  END IF;

  -- Get betting deposit fee configuration
  SELECT setting_value INTO _fee_config
  FROM public.platform_settings
  WHERE setting_key = 'betting_fees';
  
  -- Calculate fees
  _fee_info := public.calculate_fee(_amount, _fee_config);
  _total_deducted := _amount + (_fee_info->>'fee_amount')::NUMERIC;

  -- Recalculate balance to ensure it's fresh
  PERFORM public.recalculate_user_balance(_user_id);

  -- Check balance (user must have enough balance for amount + fees)
  SELECT balance INTO _current_balance
  FROM public.user_balances
  WHERE user_id = _user_id;

  IF COALESCE(_current_balance, 0) < _total_deducted THEN
    RETURN json_build_object('success', false, 'error', 'الرصيد غير كافي (بما في ذلك العمولة)');
  END IF;

  -- Create PENDING transaction
  INSERT INTO public.betting_transactions (
    user_id, platform_id, player_id, transaction_type, amount, status
  ) VALUES (
    _user_id, _platform_id, _player_id, 'deposit', _amount, 'pending'
  ) RETURNING id INTO _transaction_id;

  -- Deduct balance immediately (amount + fees)
  UPDATE public.user_balances
  SET balance = balance - _total_deducted,
      updated_at = now()
  WHERE user_id = _user_id;

  -- Record platform revenue
  PERFORM public.record_platform_revenue('betting_deposit_fee', _transaction_id, _user_id, _fee_info, _amount);

  RETURN json_build_object(
    'success', true,
    'message', 'تم خصم المبلغ وإرسال الطلب للمشرف',
    'transaction_id', _transaction_id,
    'fee_amount', (_fee_info->>'fee_amount')::NUMERIC,
    'total_deducted', _total_deducted
  );
END;
$function$;

-- Update approve_betting_deposit to only change status (no deduction)
CREATE OR REPLACE FUNCTION public.approve_betting_deposit(_transaction_id uuid, _admin_notes text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  _user_id UUID;
  _amount NUMERIC;
BEGIN
  -- Get transaction details
  SELECT user_id, amount INTO _user_id, _amount
  FROM public.betting_transactions
  WHERE id = _transaction_id AND transaction_type = 'deposit' AND status = 'pending';

  IF _user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'المعاملة غير موجودة أو تمت معالجتها مسبقاً');
  END IF;

  -- Update transaction status (amount already deducted)
  UPDATE public.betting_transactions
  SET status = 'completed',
      processed_at = now(),
      admin_notes = _admin_notes
  WHERE id = _transaction_id;

  RETURN json_build_object(
    'success', true,
    'message', 'تمت الموافقة على الإيداع بنجاح'
  );
END;
$function$;

-- Create reject_betting_deposit to refund the amount
CREATE OR REPLACE FUNCTION public.reject_betting_deposit(_transaction_id uuid, _admin_notes text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  _user_id UUID;
  _amount NUMERIC;
  _fee_amount NUMERIC;
BEGIN
  -- Get transaction details
  SELECT user_id, amount INTO _user_id, _amount
  FROM public.betting_transactions
  WHERE id = _transaction_id AND transaction_type = 'deposit' AND status = 'pending';

  IF _user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'المعاملة غير موجودة أو تمت معالجتها مسبقاً');
  END IF;

  -- Get the fee that was charged from platform_ledger
  SELECT fee_amount INTO _fee_amount
  FROM public.platform_ledger
  WHERE transaction_id = _transaction_id AND transaction_type = 'betting_deposit_fee';

  -- Update transaction status
  UPDATE public.betting_transactions
  SET status = 'rejected',
      processed_at = now(),
      admin_notes = _admin_notes
  WHERE id = _transaction_id;

  -- Refund the full amount (amount + fee)
  UPDATE public.user_balances
  SET balance = balance + _amount + COALESCE(_fee_amount, 0),
      updated_at = now()
  WHERE user_id = _user_id;

  -- Remove the fee from platform_ledger (or mark it as refunded)
  DELETE FROM public.platform_ledger
  WHERE transaction_id = _transaction_id AND transaction_type = 'betting_deposit_fee';

  RETURN json_build_object(
    'success', true,
    'message', 'تم رفض الإيداع وإرجاع المبلغ بالكامل',
    'refunded_amount', _amount + COALESCE(_fee_amount, 0)
  );
END;
$function$;