-- إضافة الحد اليومي لطلبات البطاقات الرقمية
CREATE OR REPLACE FUNCTION public.process_digital_card_order(
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

  -- ✅ التحقق من الحد اليومي (باستخدام المبلغ الإجمالي بالدينار)
  _daily_limit_check := public.check_daily_limit(_user_id, _total_dzd);
  
  IF NOT (_daily_limit_check->>'allowed')::BOOLEAN THEN
    RETURN json_build_object(
      'success', false,
      'error', _daily_limit_check->>'error',
      'daily_limit', (_daily_limit_check->>'daily_limit')::NUMERIC,
      'today_spending', (_daily_limit_check->>'today_spending')::NUMERIC,
      'remaining', (_daily_limit_check->>'remaining')::NUMERIC
    );
  END IF;

  -- ✅ إعادة حساب الرصيد الحقيقي
  _current_balance := public.recalculate_user_balance(_user_id);

  -- قفل صف الرصيد
  PERFORM 1 FROM public.user_balances WHERE user_id = _user_id FOR UPDATE;

  -- التحقق من الرصيد
  IF COALESCE(_current_balance, 0) < _total_dzd THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'الرصيد غير كافي. الرصيد المطلوب: ' || _total_dzd || ' دج، رصيدك: ' || GREATEST(COALESCE(_current_balance, 0), 0) || ' دج'
    );
  END IF;

  -- إنشاء الطلب
  INSERT INTO public.digital_card_orders (
    user_id, card_type_id, account_id, amount, amount_usd,
    exchange_rate_used, fee_amount, total_dzd, price_paid, status
  ) VALUES (
    _user_id, _card_type_id, _account_id, _amount_usd, _amount_usd,
    _card_type.exchange_rate, _fee_amount, _total_dzd, _total_dzd, 'pending'
  ) RETURNING id INTO _order_id;

  -- تسجيل إيرادات المنصة
  INSERT INTO public.platform_ledger (
    transaction_id, transaction_type, user_id, original_amount,
    fee_amount, fee_percentage, currency
  ) VALUES (
    _order_id, 'digital_card_fee', _user_id, _amount_dzd,
    _fee_amount, COALESCE(_fee_settings.fee_value, _default_fee_percentage), 'DZD'
  );

  -- إعادة حساب الرصيد
  PERFORM public.recalculate_user_balance(_user_id);

  RETURN json_build_object(
    'success', true,
    'message', 'تم إرسال الطلب بنجاح',
    'order_id', _order_id,
    'amount_usd', _amount_usd,
    'amount_dzd', _amount_dzd,
    'fee_amount', _fee_amount,
    'total_dzd', _total_dzd
  );
END;
$$;