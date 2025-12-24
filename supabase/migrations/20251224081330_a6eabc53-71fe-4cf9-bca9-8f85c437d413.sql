-- Fix create_withdrawal function to use correct settings key and properly validate balance
CREATE OR REPLACE FUNCTION public.create_withdrawal(
  _amount numeric, 
  _withdrawal_method text, 
  _account_number text DEFAULT NULL::text, 
  _account_holder_name text DEFAULT NULL::text, 
  _cash_location text DEFAULT NULL::text, 
  _notes text DEFAULT NULL::text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _user_id uuid;
  _current_balance numeric;
  _fee_config jsonb;
  _fee_amount numeric;
  _fee_percentage numeric;
  _fee_fixed numeric;
  _min_fee numeric;
  _max_fee numeric;
  _net_amount numeric;
  _total_deduction numeric;
  _withdrawal_id uuid;
  _withdrawal_settings jsonb;
  _method_setting jsonb;
BEGIN
  -- Get current user
  _user_id := auth.uid();
  IF _user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'يجب تسجيل الدخول أولاً');
  END IF;

  -- Check if withdrawal method is enabled
  SELECT setting_value INTO _withdrawal_settings
  FROM platform_settings
  WHERE setting_key = 'withdrawal_methods';

  IF _withdrawal_settings IS NOT NULL THEN
    _method_setting := _withdrawal_settings->_withdrawal_method;
    IF _method_setting IS NOT NULL AND (_method_setting->>'enabled')::boolean = false THEN
      RETURN json_build_object(
        'success', false, 
        'error', COALESCE(_method_setting->>'disabled_reason', 'طريقة السحب هذه غير متاحة حالياً')
      );
    END IF;
  END IF;

  -- Validate amount
  IF _amount <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'المبلغ يجب أن يكون أكبر من صفر');
  END IF;

  -- Get fee configuration (use 'withdrawal_fees' key)
  SELECT setting_value INTO _fee_config
  FROM platform_settings
  WHERE setting_key = 'withdrawal_fees';

  -- Calculate fee
  IF _fee_config IS NOT NULL AND (_fee_config->>'enabled')::boolean = true THEN
    _fee_percentage := COALESCE((_fee_config->>'percentage')::numeric, 0);
    _fee_fixed := COALESCE((_fee_config->>'fixed_amount')::numeric, 0);
    _min_fee := COALESCE((_fee_config->>'min_fee')::numeric, 0);
    _max_fee := COALESCE((_fee_config->>'max_fee')::numeric, 999999);
    
    -- Calculate: percentage + fixed
    _fee_amount := (_amount * _fee_percentage / 100) + _fee_fixed;
    
    -- Apply min/max limits
    _fee_amount := GREATEST(_fee_amount, _min_fee);
    _fee_amount := LEAST(_fee_amount, _max_fee);
  ELSE
    _fee_percentage := 0;
    _fee_fixed := 0;
    _fee_amount := 0;
  END IF;

  _net_amount := _amount - _fee_amount;
  _total_deduction := _amount; -- User pays the full amount, fee is deducted from it

  -- Get current balance
  SELECT balance INTO _current_balance
  FROM user_balances
  WHERE user_id = _user_id;

  -- Check if balance covers the amount
  IF _current_balance IS NULL OR _current_balance < _total_deduction THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'رصيدك غير كافٍ. رصيدك الحالي: ' || COALESCE(_current_balance, 0) || ' دج'
    );
  END IF;

  -- Deduct from balance
  UPDATE user_balances
  SET balance = balance - _total_deduction,
      updated_at = now()
  WHERE user_id = _user_id;

  -- Create withdrawal record
  INSERT INTO withdrawals (
    user_id,
    amount,
    withdrawal_method,
    account_number,
    account_holder_name,
    cash_location,
    notes,
    fee_amount,
    fee_percentage,
    fee_fixed,
    net_amount,
    status
  ) VALUES (
    _user_id,
    _amount,
    _withdrawal_method,
    _account_number,
    _account_holder_name,
    _cash_location,
    _notes,
    _fee_amount,
    _fee_percentage,
    _fee_fixed,
    _net_amount,
    'pending'
  )
  RETURNING id INTO _withdrawal_id;

  -- Record platform revenue
  INSERT INTO platform_ledger (
    transaction_id,
    transaction_type,
    user_id,
    original_amount,
    fee_amount,
    fee_percentage,
    fee_fixed,
    currency
  ) VALUES (
    _withdrawal_id,
    'withdrawal_fee',
    _user_id,
    _amount,
    _fee_amount,
    _fee_percentage,
    _fee_fixed,
    'DZD'
  );

  RETURN json_build_object(
    'success', true,
    'withdrawal_id', _withdrawal_id,
    'amount', _amount,
    'fee_amount', _fee_amount,
    'net_amount', _net_amount
  );
END;
$function$;