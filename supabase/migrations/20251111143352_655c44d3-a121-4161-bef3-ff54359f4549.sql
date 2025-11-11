-- Fix race condition in game topup orders by adding row-level locking
CREATE OR REPLACE FUNCTION public.process_game_topup_order(
  _platform_id UUID,
  _package_id UUID,
  _player_id TEXT,
  _amount NUMERIC,
  _notes TEXT DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  _user_id UUID;
  _current_balance NUMERIC;
  _order_id UUID;
  _fee_config JSONB;
  _fee_info JSONB;
  _total_deducted NUMERIC;
  _is_activated BOOLEAN;
BEGIN
  _user_id := auth.uid();
  
  IF _user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'المستخدم غير مسجل الدخول');
  END IF;

  -- Validate amount
  IF _amount IS NULL OR _amount <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'المبلغ غير صحيح');
  END IF;

  -- Check if account is activated
  SELECT is_account_activated INTO _is_activated
  FROM public.profiles
  WHERE user_id = _user_id;
  
  IF NOT COALESCE(_is_activated, false) THEN
    RETURN json_build_object('success', false, 'error', 'يجب تفعيل حسابك أولاً');
  END IF;

  -- Get game top-up fee configuration
  SELECT setting_value INTO _fee_config
  FROM public.platform_settings
  WHERE setting_key = 'game_topup_fees';
  
  -- If no fee config exists, use default (no fees)
  IF _fee_config IS NULL THEN
    _fee_config := jsonb_build_object('enabled', false);
  END IF;
  
  -- Calculate fees
  _fee_info := public.calculate_fee(_amount, _fee_config);
  _total_deducted := _amount + (_fee_info->>'fee_amount')::NUMERIC;

  -- CRITICAL FIX: Lock the user's balance row to prevent race conditions
  -- This ensures that only one transaction can process at a time for this user
  SELECT balance INTO _current_balance
  FROM public.user_balances
  WHERE user_id = _user_id
  FOR UPDATE;  -- This locks the row until the transaction completes

  -- If no balance record exists, create one
  IF _current_balance IS NULL THEN
    INSERT INTO public.user_balances (user_id, balance)
    VALUES (_user_id, 0)
    ON CONFLICT (user_id) DO NOTHING;
    _current_balance := 0;
  END IF;

  -- Check balance (user must have enough balance for amount + fees)
  IF COALESCE(_current_balance, 0) < _total_deducted THEN
    RETURN json_build_object(
      'success', false, 
      'error', format('الرصيد غير كافي. رصيدك الحالي: %s دج، المبلغ المطلوب (مع العمولة): %s دج', 
        COALESCE(_current_balance, 0), 
        _total_deducted
      )
    );
  END IF;

  -- Create PENDING order
  INSERT INTO public.game_topup_orders (
    user_id, platform_id, package_id, player_id, amount, status, notes
  ) VALUES (
    _user_id, _platform_id, _package_id, _player_id, _amount, 'pending', _notes
  ) RETURNING id INTO _order_id;

  -- Deduct balance immediately (amount + fees)
  UPDATE public.user_balances
  SET balance = balance - _total_deducted,
      updated_at = now()
  WHERE user_id = _user_id;

  -- Record platform revenue
  PERFORM public.record_platform_revenue('game_topup_fee', _order_id, _user_id, _fee_info, _amount);

  RETURN json_build_object(
    'success', true,
    'message', 'تم خصم المبلغ وإرسال الطلب للمشرف',
    'order_id', _order_id,
    'fee_amount', (_fee_info->>'fee_amount')::NUMERIC,
    'total_deducted', _total_deducted,
    'remaining_balance', _current_balance - _total_deducted
  );
END;
$function$;