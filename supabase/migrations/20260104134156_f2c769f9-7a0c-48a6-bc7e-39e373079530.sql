-- إضافة التحقق من الحد اليومي في دالة السحب
CREATE OR REPLACE FUNCTION public.create_withdrawal(
  _amount NUMERIC,
  _withdrawal_method TEXT,
  _account_number TEXT DEFAULT NULL,
  _account_holder_name TEXT DEFAULT NULL,
  _cash_location TEXT DEFAULT NULL,
  _notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
  _current_balance NUMERIC;
  _fee_config JSONB;
  _fee_info JSONB;
  _fee_amount NUMERIC;
  _net_amount NUMERIC;
  _total_deducted NUMERIC;
  _withdrawal_id UUID;
  _is_activated BOOLEAN;
  _methods_config JSONB;
  _method_settings JSONB;
  _method_enabled BOOLEAN;
  _disabled_reason TEXT;
  _daily_limit_check JSONB;
BEGIN
  _user_id := auth.uid();
  
  IF _user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'المستخدم غير مسجل الدخول');
  END IF;

  -- التحقق من تفعيل الحساب
  SELECT is_account_activated INTO _is_activated
  FROM public.profiles
  WHERE user_id = _user_id;
  
  IF NOT COALESCE(_is_activated, false) THEN
    RETURN json_build_object('success', false, 'error', 'يجب تفعيل حسابك أولاً');
  END IF;

  -- التحقق من تفعيل طريقة السحب
  SELECT setting_value INTO _methods_config
  FROM public.platform_settings
  WHERE setting_key = 'withdrawal_methods';
  
  IF _methods_config IS NOT NULL THEN
    _method_settings := _methods_config -> _withdrawal_method;
    
    IF _method_settings IS NOT NULL THEN
      _method_enabled := COALESCE((_method_settings->>'enabled')::BOOLEAN, true);
      _disabled_reason := _method_settings->>'disabled_reason';
      
      IF NOT _method_enabled THEN
        RETURN json_build_object(
          'success', false, 
          'error', 'طريقة السحب هذه معطلة حالياً. ' || COALESCE(_disabled_reason, '')
        );
      END IF;
    END IF;
  END IF;

  -- التحقق من صحة المبلغ
  IF _amount IS NULL OR _amount < 500 THEN
    RETURN json_build_object('success', false, 'error', 'الحد الأدنى للسحب 500 دج');
  END IF;

  IF _amount > 200000 THEN
    RETURN json_build_object('success', false, 'error', 'الحد الأقصى للسحب 200,000 دج');
  END IF;

  -- ✅ التحقق من الحد اليومي
  _daily_limit_check := public.check_daily_limit(_user_id, _amount);
  
  IF NOT (_daily_limit_check->>'allowed')::BOOLEAN THEN
    RETURN json_build_object(
      'success', false,
      'error', _daily_limit_check->>'error',
      'daily_limit', (_daily_limit_check->>'daily_limit')::NUMERIC,
      'today_spending', (_daily_limit_check->>'today_spending')::NUMERIC,
      'remaining', (_daily_limit_check->>'remaining')::NUMERIC
    );
  END IF;

  -- التحقق من طريقة السحب النقدي
  IF _withdrawal_method = 'cash' AND (_cash_location IS NULL OR _cash_location = '') THEN
    RETURN json_build_object('success', false, 'error', 'يجب تحديد مكان الاستلام للسحب النقدي');
  END IF;

  -- الحصول على إعدادات الرسوم
  SELECT setting_value INTO _fee_config
  FROM public.platform_settings
  WHERE setting_key = 'withdrawal_fees';

  -- حساب الرسوم
  _fee_info := public.calculate_fee(_amount, _fee_config);
  _fee_amount := COALESCE((_fee_info->>'fee_amount')::NUMERIC, 0);
  
  _net_amount := _amount;
  _total_deducted := _amount + _fee_amount;

  -- إعادة حساب الرصيد الحقيقي أولاً
  _current_balance := public.recalculate_user_balance(_user_id);
  
  -- قفل الصف
  PERFORM 1 FROM public.user_balances WHERE user_id = _user_id FOR UPDATE;

  IF _current_balance < _total_deducted THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'الرصيد غير كافي. تحتاج ' || _total_deducted || ' دج (المبلغ ' || _amount || ' + الرسوم ' || _fee_amount || ' دج). رصيدك: ' || GREATEST(_current_balance, 0) || ' دج'
    );
  END IF;

  -- إنشاء طلب السحب
  INSERT INTO public.withdrawals (
    user_id, amount, withdrawal_method, account_number, account_holder_name,
    cash_location, notes, fee_amount, net_amount,
    fee_percentage, fee_fixed, status
  ) VALUES (
    _user_id, _amount, _withdrawal_method, _account_number, _account_holder_name,
    _cash_location, _notes, _fee_amount, _net_amount,
    COALESCE((_fee_info->>'fee_percentage')::NUMERIC, 0),
    COALESCE((_fee_info->>'fee_fixed')::NUMERIC, 0),
    'pending'
  ) RETURNING id INTO _withdrawal_id;

  -- تسجيل الرسوم
  INSERT INTO public.platform_ledger (
    transaction_id, transaction_type, user_id, original_amount,
    fee_amount, fee_percentage, fee_fixed, currency
  ) VALUES (
    _withdrawal_id, 'withdrawal_fee', _user_id, _amount,
    _fee_amount,
    COALESCE((_fee_info->>'fee_percentage')::NUMERIC, 0),
    COALESCE((_fee_info->>'fee_fixed')::NUMERIC, 0),
    'DZD'
  );

  -- إعادة حساب الرصيد بعد العملية
  PERFORM public.recalculate_user_balance(_user_id);

  RETURN json_build_object(
    'success', true,
    'withdrawal_id', _withdrawal_id,
    'amount', _amount,
    'fee_amount', _fee_amount,
    'total_deducted', _total_deducted,
    'message', 'تم إرسال طلب السحب بنجاح'
  );
END;
$$;