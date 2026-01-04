
-- تحديث دالة create_withdrawal لتقليل الحد اليومي إلى 10,000 د.ج
CREATE OR REPLACE FUNCTION public.create_withdrawal(_amount numeric, _withdrawal_method text, _account_number text DEFAULT NULL::text, _account_holder_name text DEFAULT NULL::text, _cash_location text DEFAULT NULL::text, _notes text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  _daily_limit numeric := 10000; -- الحد اليومي الجديد 10,000 د.ج
  _today_total numeric;
BEGIN
  -- Get the current user
  _user_id := auth.uid();
  
  IF _user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'غير مصرح');
  END IF;

  -- ========== التحقق من الحد اليومي ==========
  SELECT COALESCE(SUM(amount), 0) INTO _today_total
  FROM withdrawals
  WHERE user_id = _user_id
    AND created_at >= CURRENT_DATE
    AND created_at < CURRENT_DATE + INTERVAL '1 day'
    AND status NOT IN ('rejected', 'cancelled');

  IF _today_total + _amount > _daily_limit THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'عذراً، لقد وصلت للحد الأقصى اليومي للسحب (' || _daily_limit || ' دج). المتبقي لك اليوم: ' || GREATEST(0, _daily_limit - _today_total) || ' دج',
      'error_type', 'daily_limit_exceeded',
      'daily_limit', _daily_limit,
      'today_total', _today_total,
      'remaining', GREATEST(0, _daily_limit - _today_total)
    );
  END IF;

  -- ========== حماية: منع الطلبات المتعددة ==========
  
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

  -- ========== التحقق من إعدادات طرق السحب ==========
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
$function$;

-- تحديث دالة check_daily_limit لتستخدم 10,000 د.ج
CREATE OR REPLACE FUNCTION public.check_daily_limit(_user_id uuid, _amount numeric)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _daily_limit numeric := 10000; -- الحد اليومي الجديد
  _today_spending numeric;
  _remaining numeric;
BEGIN
  -- حساب إجمالي الإنفاق اليومي
  _today_spending := public.get_user_daily_spending(_user_id);
  
  _remaining := GREATEST(0, _daily_limit - _today_spending);
  
  IF _today_spending + _amount > _daily_limit THEN
    RETURN json_build_object(
      'allowed', false,
      'daily_limit', _daily_limit,
      'today_spending', _today_spending,
      'remaining', _remaining,
      'error', 'لقد وصلت للحد اليومي (' || _daily_limit || ' دج). المتبقي: ' || _remaining || ' دج'
    );
  END IF;
  
  RETURN json_build_object(
    'allowed', true,
    'daily_limit', _daily_limit,
    'today_spending', _today_spending,
    'remaining', _remaining
  );
END;
$function$;
