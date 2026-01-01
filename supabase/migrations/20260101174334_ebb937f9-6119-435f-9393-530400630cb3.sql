
-- دالة للتحقق من توثيق هوية المستخدم
CREATE OR REPLACE FUNCTION public.check_identity_verified(_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _profile record;
BEGIN
  SELECT is_identity_verified, identity_verification_status, is_account_activated
  INTO _profile
  FROM profiles
  WHERE user_id = _user_id;

  IF _profile IS NULL THEN
    RETURN json_build_object(
      'verified', false,
      'message', 'لم يتم العثور على ملفك الشخصي'
    );
  END IF;

  -- التحقق من تفعيل الحساب
  IF _profile.is_account_activated IS NOT TRUE THEN
    RETURN json_build_object(
      'verified', false,
      'message', 'يجب تفعيل حسابك أولاً قبل استخدام هذه الميزة'
    );
  END IF;

  -- التحقق من توثيق الهوية
  IF _profile.is_identity_verified IS NOT TRUE THEN
    RETURN json_build_object(
      'verified', false,
      'message', 'يجب توثيق هويتك أولاً قبل استخدام هذه الميزة. قم بزيارة صفحة توثيق الهوية'
    );
  END IF;

  RETURN json_build_object('verified', true);
END;
$$;

-- تحديث دالة إنشاء السحب
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
