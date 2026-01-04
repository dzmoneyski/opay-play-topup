
-- إصلاح create_withdrawal لاستخدام recalculate_user_balance
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

  -- ✅ إعادة حساب الرصيد الحقيقي أولاً
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

  -- ✅ إعادة حساب الرصيد بعد العملية
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

-- إصلاح process_digital_card_order (هناك نسختان، سنستخدم التوقيع الأحدث)
DROP FUNCTION IF EXISTS public.process_digital_card_order(uuid, numeric, text);
DROP FUNCTION IF EXISTS public.process_digital_card_order(text, numeric, uuid);

CREATE FUNCTION public.process_digital_card_order(
  _card_type_id UUID,
  _amount_usd NUMERIC,
  _account_id TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
  _card_type RECORD;
  _fee_settings RECORD;
  _current_balance NUMERIC;
  _order_id UUID;
  _fee_amount NUMERIC;
  _amount_dzd NUMERIC;
  _total_dzd NUMERIC;
  _is_activated BOOLEAN;
  _default_fee_percentage NUMERIC := 2.0;
  _default_min_fee NUMERIC := 10.0;
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

  -- التحقق من صحة البيانات
  IF _amount_usd IS NULL OR _amount_usd <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'المبلغ غير صحيح');
  END IF;

  IF _account_id IS NULL OR TRIM(_account_id) = '' THEN
    RETURN json_build_object('success', false, 'error', 'يرجى إدخال معرف الحساب');
  END IF;

  -- الحصول على معلومات البطاقة
  SELECT * INTO _card_type
  FROM public.digital_card_types
  WHERE id = _card_type_id AND is_active = true;

  IF _card_type IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'نوع البطاقة غير موجود أو غير نشط');
  END IF;

  -- التحقق من الحدود
  IF _amount_usd < _card_type.min_amount OR _amount_usd > _card_type.max_amount THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'المبلغ يجب أن يكون بين $' || _card_type.min_amount || ' و $' || _card_type.max_amount
    );
  END IF;

  -- حساب المبلغ بالدينار
  _amount_dzd := _amount_usd * _card_type.exchange_rate;

  -- الحصول على إعدادات الرسوم
  SELECT * INTO _fee_settings
  FROM public.digital_card_fee_settings
  ORDER BY created_at DESC
  LIMIT 1;

  -- حساب الرسوم
  IF _fee_settings IS NOT NULL AND _fee_settings.fee_type = 'percentage' THEN
    _fee_amount := (_amount_dzd * COALESCE(_fee_settings.fee_value, _default_fee_percentage) / 100);
  ELSIF _fee_settings IS NOT NULL THEN
    _fee_amount := COALESCE(_fee_settings.fee_value, _default_min_fee);
  ELSE
    _fee_amount := (_amount_dzd * _default_fee_percentage / 100);
  END IF;

  _fee_amount := GREATEST(_fee_amount, COALESCE(_fee_settings.min_fee, _default_min_fee));
  
  IF _fee_settings IS NOT NULL AND _fee_settings.max_fee IS NOT NULL THEN
    _fee_amount := LEAST(_fee_amount, _fee_settings.max_fee);
  END IF;

  IF _fee_amount <= 0 THEN
    _fee_amount := _default_min_fee;
  END IF;

  _total_dzd := _amount_dzd + _fee_amount;

  -- ✅ إعادة حساب الرصيد الحقيقي أولاً
  _current_balance := public.recalculate_user_balance(_user_id);
  
  -- قفل الصف
  PERFORM 1 FROM public.user_balances WHERE user_id = _user_id FOR UPDATE;

  -- التحقق من الرصيد
  IF _current_balance < _total_dzd THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'الرصيد غير كافي. الرصيد المطلوب: ' || _total_dzd || ' دج، رصيدك: ' || GREATEST(_current_balance, 0) || ' دج'
    );
  END IF;

  -- إنشاء الطلب
  INSERT INTO public.digital_card_orders (
    user_id, card_type_id, account_id, amount, amount_usd,
    exchange_rate_used, fee_amount, total_dzd, price_paid, status
  ) VALUES (
    _user_id, _card_type_id, _account_id, _amount_dzd, _amount_usd,
    _card_type.exchange_rate, _fee_amount, _total_dzd, _total_dzd, 'pending'
  ) RETURNING id INTO _order_id;

  -- تسجيل الرسوم
  INSERT INTO public.platform_ledger (
    user_id, transaction_type, transaction_id, original_amount,
    fee_amount, fee_percentage, currency
  ) VALUES (
    _user_id, 'digital_card_fee', _order_id, _amount_dzd,
    _fee_amount, COALESCE(_fee_settings.fee_value, _default_fee_percentage), 'DZD'
  );

  -- ✅ إعادة حساب الرصيد بعد العملية
  PERFORM public.recalculate_user_balance(_user_id);

  RETURN json_build_object(
    'success', true,
    'order_id', _order_id,
    'amount_usd', _amount_usd,
    'amount_dzd', _amount_dzd,
    'fee_amount', _fee_amount,
    'total_dzd', _total_dzd,
    'exchange_rate', _card_type.exchange_rate
  );
END;
$$;
