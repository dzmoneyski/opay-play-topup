
-- Fix create_withdrawal function to check if withdrawal method is enabled
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

  -- ===== التحقق من تفعيل طريقة السحب =====
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
  -- ===== نهاية التحقق =====

  -- التحقق من صحة المبلغ
  IF _amount IS NULL OR _amount < 500 THEN
    RETURN json_build_object('success', false, 'error', 'الحد الأدنى للسحب 500 دج');
  END IF;

  IF _amount > 200000 THEN
    RETURN json_build_object('success', false, 'error', 'الحد الأقصى للسحب 200,000 دج');
  END IF;

  -- التحقق من طريقة السحب النقدي
  IF _withdrawal_method = 'cash' AND (_cash_location IS NULL OR _cash_location = '') THEN
    RAISE EXCEPTION 'Cash pickup location is required for cash withdrawals';
  END IF;

  -- الحصول على إعدادات الرسوم
  SELECT setting_value INTO _fee_config
  FROM public.platform_settings
  WHERE setting_key = 'withdrawal_fees';

  -- حساب الرسوم
  _fee_info := public.calculate_fee(_amount, _fee_config);
  _fee_amount := COALESCE((_fee_info->>'fee_amount')::NUMERIC, 0);
  
  -- net_amount = المبلغ الذي سيستلمه المستخدم (المبلغ المطلوب كاملاً)
  _net_amount := _amount;
  
  -- إجمالي الخصم من الرصيد = المبلغ + الرسوم
  _total_deducted := _amount + _fee_amount;

  -- قفل صف الرصيد لمنع السحب المتزامن
  SELECT balance INTO _current_balance
  FROM public.user_balances
  WHERE user_id = _user_id
  FOR UPDATE;

  IF COALESCE(_current_balance, 0) < _total_deducted THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'الرصيد غير كافي. تحتاج ' || _total_deducted || ' دج (المبلغ ' || _amount || ' + الرسوم ' || _fee_amount || ' دج). رصيدك: ' || COALESCE(_current_balance, 0) || ' دج'
    );
  END IF;

  -- إنشاء طلب السحب
  INSERT INTO public.withdrawals (
    user_id,
    amount,
    withdrawal_method,
    account_number,
    account_holder_name,
    cash_location,
    notes,
    fee_amount,
    net_amount,
    fee_percentage,
    fee_fixed,
    status
  ) VALUES (
    _user_id,
    _amount,
    _withdrawal_method,
    _account_number,
    _account_holder_name,
    _cash_location,
    _notes,
    _fee_amount,
    _net_amount,
    COALESCE((_fee_info->>'fee_percentage')::NUMERIC, 0),
    COALESCE((_fee_info->>'fee_fixed')::NUMERIC, 0),
    'pending'
  ) RETURNING id INTO _withdrawal_id;

  -- تسجيل رسوم السحب في platform_ledger فوراً
  INSERT INTO public.platform_ledger (
    transaction_id,
    transaction_type,
    user_id,
    original_amount,
    fee_amount,
    fee_percentage,
    fee_fixed,
    currency
  ) VALUES (
    _withdrawal_id,
    'withdrawal_fee',
    _user_id,
    _amount,
    _fee_amount,
    COALESCE((_fee_info->>'fee_percentage')::NUMERIC, 0),
    COALESCE((_fee_info->>'fee_fixed')::NUMERIC, 0),
    'DZD'
  );

  -- خصم المبلغ + الرسوم من الرصيد فوراً
  UPDATE public.user_balances
  SET balance = balance - _total_deducted,
      updated_at = now()
  WHERE user_id = _user_id;

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
