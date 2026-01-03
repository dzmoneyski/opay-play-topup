-- إنشاء دالة شحن الزبون من رصيد التاجر الشخصي
-- التاجر يستخدم رصيده الشخصي لشحن الزبائن
-- العمولة يأخذها نقداً من الزبون (لا تُخصم من الرصيد)

CREATE OR REPLACE FUNCTION public.merchant_topup_customer(
  _customer_phone TEXT,
  _amount NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _merchant_user_id UUID;
  _merchant RECORD;
  _customer_user_id UUID;
  _current_balance NUMERIC;
  _commission_rate NUMERIC;
  _commission_amount NUMERIC;
  _total_from_customer NUMERIC;
  _transaction_id UUID;
  _cleaned_phone TEXT;
BEGIN
  _merchant_user_id := auth.uid();
  
  IF _merchant_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'المستخدم غير مسجل الدخول');
  END IF;

  -- التحقق من أن المستخدم تاجر نشط
  SELECT * INTO _merchant
  FROM public.merchants
  WHERE user_id = _merchant_user_id AND is_active = true;

  IF _merchant IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'أنت لست تاجراً أو حسابك غير نشط');
  END IF;

  -- التحقق من المبلغ
  IF _amount IS NULL OR _amount < 100 THEN
    RETURN json_build_object('success', false, 'error', 'الحد الأدنى للشحن 100 دج');
  END IF;

  IF _amount > 50000 THEN
    RETURN json_build_object('success', false, 'error', 'الحد الأقصى للشحن 50,000 دج');
  END IF;

  -- تنظيف رقم الهاتف
  _cleaned_phone := REGEXP_REPLACE(_customer_phone, '[^0-9+]', '', 'g');
  
  IF _cleaned_phone IS NULL OR LENGTH(_cleaned_phone) < 10 THEN
    RETURN json_build_object('success', false, 'error', 'رقم الهاتف غير صحيح');
  END IF;

  -- البحث عن الزبون
  SELECT user_id INTO _customer_user_id
  FROM public.profiles
  WHERE phone = _cleaned_phone;

  IF _customer_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'رقم الهاتف غير مسجل في النظام');
  END IF;

  -- لا يمكن الشحن لنفسه
  IF _customer_user_id = _merchant_user_id THEN
    RETURN json_build_object('success', false, 'error', 'لا يمكنك شحن حسابك الخاص');
  END IF;

  -- الحصول على نسبة العمولة من إعدادات التاجر
  _commission_rate := COALESCE(_merchant.commission_rate, 3.0);
  _commission_amount := ROUND((_amount * _commission_rate / 100), 2);
  _total_from_customer := _amount + _commission_amount;

  -- التحقق من رصيد التاجر الشخصي (من user_balances)
  SELECT balance INTO _current_balance
  FROM public.user_balances
  WHERE user_id = _merchant_user_id
  FOR UPDATE;

  IF COALESCE(_current_balance, 0) < _amount THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'رصيدك غير كافي. رصيدك الحالي: ' || COALESCE(_current_balance, 0) || ' دج'
    );
  END IF;

  -- خصم المبلغ من رصيد التاجر الشخصي
  UPDATE public.user_balances
  SET balance = balance - _amount,
      updated_at = now()
  WHERE user_id = _merchant_user_id;

  -- إضافة المبلغ لرصيد الزبون
  INSERT INTO public.user_balances (user_id, balance)
  VALUES (_customer_user_id, _amount)
  ON CONFLICT (user_id) DO UPDATE
  SET balance = user_balances.balance + _amount,
      updated_at = now();

  -- تسجيل المعاملة في سجل التاجر
  INSERT INTO public.merchant_transactions (
    merchant_id,
    transaction_type,
    amount,
    commission_amount,
    customer_phone,
    customer_user_id,
    status,
    notes
  ) VALUES (
    _merchant.id,
    'topup',
    _amount,
    _commission_amount,
    _cleaned_phone,
    _customer_user_id,
    'completed',
    'شحن رصيد للزبون'
  ) RETURNING id INTO _transaction_id;

  -- تحديث إجمالي أرباح التاجر (العمولات التي أخذها نقداً)
  UPDATE public.merchants
  SET total_earnings = total_earnings + _commission_amount,
      updated_at = now()
  WHERE id = _merchant.id;

  RETURN json_build_object(
    'success', true,
    'message', 'تم شحن الرصيد بنجاح',
    'transaction_id', _transaction_id,
    'amount', _amount,
    'commission_amount', _commission_amount,
    'total_from_customer', _total_from_customer,
    'customer_phone', _cleaned_phone,
    'new_balance', _current_balance - _amount
  );
END;
$$;

-- دالة لحساب العمولة قبل الشحن (للعرض)
CREATE OR REPLACE FUNCTION public.calculate_merchant_commission(_amount NUMERIC)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _merchant_user_id UUID;
  _commission_rate NUMERIC;
  _commission_amount NUMERIC;
BEGIN
  _merchant_user_id := auth.uid();
  
  IF _merchant_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'غير مسجل الدخول');
  END IF;

  -- الحصول على نسبة العمولة
  SELECT COALESCE(commission_rate, 3.0) INTO _commission_rate
  FROM public.merchants
  WHERE user_id = _merchant_user_id AND is_active = true;

  IF _commission_rate IS NULL THEN
    _commission_rate := 3.0; -- افتراضي 3%
  END IF;

  _commission_amount := ROUND((_amount * _commission_rate / 100), 2);

  RETURN json_build_object(
    'success', true,
    'amount', _amount,
    'commission_rate', _commission_rate,
    'commission_amount', _commission_amount,
    'total_from_customer', _amount + _commission_amount
  );
END;
$$;

-- إضافة إعدادات عمولة التاجر الافتراضية
INSERT INTO public.platform_settings (setting_key, setting_value, description)
VALUES (
  'merchant_commission',
  '{"default_rate": 3.0, "min_rate": 1.0, "max_rate": 10.0}'::jsonb,
  'نسبة عمولة التاجر الافتراضية'
)
ON CONFLICT (setting_key) DO UPDATE
SET setting_value = EXCLUDED.setting_value,
    updated_at = now();