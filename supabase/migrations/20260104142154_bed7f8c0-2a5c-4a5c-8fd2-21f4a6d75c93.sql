
-- تحديث دالة السحب لتسجيل محاولات تجاوز الحد اليومي كاحتيال
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
  _daily_limit numeric := 10000;
  _today_spent numeric;
  _pending_count integer;
  _existing_phone_user uuid;
  _existing_account_user uuid;
  _user_phone text;
BEGIN
  -- الحصول على معرف المستخدم الحالي
  _user_id := auth.uid();
  
  IF _user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'يجب تسجيل الدخول أولاً');
  END IF;

  -- الحصول على رقم هاتف المستخدم
  SELECT phone INTO _user_phone FROM profiles WHERE user_id = _user_id;

  -- التحقق من عدم وجود طلب سحب معلق
  SELECT COUNT(*) INTO _pending_count
  FROM withdrawals
  WHERE user_id = _user_id AND status = 'pending';
  
  IF _pending_count > 0 THEN
    RETURN json_build_object('success', false, 'error', 'لديك طلب سحب معلق بالفعل. انتظر حتى تتم معالجته.');
  END IF;

  -- حساب المبلغ المسحوب اليوم (pending + approved + completed)
  SELECT COALESCE(SUM(amount), 0) INTO _today_spent
  FROM withdrawals
  WHERE user_id = _user_id 
    AND created_at >= CURRENT_DATE
    AND status IN ('pending', 'approved', 'completed');

  -- التحقق من الحد اليومي - إذا تجاوز يسجل كمحاولة احتيال
  IF (_today_spent + _amount) > _daily_limit THEN
    -- تسجيل محاولة الاحتيال
    INSERT INTO fraud_attempts (user_id, attempt_type, details)
    VALUES (
      _user_id,
      'daily_limit_exceeded',
      jsonb_build_object(
        'attempted_amount', _amount,
        'today_spent', _today_spent,
        'daily_limit', _daily_limit,
        'total_would_be', _today_spent + _amount,
        'exceeded_by', (_today_spent + _amount) - _daily_limit,
        'withdrawal_method', _withdrawal_method,
        'account_number', _account_number,
        'user_phone', _user_phone,
        'timestamp', now()
      )
    );
    
    RETURN json_build_object(
      'success', false, 
      'error', 'تجاوزت الحد اليومي للسحب (' || _daily_limit || ' دج). المتبقي لك اليوم: ' || GREATEST(0, _daily_limit - _today_spent) || ' دج',
      'fraud_logged', true
    );
  END IF;

  -- التحقق من تكرار رقم الهاتف (للسحب النقدي)
  IF _withdrawal_method = 'cash' AND _user_phone IS NOT NULL THEN
    SELECT DISTINCT user_id INTO _existing_phone_user
    FROM withdrawals w
    JOIN profiles p ON p.user_id = w.user_id
    WHERE p.phone = _user_phone
      AND w.user_id != _user_id
      AND w.status IN ('pending', 'approved', 'completed')
    LIMIT 1;
    
    IF _existing_phone_user IS NOT NULL THEN
      INSERT INTO fraud_attempts (user_id, attempt_type, details)
      VALUES (
        _user_id,
        'duplicate_phone_withdrawal',
        jsonb_build_object(
          'phone', _user_phone,
          'original_user_id', _existing_phone_user,
          'attempted_amount', _amount,
          'withdrawal_method', _withdrawal_method
        )
      );
      
      RETURN json_build_object('success', false, 'error', 'تم رفض الطلب - رقم الهاتف مستخدم من حساب آخر');
    END IF;
  END IF;

  -- التحقق من تكرار رقم الحساب/المحفظة
  IF _account_number IS NOT NULL AND _account_number != '' THEN
    SELECT user_id INTO _existing_account_user
    FROM withdrawals
    WHERE account_number = _account_number
      AND user_id != _user_id
      AND status IN ('pending', 'approved', 'completed')
    LIMIT 1;
    
    IF _existing_account_user IS NOT NULL THEN
      INSERT INTO fraud_attempts (user_id, attempt_type, details)
      VALUES (
        _user_id,
        'duplicate_account_withdrawal',
        jsonb_build_object(
          'account_number', _account_number,
          'original_user_id', _existing_account_user,
          'attempted_amount', _amount,
          'withdrawal_method', _withdrawal_method
        )
      );
      
      RETURN json_build_object('success', false, 'error', 'تم رفض الطلب - رقم الحساب/المحفظة مستخدم من حساب آخر');
    END IF;
  END IF;

  -- التحقق من الرصيد
  SELECT COALESCE(balance, 0) INTO _current_balance
  FROM user_balances
  WHERE user_id = _user_id;
  
  IF _current_balance IS NULL OR _current_balance < _amount THEN
    RETURN json_build_object('success', false, 'error', 'رصيدك غير كافٍ لإتمام هذا السحب');
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

  -- خصم المبلغ من الرصيد
  UPDATE user_balances
  SET balance = balance - _amount,
      updated_at = now()
  WHERE user_id = _user_id;

  RETURN json_build_object(
    'success', true,
    'withdrawal_id', _withdrawal_id,
    'message', 'تم إنشاء طلب السحب بنجاح'
  );
END;
$$;
