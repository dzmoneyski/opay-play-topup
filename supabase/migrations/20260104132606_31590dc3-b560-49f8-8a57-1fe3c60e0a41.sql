
-- إصلاح جميع الدوال لتستخدم recalculate_user_balance للحصول على الرصيد الحقيقي

-- 1. إصلاح process_betting_deposit
CREATE OR REPLACE FUNCTION public.process_betting_deposit(
  _platform_id uuid,
  _player_id text,
  _amount numeric
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
  _current_balance numeric;
  _transaction_id uuid;
  _limit_check json;
  _identity_check json;
BEGIN
  _user_id := auth.uid();
  
  IF _user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'المستخدم غير مسجل الدخول');
  END IF;

  -- التحقق من توثيق الهوية
  _identity_check := check_identity_verified(_user_id);
  IF NOT (_identity_check->>'verified')::boolean THEN
    RETURN json_build_object('success', false, 'error', _identity_check->>'message');
  END IF;

  -- التحقق من الحد اليومي الموحد
  _limit_check := check_daily_limit(_user_id, _amount);
  
  IF NOT (_limit_check->>'allowed')::boolean THEN
    RETURN json_build_object(
      'success', false, 
      'error', _limit_check->>'message',
      'daily_spending', (_limit_check->>'current_spending')::numeric,
      'remaining', (_limit_check->>'remaining')::numeric
    );
  END IF;

  -- ✅ إعادة حساب الرصيد الحقيقي أولاً
  _current_balance := public.recalculate_user_balance(_user_id);
  
  -- قفل الصف
  PERFORM 1 FROM user_balances WHERE user_id = _user_id FOR UPDATE;

  IF _current_balance IS NULL OR _current_balance < _amount THEN
    RETURN json_build_object('success', false, 'error', 'الرصيد غير كافي. رصيدك: ' || GREATEST(COALESCE(_current_balance, 0), 0)::TEXT || ' دج');
  END IF;

  -- إنشاء المعاملة
  INSERT INTO betting_transactions (
    user_id,
    platform_id,
    player_id,
    amount,
    transaction_type,
    status
  ) VALUES (
    _user_id,
    _platform_id,
    _player_id,
    _amount,
    'deposit',
    'pending'
  ) RETURNING id INTO _transaction_id;

  -- إعادة حساب الرصيد بعد العملية
  PERFORM public.recalculate_user_balance(_user_id);

  RETURN json_build_object(
    'success', true, 
    'transaction_id', _transaction_id,
    'remaining_daily_limit', (_limit_check->>'remaining')::numeric
  );
END;
$$;

-- 2. إصلاح process_game_topup_order
CREATE OR REPLACE FUNCTION public.process_game_topup_order(
  _platform_id uuid,
  _package_id uuid,
  _player_id text,
  _amount numeric,
  _notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
  _current_balance numeric;
  _order_id uuid;
  _limit_check json;
  _identity_check json;
BEGIN
  _user_id := auth.uid();
  
  IF _user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'المستخدم غير مسجل الدخول');
  END IF;

  -- التحقق من توثيق الهوية
  _identity_check := check_identity_verified(_user_id);
  IF NOT (_identity_check->>'verified')::boolean THEN
    RETURN json_build_object('success', false, 'error', _identity_check->>'message');
  END IF;

  -- التحقق من الحد اليومي الموحد
  _limit_check := check_daily_limit(_user_id, _amount);
  
  IF NOT (_limit_check->>'allowed')::boolean THEN
    RETURN json_build_object(
      'success', false, 
      'error', _limit_check->>'message',
      'daily_spending', (_limit_check->>'current_spending')::numeric,
      'remaining', (_limit_check->>'remaining')::numeric
    );
  END IF;

  -- ✅ إعادة حساب الرصيد الحقيقي أولاً
  _current_balance := public.recalculate_user_balance(_user_id);
  
  -- قفل الصف
  PERFORM 1 FROM user_balances WHERE user_id = _user_id FOR UPDATE;

  IF _current_balance IS NULL OR _current_balance < _amount THEN
    RETURN json_build_object('success', false, 'error', 'الرصيد غير كافي. رصيدك: ' || GREATEST(COALESCE(_current_balance, 0), 0)::TEXT || ' دج');
  END IF;

  -- إنشاء الطلب
  INSERT INTO game_topup_orders (
    user_id,
    platform_id,
    package_id,
    player_id,
    amount,
    notes,
    status
  ) VALUES (
    _user_id,
    _platform_id,
    _package_id,
    _player_id,
    _amount,
    _notes,
    'pending'
  ) RETURNING id INTO _order_id;

  -- إعادة حساب الرصيد بعد العملية
  PERFORM public.recalculate_user_balance(_user_id);

  RETURN json_build_object(
    'success', true, 
    'order_id', _order_id,
    'remaining_daily_limit', (_limit_check->>'remaining')::numeric
  );
END;
$$;

-- 3. إصلاح process_phone_topup_order
CREATE OR REPLACE FUNCTION public.process_phone_topup_order(
  _operator_id uuid,
  _phone_number text,
  _amount numeric,
  _notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _balance numeric;
  _operator record;
  _order_id uuid;
  _fee numeric;
  _total_amount numeric;
BEGIN
  -- Check if user is authenticated
  IF _user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'يجب تسجيل الدخول');
  END IF;
  
  -- Get operator info
  SELECT * INTO _operator FROM phone_operators WHERE id = _operator_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'شركة الاتصال غير موجودة');
  END IF;
  
  -- Validate amount
  IF _amount < _operator.min_amount THEN
    RETURN json_build_object('success', false, 'error', 'الحد الأدنى للشحن هو ' || _operator.min_amount || ' د.ج');
  END IF;
  
  IF _amount > _operator.max_amount THEN
    RETURN json_build_object('success', false, 'error', 'الحد الأقصى للشحن هو ' || _operator.max_amount || ' د.ج');
  END IF;
  
  -- Calculate fee based on amount
  IF _amount < 1000 THEN
    _fee := 10;
  ELSE
    _fee := 50;
  END IF;
  
  -- Calculate total (amount + fee)
  _total_amount := _amount + _fee;
  
  -- ✅ إعادة حساب الرصيد الحقيقي أولاً
  _balance := public.recalculate_user_balance(_user_id);
  
  -- قفل الصف
  PERFORM 1 FROM user_balances WHERE user_id = _user_id FOR UPDATE;
  
  IF _balance IS NULL OR _balance < _total_amount THEN
    RETURN json_build_object('success', false, 'error', 'رصيدك غير كافي. المطلوب: ' || _total_amount || ' د.ج (المبلغ: ' || _amount || ' + الرسوم: ' || _fee || ')');
  END IF;
  
  -- Create order
  INSERT INTO phone_topup_orders (user_id, operator_id, phone_number, amount, notes)
  VALUES (_user_id, _operator_id, _phone_number, _amount, _notes)
  RETURNING id INTO _order_id;
  
  -- Record platform revenue
  INSERT INTO platform_ledger (user_id, transaction_type, original_amount, fee_amount, fee_fixed, transaction_id)
  VALUES (_user_id, 'phone_topup', _amount, _fee, _fee, _order_id);
  
  -- إعادة حساب الرصيد بعد العملية
  PERFORM public.recalculate_user_balance(_user_id);
  
  RETURN json_build_object(
    'success', true,
    'order_id', _order_id,
    'message', 'تم إرسال طلب الشحن بنجاح (الرسوم: ' || _fee || ' د.ج)'
  );
END;
$$;
