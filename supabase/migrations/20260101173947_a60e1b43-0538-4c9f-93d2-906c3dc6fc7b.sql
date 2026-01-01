
-- دالة لحساب إجمالي الإنفاق اليومي للمستخدم
CREATE OR REPLACE FUNCTION public.get_user_daily_spending(_user_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _total_spending numeric := 0;
  _withdrawals numeric := 0;
  _digital_cards numeric := 0;
  _game_topups numeric := 0;
  _betting_deposits numeric := 0;
BEGIN
  -- حساب السحوبات اليومية (pending + approved)
  SELECT COALESCE(SUM(amount), 0) INTO _withdrawals
  FROM withdrawals
  WHERE user_id = _user_id
    AND status IN ('pending', 'approved')
    AND created_at >= CURRENT_DATE
    AND created_at < CURRENT_DATE + INTERVAL '1 day';

  -- حساب طلبات البطاقات الرقمية اليومية
  SELECT COALESCE(SUM(total_dzd), 0) INTO _digital_cards
  FROM digital_card_orders
  WHERE user_id = _user_id
    AND status IN ('pending', 'approved')
    AND created_at >= CURRENT_DATE
    AND created_at < CURRENT_DATE + INTERVAL '1 day';

  -- حساب طلبات شحن الألعاب اليومية
  SELECT COALESCE(SUM(amount), 0) INTO _game_topups
  FROM game_topup_orders
  WHERE user_id = _user_id
    AND status IN ('pending', 'approved')
    AND created_at >= CURRENT_DATE
    AND created_at < CURRENT_DATE + INTERVAL '1 day';

  -- حساب إيداعات المراهنات اليومية
  SELECT COALESCE(SUM(amount), 0) INTO _betting_deposits
  FROM betting_transactions
  WHERE user_id = _user_id
    AND transaction_type = 'deposit'
    AND status IN ('pending', 'approved')
    AND created_at >= CURRENT_DATE
    AND created_at < CURRENT_DATE + INTERVAL '1 day';

  _total_spending := _withdrawals + _digital_cards + _game_topups + _betting_deposits;
  
  RETURN _total_spending;
END;
$$;

-- دالة للتحقق من الحد اليومي
CREATE OR REPLACE FUNCTION public.check_daily_limit(_user_id uuid, _amount numeric)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _daily_limit numeric := 20000;
  _current_spending numeric;
  _remaining numeric;
BEGIN
  _current_spending := get_user_daily_spending(_user_id);
  _remaining := _daily_limit - _current_spending;
  
  IF (_current_spending + _amount) > _daily_limit THEN
    RETURN json_build_object(
      'allowed', false,
      'current_spending', _current_spending,
      'remaining', GREATEST(_remaining, 0),
      'daily_limit', _daily_limit,
      'message', 'تجاوزت الحد اليومي للعمليات (20,000 دج). المتبقي لك اليوم: ' || GREATEST(_remaining, 0)::text || ' دج'
    );
  END IF;
  
  RETURN json_build_object(
    'allowed', true,
    'current_spending', _current_spending,
    'remaining', _remaining - _amount,
    'daily_limit', _daily_limit
  );
END;
$$;

-- تحديث دالة إنشاء السحب لاستخدام الحد الموحد
CREATE OR REPLACE FUNCTION public.create_withdrawal(
  _amount numeric,
  _withdrawal_method text,
  _account_number text DEFAULT NULL,
  _account_holder_name text DEFAULT NULL,
  _cash_location text DEFAULT NULL,
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
  _withdrawal_id uuid;
  _limit_check json;
BEGIN
  _user_id := auth.uid();
  
  IF _user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'المستخدم غير مسجل الدخول');
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

  -- التحقق من الرصيد
  SELECT balance INTO _current_balance
  FROM user_balances
  WHERE user_id = _user_id
  FOR UPDATE;

  IF _current_balance IS NULL THEN
    _current_balance := 0;
  END IF;

  IF _current_balance < _amount THEN
    RETURN json_build_object('success', false, 'error', 'الرصيد غير كافي');
  END IF;

  -- خصم الرصيد
  UPDATE user_balances
  SET balance = balance - _amount,
      updated_at = now()
  WHERE user_id = _user_id;

  -- إنشاء طلب السحب
  INSERT INTO withdrawals (
    user_id,
    amount,
    withdrawal_method,
    account_number,
    account_holder_name,
    cash_location,
    notes,
    status
  ) VALUES (
    _user_id,
    _amount,
    _withdrawal_method,
    _account_number,
    _account_holder_name,
    _cash_location,
    _notes,
    'pending'
  ) RETURNING id INTO _withdrawal_id;

  RETURN json_build_object(
    'success', true, 
    'withdrawal_id', _withdrawal_id,
    'remaining_daily_limit', (_limit_check->>'remaining')::numeric
  );
END;
$$;

-- تحديث دالة طلب البطاقات الرقمية
CREATE OR REPLACE FUNCTION public.process_digital_card_order(
  _card_type_id uuid,
  _amount_usd numeric,
  _account_id text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
  _card_type record;
  _fee_settings record;
  _fee_amount numeric;
  _total_dzd numeric;
  _current_balance numeric;
  _order_id uuid;
  _limit_check json;
BEGIN
  _user_id := auth.uid();
  
  IF _user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'المستخدم غير مسجل الدخول');
  END IF;

  -- جلب معلومات نوع البطاقة
  SELECT * INTO _card_type
  FROM digital_card_types
  WHERE id = _card_type_id AND is_active = true;

  IF _card_type IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'نوع البطاقة غير موجود أو غير متاح');
  END IF;

  -- التحقق من الحدود
  IF _amount_usd < _card_type.min_amount OR _amount_usd > _card_type.max_amount THEN
    RETURN json_build_object('success', false, 'error', 'المبلغ خارج الحدود المسموحة');
  END IF;

  -- جلب إعدادات الرسوم
  SELECT * INTO _fee_settings FROM digital_card_fee_settings LIMIT 1;
  
  IF _fee_settings IS NULL THEN
    _fee_amount := 0;
  ELSIF _fee_settings.fee_type = 'percentage' THEN
    _fee_amount := (_amount_usd * _card_type.exchange_rate) * (_fee_settings.fee_value / 100);
    IF _fee_settings.max_fee IS NOT NULL AND _fee_amount > _fee_settings.max_fee THEN
      _fee_amount := _fee_settings.max_fee;
    END IF;
    IF _fee_amount < _fee_settings.min_fee THEN
      _fee_amount := _fee_settings.min_fee;
    END IF;
  ELSE
    _fee_amount := _fee_settings.fee_value;
  END IF;

  _total_dzd := (_amount_usd * _card_type.exchange_rate) + _fee_amount;

  -- التحقق من الحد اليومي الموحد
  _limit_check := check_daily_limit(_user_id, _total_dzd);
  
  IF NOT (_limit_check->>'allowed')::boolean THEN
    RETURN json_build_object(
      'success', false, 
      'error', _limit_check->>'message',
      'daily_spending', (_limit_check->>'current_spending')::numeric,
      'remaining', (_limit_check->>'remaining')::numeric
    );
  END IF;

  -- التحقق من الرصيد
  SELECT balance INTO _current_balance
  FROM user_balances
  WHERE user_id = _user_id
  FOR UPDATE;

  IF _current_balance IS NULL OR _current_balance < _total_dzd THEN
    RETURN json_build_object('success', false, 'error', 'الرصيد غير كافي');
  END IF;

  -- خصم الرصيد
  UPDATE user_balances
  SET balance = balance - _total_dzd,
      updated_at = now()
  WHERE user_id = _user_id;

  -- إنشاء الطلب
  INSERT INTO digital_card_orders (
    user_id,
    card_type_id,
    amount,
    amount_usd,
    price_paid,
    fee_amount,
    total_dzd,
    exchange_rate_used,
    account_id,
    status
  ) VALUES (
    _user_id,
    _card_type_id,
    _amount_usd,
    _amount_usd,
    _total_dzd,
    _fee_amount,
    _total_dzd,
    _card_type.exchange_rate,
    _account_id,
    'pending'
  ) RETURNING id INTO _order_id;

  RETURN json_build_object(
    'success', true, 
    'order_id', _order_id,
    'total_dzd', _total_dzd,
    'remaining_daily_limit', (_limit_check->>'remaining')::numeric
  );
END;
$$;

-- تحديث دالة شحن الألعاب
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
BEGIN
  _user_id := auth.uid();
  
  IF _user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'المستخدم غير مسجل الدخول');
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

  -- التحقق من الرصيد
  SELECT balance INTO _current_balance
  FROM user_balances
  WHERE user_id = _user_id
  FOR UPDATE;

  IF _current_balance IS NULL OR _current_balance < _amount THEN
    RETURN json_build_object('success', false, 'error', 'الرصيد غير كافي');
  END IF;

  -- خصم الرصيد
  UPDATE user_balances
  SET balance = balance - _amount,
      updated_at = now()
  WHERE user_id = _user_id;

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

  RETURN json_build_object(
    'success', true, 
    'order_id', _order_id,
    'remaining_daily_limit', (_limit_check->>'remaining')::numeric
  );
END;
$$;

-- تحديث دالة إيداع المراهنات
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
BEGIN
  _user_id := auth.uid();
  
  IF _user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'المستخدم غير مسجل الدخول');
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

  -- التحقق من الرصيد
  SELECT balance INTO _current_balance
  FROM user_balances
  WHERE user_id = _user_id
  FOR UPDATE;

  IF _current_balance IS NULL OR _current_balance < _amount THEN
    RETURN json_build_object('success', false, 'error', 'الرصيد غير كافي');
  END IF;

  -- خصم الرصيد
  UPDATE user_balances
  SET balance = balance - _amount,
      updated_at = now()
  WHERE user_id = _user_id;

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

  RETURN json_build_object(
    'success', true, 
    'transaction_id', _transaction_id,
    'remaining_daily_limit', (_limit_check->>'remaining')::numeric
  );
END;
$$;
