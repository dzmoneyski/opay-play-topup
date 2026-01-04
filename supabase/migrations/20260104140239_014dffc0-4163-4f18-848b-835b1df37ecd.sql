
-- تحديث دالة السحب لمنع استخدام نفس رقم الحساب من مستخدمين مختلفين
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
BEGIN
  -- الحصول على معرف المستخدم الحالي
  _user_id := auth.uid();
  
  IF _user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'يجب تسجيل الدخول');
  END IF;

  -- التحقق من أن المبلغ موجب
  IF _amount <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'المبلغ يجب أن يكون أكبر من صفر');
  END IF;

  -- التحقق من رقم الحساب إذا كان مطلوباً (ليس سحب نقدي)
  IF _withdrawal_method != 'cash' AND (_account_number IS NULL OR _account_number = '') THEN
    RETURN json_build_object('success', false, 'error', 'رقم الحساب مطلوب');
  END IF;

  -- *** تحقق جديد: منع استخدام نفس رقم الحساب من مستخدم آخر ***
  IF _account_number IS NOT NULL AND _account_number != '' THEN
    SELECT w.user_id, p.phone INTO _existing_user_id, _existing_user_phone
    FROM withdrawals w
    LEFT JOIN profiles p ON p.user_id = w.user_id
    WHERE w.account_number = _account_number
      AND w.user_id != _user_id
      AND w.status IN ('pending', 'approved', 'completed')
    LIMIT 1;

    IF _existing_user_id IS NOT NULL THEN
      -- تسجيل محاولة احتيال
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

  -- الحصول على الرصيد الحالي
  SELECT COALESCE(balance, 0) INTO _current_balance
  FROM user_balances
  WHERE user_id = _user_id;

  -- التحقق من الرصيد الكافي
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
