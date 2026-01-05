
CREATE OR REPLACE FUNCTION public.create_withdrawal(
  _amount numeric,
  _withdrawal_method text,
  _account_number text DEFAULT NULL,
  _account_holder_name text DEFAULT NULL,
  _cash_location text DEFAULT NULL,
  _notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
  _current_balance numeric;
  _withdrawal_id uuid;
  _fee_percentage numeric := 0;
  _fee_fixed numeric := 0;
  _fee_amount numeric := 0;
  _net_amount numeric;
  _total_to_deduct numeric;
  _pending_exists boolean;
  _daily_total numeric;
  _daily_limit numeric := 10000;
  _min_amount numeric := 500;
  _max_amount numeric := 10000;
  _existing_account_user uuid;
  _valid_methods text[] := ARRAY['opay', 'barid_bank', 'ccp', 'albaraka', 'badr', 'cash'];
  _rows_updated integer;
  _is_activated boolean;
BEGIN
  _user_id := auth.uid();

  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح');
  END IF;

  -- ✅ التحقق من تفعيل الحساب أولاً
  SELECT COALESCE(is_account_activated, false) INTO _is_activated
  FROM profiles
  WHERE user_id = _user_id;

  IF NOT _is_activated THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'حسابك غير مفعّل. يرجى تفعيل حسابك أولاً قبل السحب.',
      'error_code', 'ACCOUNT_NOT_ACTIVATED'
    );
  END IF;

  IF _withdrawal_method IS NULL OR NOT (_withdrawal_method = ANY(_valid_methods)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'طريقة سحب غير صالحة');
  END IF;

  _amount := ROUND(_amount, 2);

  IF _amount < _min_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'الحد الأدنى للسحب هو ' || _min_amount || ' دج');
  END IF;

  IF _amount > _max_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'الحد الأقصى للسحب هو ' || _max_amount || ' دج');
  END IF;

  IF _amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'المبلغ يجب أن يكون أكبر من صفر');
  END IF;

  IF _withdrawal_method IN ('opay', 'barid_bank', 'ccp', 'albaraka', 'badr') THEN
    IF _account_number IS NULL OR TRIM(_account_number) = '' THEN
      RETURN jsonb_build_object('success', false, 'error', 'رقم الحساب مطلوب');
    END IF;
    IF _account_holder_name IS NULL OR TRIM(_account_holder_name) = '' THEN
      RETURN jsonb_build_object('success', false, 'error', 'اسم صاحب الحساب مطلوب');
    END IF;
  END IF;

  IF _withdrawal_method = 'cash' THEN
    IF _cash_location IS NULL OR TRIM(_cash_location) = '' THEN
      RETURN jsonb_build_object('success', false, 'error', 'موقع استلام الكاش مطلوب');
    END IF;
    IF (_amount::integer % 2) != 0 THEN
      RETURN jsonb_build_object('success', false, 'error', 'يجب أن يكون المبلغ عددًا زوجيًا للسحب النقدي');
    END IF;
  END IF;

  -- Check if account number is used by another user
  IF _account_number IS NOT NULL AND TRIM(_account_number) != '' THEN
    SELECT user_id INTO _existing_account_user
    FROM user_withdrawal_accounts
    WHERE account_number = TRIM(_account_number)
      AND withdrawal_method = _withdrawal_method
      AND user_id != _user_id
    LIMIT 1;

    IF _existing_account_user IS NOT NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'رقم الحساب/المحفظة مستخدم في حساب آخر');
    END IF;

    SELECT user_id INTO _existing_account_user
    FROM withdrawals
    WHERE account_number = TRIM(_account_number)
      AND withdrawal_method = _withdrawal_method
      AND user_id != _user_id
      AND status IN ('pending', 'approved', 'completed')
    LIMIT 1;

    IF _existing_account_user IS NOT NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'رقم الحساب/المحفظة مستخدم في حساب آخر');
    END IF;
  END IF;

  -- ✅ احسب الرسوم أولاً قبل أي تحقق
  SELECT
    COALESCE((setting_value->>'percentage')::numeric, (setting_value->>'fee_percentage')::numeric, 0),
    COALESCE((setting_value->>'fixed_amount')::numeric, (setting_value->>'fee_fixed')::numeric, (setting_value->>'fixed')::numeric, 0)
  INTO _fee_percentage, _fee_fixed
  FROM platform_settings
  WHERE setting_key = 'withdrawal_fees_' || _withdrawal_method;

  IF NOT FOUND THEN
    SELECT
      COALESCE((setting_value->>'percentage')::numeric, (setting_value->>'fee_percentage')::numeric, 0),
      COALESCE((setting_value->>'fixed_amount')::numeric, (setting_value->>'fee_fixed')::numeric, (setting_value->>'fixed')::numeric, 0)
    INTO _fee_percentage, _fee_fixed
    FROM platform_settings
    WHERE setting_key = 'withdrawal_fees';
  END IF;

  _fee_amount := ROUND((_amount * _fee_percentage / 100) + _fee_fixed, 2);
  _net_amount := _amount;
  _total_to_deduct := _amount + _fee_amount;

  -- ✅ Force a balance recalculation right before locking and deduction
  PERFORM public.recalculate_user_balance(_user_id);

  -- Get current balance with row lock
  SELECT balance INTO _current_balance
  FROM user_balances
  WHERE user_id = _user_id
  FOR UPDATE;

  IF _current_balance IS NULL THEN
    _current_balance := 0;
  END IF;

  -- ✅ التحقق من الرصيد مع إرجاع تفاصيل دقيقة
  IF _current_balance < _total_to_deduct THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'رصيدك غير كافٍ',
      'error_code', 'INSUFFICIENT_BALANCE',
      'details', jsonb_build_object(
        'current_balance', _current_balance,
        'requested_amount', _amount,
        'fee_amount', _fee_amount,
        'total_required', _total_to_deduct
      )
    );
  END IF;

  -- Check for pending withdrawals
  SELECT EXISTS (
    SELECT 1 FROM withdrawals
    WHERE user_id = _user_id AND status = 'pending'
  ) INTO _pending_exists;

  IF _pending_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'لديك طلب سحب معلق. انتظر حتى تتم معالجته.');
  END IF;

  -- Check daily limit
  SELECT COALESCE(SUM(amount), 0) INTO _daily_total
  FROM withdrawals
  WHERE user_id = _user_id
    AND DATE(created_at) = CURRENT_DATE
    AND status IN ('pending', 'approved', 'completed');

  IF (_daily_total + _amount) > _daily_limit THEN
    RETURN jsonb_build_object('success', false, 'error', 'تجاوزت الحد اليومي للسحب (' || _daily_limit || ' دج)');
  END IF;

  -- Create withdrawal request
  INSERT INTO withdrawals (
    user_id,
    amount,
    withdrawal_method,
    account_number,
    account_holder_name,
    cash_location,
    notes,
    status,
    fee_percentage,
    fee_fixed,
    fee_amount,
    net_amount
  ) VALUES (
    _user_id,
    _amount,
    _withdrawal_method,
    NULLIF(TRIM(_account_number), ''),
    NULLIF(TRIM(_account_holder_name), ''),
    NULLIF(TRIM(_cash_location), ''),
    NULLIF(TRIM(_notes), ''),
    'pending',
    _fee_percentage,
    _fee_fixed,
    _fee_amount,
    _net_amount
  )
  RETURNING id INTO _withdrawal_id;

  -- Deduct balance immediately
  UPDATE user_balances
  SET balance = balance - _total_to_deduct,
      updated_at = now()
  WHERE user_id = _user_id
  RETURNING 1 INTO _rows_updated;

  IF _rows_updated IS NULL OR _rows_updated = 0 THEN
    RAISE EXCEPTION 'Failed to update user balance';
  END IF;

  -- Save account for future use
  IF _account_number IS NOT NULL AND TRIM(_account_number) != '' THEN
    INSERT INTO user_withdrawal_accounts (user_id, withdrawal_method, account_number)
    VALUES (_user_id, _withdrawal_method, TRIM(_account_number))
    ON CONFLICT (user_id, withdrawal_method) DO UPDATE
    SET account_number = EXCLUDED.account_number;
  END IF;

  -- Record platform revenue
  INSERT INTO platform_ledger (
    user_id,
    transaction_type,
    original_amount,
    fee_percentage,
    fee_fixed,
    fee_amount,
    transaction_id
  ) VALUES (
    _user_id,
    'withdrawal',
    _amount,
    _fee_percentage,
    _fee_fixed,
    _fee_amount,
    _withdrawal_id::text
  );

  RETURN jsonb_build_object(
    'success', true,
    'withdrawal_id', _withdrawal_id,
    'amount', _amount,
    'fee_amount', _fee_amount,
    'total_deducted', _total_to_deduct,
    'new_balance', _current_balance - _total_to_deduct
  );
END;
$$;
