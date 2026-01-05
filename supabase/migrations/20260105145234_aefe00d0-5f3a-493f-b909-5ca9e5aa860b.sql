-- إصلاح استخراج الرسوم من الإعدادات
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
BEGIN
  _user_id := auth.uid();
  
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح');
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

  SELECT balance INTO _current_balance
  FROM user_balances
  WHERE user_id = _user_id
  FOR UPDATE NOWAIT;

  IF NOT FOUND THEN
    INSERT INTO user_balances (user_id, balance, created_at, updated_at)
    VALUES (_user_id, 0, now(), now())
    ON CONFLICT (user_id) DO NOTHING;
    _current_balance := 0;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM withdrawals 
    WHERE user_id = _user_id AND status = 'pending'
  ) INTO _pending_exists;

  IF _pending_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'لديك طلب سحب معلق بالفعل');
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO _daily_total
  FROM withdrawals
  WHERE user_id = _user_id 
    AND status IN ('pending', 'approved', 'completed')
    AND created_at >= CURRENT_DATE;

  IF (_daily_total + _amount) > _daily_limit THEN
    RETURN jsonb_build_object('success', false, 'error', 'تجاوزت الحد اليومي للسحب (' || _daily_limit || ' دج)');
  END IF;

  -- ====== جلب إعدادات الرسوم - إصلاح أسماء الحقول ======
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

  IF _current_balance < _total_to_deduct THEN
    RETURN jsonb_build_object('success', false, 'error', 'رصيدك غير كافٍ. المطلوب: ' || _total_to_deduct || ' دج، المتاح: ' || _current_balance || ' دج');
  END IF;

  INSERT INTO withdrawals (
    user_id, amount, net_amount, fee_amount, fee_percentage, fee_fixed,
    withdrawal_method, account_number, account_holder_name, cash_location, notes, status
  ) VALUES (
    _user_id, _amount, _net_amount, _fee_amount, _fee_percentage, _fee_fixed,
    _withdrawal_method, TRIM(_account_number), TRIM(_account_holder_name), TRIM(_cash_location), TRIM(_notes), 'pending'
  ) RETURNING id INTO _withdrawal_id;

  UPDATE user_balances 
  SET balance = balance - _total_to_deduct, updated_at = now()
  WHERE user_id = _user_id AND balance >= _total_to_deduct;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'فشل خصم الرصيد - رصيد غير كافٍ';
  END IF;

  IF _account_number IS NOT NULL AND TRIM(_account_number) != '' THEN
    INSERT INTO user_withdrawal_accounts (user_id, withdrawal_method, account_number)
    VALUES (_user_id, _withdrawal_method, TRIM(_account_number))
    ON CONFLICT (account_number, withdrawal_method) DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'withdrawal_id', _withdrawal_id,
    'amount', _amount,
    'fee_amount', _fee_amount,
    'net_amount', _net_amount,
    'total_deducted', _total_to_deduct
  );

EXCEPTION
  WHEN lock_not_available THEN
    RETURN jsonb_build_object('success', false, 'error', 'يرجى الانتظار والمحاولة مرة أخرى');
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'لديك طلب سحب معلق بالفعل');
  WHEN check_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'رصيدك غير كافٍ');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;