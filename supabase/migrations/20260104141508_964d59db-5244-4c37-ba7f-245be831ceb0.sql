-- Fix create_withdrawal: enforce daily limit + block repeated pending + block duplicate phone/account across users
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
  _existing_user_id uuid;
  _existing_user_phone text;
  _my_phone text;
  _limit_check json;
BEGIN
  _user_id := auth.uid();
  IF _user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'يجب تسجيل الدخول');
  END IF;

  IF _amount <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'المبلغ يجب أن يكون أكبر من صفر');
  END IF;

  IF _withdrawal_method != 'cash' AND (_account_number IS NULL OR _account_number = '') THEN
    RETURN json_build_object('success', false, 'error', 'رقم الحساب مطلوب');
  END IF;

  -- منع تكرار طلبات السحب: طلب واحد (pending) فقط في نفس الوقت
  IF EXISTS (
    SELECT 1 FROM withdrawals
    WHERE user_id = _user_id AND status = 'pending'
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'لديك طلب سحب قيد المراجعة بالفعل. انتظر معالجته قبل إنشاء طلب جديد.'
    );
  END IF;

  -- جلب رقم الهاتف للمستخدم الحالي
  SELECT p.phone INTO _my_phone
  FROM profiles p
  WHERE p.user_id = _user_id
  LIMIT 1;

  -- تحقق من تكرار رقم الهاتف بين المستخدمين (مشبوه)
  IF _my_phone IS NOT NULL AND _my_phone != '' THEN
    SELECT w.user_id, p.phone
      INTO _existing_user_id, _existing_user_phone
    FROM withdrawals w
    JOIN profiles p ON p.user_id = w.user_id
    WHERE p.phone = _my_phone
      AND w.user_id != _user_id
      AND w.status IN ('pending', 'approved', 'completed')
    LIMIT 1;

    IF _existing_user_id IS NOT NULL THEN
      INSERT INTO fraud_attempts (user_id, attempt_type, details, ip_address)
      VALUES (
        _user_id,
        'duplicate_withdrawal_phone',
        json_build_object(
          'phone', _my_phone,
          'withdrawal_method', _withdrawal_method,
          'amount', _amount,
          'original_user_id', _existing_user_id,
          'original_user_phone', _existing_user_phone
        ),
        NULL
      );

      RETURN json_build_object(
        'success', false,
        'error', 'رقم الهاتف مستخدم مسبقاً من حساب آخر. هذا الطلب مشبوه وتم تسجيله.',
        'is_fraud', true
      );
    END IF;
  END IF;

  -- تحقق من تكرار رقم الحساب/المحفظة بين المستخدمين (مشبوه)
  IF _account_number IS NOT NULL AND _account_number != '' THEN
    SELECT w.user_id, p.phone
      INTO _existing_user_id, _existing_user_phone
    FROM withdrawals w
    LEFT JOIN profiles p ON p.user_id = w.user_id
    WHERE w.account_number = _account_number
      AND w.user_id != _user_id
      AND w.status IN ('pending', 'approved', 'completed')
    LIMIT 1;

    IF _existing_user_id IS NOT NULL THEN
      INSERT INTO fraud_attempts (user_id, attempt_type, details, ip_address)
      VALUES (
        _user_id,
        'duplicate_withdrawal_account',
        json_build_object(
          'account_number', _account_number,
          'withdrawal_method', _withdrawal_method,
          'amount', _amount,
          'original_user_id', _existing_user_id,
          'original_user_phone', _existing_user_phone
        ),
        NULL
      );

      RETURN json_build_object(
        'success', false,
        'error', 'رقم الحساب مستخدم مسبقاً من حساب آخر. هذا الطلب مشبوه وتم تسجيله.',
        'is_fraud', true
      );
    END IF;
  END IF;

  -- تطبيق الحد اليومي (10000 دج) عبر الدالة الحالية
  _limit_check := public.check_daily_limit(_user_id, _amount);
  IF COALESCE((_limit_check->>'allowed')::boolean, false) = false THEN
    RETURN json_build_object(
      'success', false,
      'error', COALESCE(_limit_check->>'error', 'لقد وصلت للحد اليومي'),
      'limit', _limit_check
    );
  END IF;

  -- التحقق من الرصيد الحالي
  SELECT COALESCE(balance, 0) INTO _current_balance
  FROM user_balances
  WHERE user_id = _user_id;

  IF _current_balance < _amount THEN
    RETURN json_build_object(
      'success', false,
      'error', 'رصيدك غير كافي. الرصيد الحالي: ' || _current_balance || ' دج'
    );
  END IF;

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
  )
  RETURNING id INTO _withdrawal_id;

  RETURN json_build_object(
    'success', true,
    'withdrawal_id', _withdrawal_id,
    'message', 'تم إنشاء طلب السحب بنجاح'
  );
END;
$$;