
-- 1. تحديث وظيفة شحن العميل لمنع شحن أي حساب مرتبط بنفس التاجر
CREATE OR REPLACE FUNCTION public.merchant_recharge_customer(_customer_phone text, _amount numeric)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _merchant_id UUID;
  _merchant RECORD;
  _customer_user_id UUID;
  _commission NUMERIC;
  _customer_merchant_id UUID;
BEGIN
  -- Get merchant info
  SELECT * INTO _merchant
  FROM public.merchants
  WHERE user_id = auth.uid() AND is_active = true;

  IF _merchant IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Merchant account not found or inactive');
  END IF;

  -- Validate amount
  IF _amount <= 0 OR _amount > 100000 THEN
    RETURN json_build_object('success', false, 'error', 'Invalid amount');
  END IF;

  -- Find customer by phone
  SELECT user_id INTO _customer_user_id
  FROM public.profiles
  WHERE phone = _customer_phone;

  IF _customer_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Customer not found');
  END IF;

  -- 🚨 الحماية 1: منع التاجر من شحن نفسه
  IF _customer_user_id = auth.uid() THEN
    RETURN json_build_object('success', false, 'error', 'لا يمكنك شحن رصيدك الشخصي من حساب التاجر');
  END IF;

  -- 🚨 الحماية 2: منع شحن أي حساب لديه حساب تاجر (لمنع التواطؤ)
  SELECT id INTO _customer_merchant_id
  FROM public.merchants
  WHERE user_id = _customer_user_id AND is_active = true;
  
  IF _customer_merchant_id IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'لا يمكن شحن رصيد حساب تاجر آخر');
  END IF;

  -- Calculate commission
  _commission := _amount * _merchant.commission_rate / 100;

  -- Check if merchant has enough balance to pay full amount
  IF _merchant.balance < _amount THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient merchant balance');
  END IF;

  -- Deduct full amount from merchant balance
  UPDATE public.merchants
  SET balance = balance - _amount,
      updated_at = now()
  WHERE id = _merchant.id;

  -- Add commission back to merchant balance as profit
  UPDATE public.merchants
  SET balance = balance + _commission,
      total_earnings = total_earnings + _commission,
      updated_at = now()
  WHERE id = _merchant.id;

  -- Add to customer balance (as approved deposit)
  INSERT INTO public.deposits (user_id, amount, payment_method, status, admin_notes, processed_at)
  VALUES (_customer_user_id, _amount, 'merchant_recharge', 'approved', 'Recharged by merchant: ' || _merchant.merchant_code, now());

  -- Recalculate customer balance
  PERFORM recalculate_user_balance(_customer_user_id);

  -- Record transaction
  INSERT INTO public.merchant_transactions (
    merchant_id, transaction_type, customer_phone, customer_user_id,
    amount, commission_amount, status
  ) VALUES (
    _merchant.id, 'recharge', _customer_phone, _customer_user_id,
    _amount, _commission, 'completed'
  );

  RETURN json_build_object(
    'success', true,
    'amount', _amount,
    'commission', _commission,
    'cost', _amount - _commission
  );
END;
$$;

-- 2. إنشاء جدول لتسجيل محاولات الاحتيال
CREATE TABLE IF NOT EXISTS public.fraud_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  attempt_type TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- تفعيل RLS على جدول محاولات الاحتيال
ALTER TABLE public.fraud_attempts ENABLE ROW LEVEL SECURITY;

-- فقط الأدمن يمكنه رؤية محاولات الاحتيال
CREATE POLICY "Admins can view fraud attempts" ON public.fraud_attempts
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- منع الجميع من التعديل عبر API
CREATE POLICY "No one can modify fraud attempts via API" ON public.fraud_attempts
FOR ALL TO authenticated
USING (false);

-- 3. تحديث approve_merchant_request لعدم نسخ الرصيد الشخصي
CREATE OR REPLACE FUNCTION public.approve_merchant_request(_request_id uuid, _admin_id uuid, _commission_rate numeric DEFAULT 2.00)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _request RECORD;
  _merchant_id UUID;
  _merchant_code TEXT;
BEGIN
  -- Check admin permission
  IF NOT has_role(_admin_id, 'admin') THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Get request details
  SELECT * INTO _request
  FROM public.merchant_requests
  WHERE id = _request_id AND status = 'pending';

  IF _request IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Request not found or already processed');
  END IF;

  -- Generate unique merchant code
  _merchant_code := 'M' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');

  -- 🚨 إصلاح: إنشاء التاجر برصيد صفر (لا يتم نسخ الرصيد الشخصي!)
  INSERT INTO public.merchants (
    user_id, business_name, business_type, phone, address, 
    merchant_code, commission_rate, balance
  ) VALUES (
    _request.user_id, _request.business_name, _request.business_type,
    _request.phone, _request.address, _merchant_code, _commission_rate, 0
  ) RETURNING id INTO _merchant_id;

  -- Update request status
  UPDATE public.merchant_requests
  SET status = 'approved',
      reviewed_by = _admin_id,
      reviewed_at = now()
  WHERE id = _request_id;

  RETURN json_build_object(
    'success', true,
    'merchant_id', _merchant_id,
    'merchant_code', _merchant_code,
    'initial_balance', 0
  );
END;
$$;
