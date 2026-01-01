-- تحديث دالة إنشاء السحب لتتحقق من إعدادات تعطيل طرق السحب
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
  _method_settings jsonb;
  _method_enabled boolean;
  _disabled_reason text;
BEGIN
  _user_id := auth.uid();
  
  IF _user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'المستخدم غير مسجل الدخول');
  END IF;

  -- التحقق من أن طريقة السحب مفعّلة
  SELECT setting_value INTO _method_settings
  FROM platform_settings
  WHERE setting_key = 'withdrawal_methods';

  IF _method_settings IS NOT NULL THEN
    -- استخراج إعدادات الطريقة المحددة
    _method_enabled := COALESCE((_method_settings->_withdrawal_method->>'enabled')::boolean, true);
    _disabled_reason := COALESCE(_method_settings->_withdrawal_method->>'disabled_reason', 'هذه الطريقة غير متاحة حالياً');
    
    IF NOT _method_enabled THEN
      RETURN json_build_object(
        'success', false, 
        'error', 'طريقة السحب غير متاحة: ' || COALESCE(_disabled_reason, 'معطلة مؤقتاً')
      );
    END IF;
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