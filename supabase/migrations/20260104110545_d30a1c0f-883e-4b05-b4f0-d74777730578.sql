
-- تحديث دالة create_withdrawal لإضافة حماية ضد الطلبات المتعددة
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
  _fee_percentage numeric := 1.5;
  _fee_fixed numeric := 20;
  _fee_amount numeric;
  _net_amount numeric;
  _total_to_deduct numeric;
  _withdrawal_settings jsonb;
  _method_settings jsonb;
  _recent_pending_count integer;
  _last_withdrawal_time timestamp with time zone;
BEGIN
  -- Get the current user
  _user_id := auth.uid();
  
  IF _user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'غير مصرح');
  END IF;

  -- ========== حماية جديدة: منع الطلبات المتعددة ==========
  
  -- التحقق من وجود طلب سحب معلق خلال الدقيقة الأخيرة
  SELECT COUNT(*), MAX(created_at) INTO _recent_pending_count, _last_withdrawal_time
  FROM withdrawals
  WHERE user_id = _user_id
    AND status = 'pending'
    AND created_at > NOW() - INTERVAL '1 minute';
  
  IF _recent_pending_count > 0 THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'لديك طلب سحب معلق تم إنشاؤه قبل قليل. يرجى الانتظار دقيقة واحدة قبل إنشاء طلب جديد.'
    );
  END IF;

  -- التحقق من عدم وجود أكثر من 3 طلبات معلقة
  SELECT COUNT(*) INTO _recent_pending_count
  FROM withdrawals
  WHERE user_id = _user_id
    AND status = 'pending';
  
  IF _recent_pending_count >= 3 THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'لديك بالفعل 3 طلبات سحب معلقة. يرجى انتظار معالجتها قبل إنشاء طلبات جديدة.'
    );
  END IF;

  -- ========== نهاية الحماية الجديدة ==========

  -- التحقق من إعدادات طرق السحب
  SELECT setting_value INTO _withdrawal_settings
  FROM platform_settings
  WHERE setting_key = 'withdrawal_methods';

  IF _withdrawal_settings IS NOT NULL THEN
    _method_settings := _withdrawal_settings -> _withdrawal_method;
    
    IF _method_settings IS NOT NULL AND (_method_settings ->> 'enabled')::boolean = false THEN
      RETURN json_build_object(
        'success', false, 
        'error', COALESCE(_method_settings ->> 'disabled_reason', 'طريقة السحب هذه معطلة حالياً')
      );
    END IF;
  END IF;

  -- Validate amount
  IF _amount <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'المبلغ يجب أن يكون أكبر من صفر');
  END IF;

  -- حساب الرسوم: 1.5% + 20 د.ج ثابتة
  _fee_amount := ROUND((_amount * _fee_percentage / 100) + _fee_fixed, 2);
  
  -- المبلغ الصافي الذي سيستلمه المستخدم
  _net_amount := _amount - _fee_amount;
  
  -- إجمالي المبلغ الذي سيُخصم من الرصيد (المبلغ الأصلي)
  _total_to_deduct := _amount;

  -- Get current balance with lock
  SELECT balance INTO _current_balance
  FROM user_balances
  WHERE user_id = _user_id
  FOR UPDATE;

  IF _current_balance IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'لم يتم العثور على رصيدك');
  END IF;

  -- Check if user has enough balance
  IF _current_balance < _total_to_deduct THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'رصيدك غير كافٍ. الرصيد الحالي: ' || _current_balance || ' د.ج، المطلوب: ' || _total_to_deduct || ' د.ج'
    );
  END IF;

  -- Create the withdrawal request with fee information
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
    net_amount,
    created_at,
    updated_at
  ) VALUES (
    _user_id,
    _amount,
    _withdrawal_method,
    _account_number,
    _account_holder_name,
    _cash_location,
    _notes,
    'pending',
    _fee_percentage,
    _fee_fixed,
    _fee_amount,
    _net_amount,
    now(),
    now()
  )
  RETURNING id INTO _withdrawal_id;

  -- Deduct amount from balance immediately
  UPDATE user_balances
  SET balance = balance - _total_to_deduct,
      updated_at = now()
  WHERE user_id = _user_id;

  -- تسجيل الإيرادات في platform_ledger
  INSERT INTO platform_ledger (
    user_id,
    transaction_type,
    transaction_id,
    original_amount,
    fee_amount,
    fee_percentage,
    fee_fixed,
    currency,
    created_at
  ) VALUES (
    _user_id,
    'withdrawal',
    _withdrawal_id,
    _amount,
    _fee_amount,
    _fee_percentage,
    _fee_fixed,
    'DZD',
    now()
  );

  RETURN json_build_object(
    'success', true,
    'withdrawal_id', _withdrawal_id,
    'amount', _amount,
    'fee_amount', _fee_amount,
    'net_amount', _net_amount,
    'message', 'تم إنشاء طلب السحب بنجاح. المبلغ الصافي: ' || _net_amount || ' د.ج (بعد خصم رسوم ' || _fee_amount || ' د.ج)'
  );
END;
$$;
