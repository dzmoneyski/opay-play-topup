
-- تحديث دالة process_digital_card_order لإضافة:
-- 1. Rate Limiting (5 طلبات في الساعة)
-- 2. الحد اليومي المشترك (10,000 دج) مع السحوبات

CREATE OR REPLACE FUNCTION public.process_digital_card_order(
  _card_type_id UUID,
  _account_id TEXT,
  _amount_usd NUMERIC
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
  _daily_limit NUMERIC := 10000.0;
  _today_spending NUMERIC;
  _can_proceed BOOLEAN;
BEGIN
  _user_id := auth.uid();
  
  IF _user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'المستخدم غير مسجل الدخول');
  END IF;

  -- ========== Rate Limiting (5 طلبات في الساعة) ==========
  IF NOT public.check_rate_limit(_user_id, 'digital_card_order', 5, 60) THEN
    RETURN json_build_object('success', false, 'error', 'لقد تجاوزت الحد المسموح به من الطلبات. يرجى المحاولة بعد ساعة');
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

  -- التحقق من طول account_id (3-100 حرف)
  IF LENGTH(TRIM(_account_id)) < 3 OR LENGTH(TRIM(_account_id)) > 100 THEN
    RETURN json_build_object('success', false, 'error', 'معرف الحساب يجب أن يكون بين 3 و 100 حرف');
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

  -- ========== التحقق من الحد اليومي المشترك (10,000 دج) ==========
  -- يشمل: السحوبات المعلقة/المكتملة + طلبات البطاقات الرقمية المعلقة/المكتملة
  SELECT COALESCE(SUM(spending), 0) INTO _today_spending
  FROM (
    -- السحوبات اليوم
    SELECT amount as spending
    FROM public.withdrawals
    WHERE user_id = _user_id
    AND status IN ('pending', 'completed')
    AND created_at >= CURRENT_DATE
    
    UNION ALL
    
    -- طلبات البطاقات الرقمية اليوم
    SELECT total_dzd as spending
    FROM public.digital_card_orders
    WHERE user_id = _user_id
    AND status IN ('pending', 'completed')
    AND created_at >= CURRENT_DATE
  ) combined_spending;

  -- التحقق من أن الطلب الجديد لن يتجاوز الحد اليومي
  IF (_today_spending + _total_dzd) > _daily_limit THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'لقد تجاوزت الحد اليومي المسموح به (' || _daily_limit || ' دج). إجمالي إنفاقك اليوم: ' || _today_spending || ' دج. المتبقي: ' || GREATEST(_daily_limit - _today_spending, 0) || ' دج'
    );
  END IF;

  -- قفل صف الرصيد
  SELECT balance INTO _current_balance
  FROM public.user_balances
  WHERE user_id = _user_id
  FOR UPDATE;

  IF _current_balance IS NULL THEN
    INSERT INTO public.user_balances (user_id, balance)
    VALUES (_user_id, 0)
    ON CONFLICT (user_id) DO NOTHING;
    
    SELECT balance INTO _current_balance
    FROM public.user_balances
    WHERE user_id = _user_id;
  END IF;

  -- التحقق من الرصيد
  IF COALESCE(_current_balance, 0) < _total_dzd THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'الرصيد غير كافي. الرصيد المطلوب: ' || _total_dzd || ' دج، رصيدك: ' || COALESCE(_current_balance, 0) || ' دج'
    );
  END IF;

  -- إنشاء الطلب
  INSERT INTO public.digital_card_orders (
    user_id, 
    card_type_id, 
    account_id,
    amount, 
    amount_usd,
    exchange_rate_used,
    fee_amount,
    total_dzd,
    price_paid,
    status
  ) VALUES (
    _user_id, 
    _card_type_id, 
    TRIM(_account_id),
    _amount_dzd, 
    _amount_usd,
    _card_type.exchange_rate,
    _fee_amount,
    _total_dzd,
    _total_dzd,
    'pending'
  )
  RETURNING id INTO _order_id;

  -- خصم الرصيد
  UPDATE public.user_balances
  SET balance = balance - _total_dzd,
      updated_at = now()
  WHERE user_id = _user_id;

  -- تسجيل رسوم المنصة
  INSERT INTO public.platform_ledger (
    user_id,
    transaction_type,
    transaction_id,
    original_amount,
    fee_amount,
    fee_percentage,
    currency
  ) VALUES (
    _user_id,
    'digital_card_fee',
    _order_id,
    _amount_dzd,
    _fee_amount,
    CASE WHEN _fee_settings IS NOT NULL AND _fee_settings.fee_type = 'percentage' 
         THEN _fee_settings.fee_value 
         ELSE _default_fee_percentage 
    END,
    'DZD'
  );

  RETURN json_build_object(
    'success', true,
    'message', 'تم إرسال طلبك بنجاح وسيتم معالجته قريباً',
    'order_id', _order_id,
    'amount_usd', _amount_usd,
    'amount_dzd', _amount_dzd,
    'fee_amount', _fee_amount,
    'total_dzd', _total_dzd,
    'daily_remaining', _daily_limit - _today_spending - _total_dzd
  );
END;
$$;
