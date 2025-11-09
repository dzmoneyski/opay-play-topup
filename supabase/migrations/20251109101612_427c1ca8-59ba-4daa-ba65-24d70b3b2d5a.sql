-- تعديل جدول أنواع البطاقات لإضافة سعر الصرف
ALTER TABLE public.digital_card_types 
ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC NOT NULL DEFAULT 200.00, -- سعر الدولار بالدينار
ADD COLUMN IF NOT EXISTS min_amount NUMERIC NOT NULL DEFAULT 5.00, -- الحد الأدنى بالدولار
ADD COLUMN IF NOT EXISTS max_amount NUMERIC NOT NULL DEFAULT 500.00; -- الحد الأقصى بالدولار

-- حذف جدول الفئات القديم (لم نعد نحتاجه)
DROP TABLE IF EXISTS public.digital_card_denominations CASCADE;

-- تعديل جدول الطلبات
ALTER TABLE public.digital_card_orders
DROP COLUMN IF EXISTS denomination_id,
ADD COLUMN IF NOT EXISTS account_id TEXT NOT NULL DEFAULT '', -- ID الحساب في الخدمة
ADD COLUMN IF NOT EXISTS amount_usd NUMERIC NOT NULL DEFAULT 0, -- المبلغ المطلوب بالدولار
ADD COLUMN IF NOT EXISTS exchange_rate_used NUMERIC NOT NULL DEFAULT 200.00, -- سعر الصرف المستخدم
ADD COLUMN IF NOT EXISTS fee_amount NUMERIC NOT NULL DEFAULT 0, -- العمولة
ADD COLUMN IF NOT EXISTS total_dzd NUMERIC NOT NULL DEFAULT 0; -- المبلغ الإجمالي بالدينار

-- تحديث حقل amount ليكون المبلغ بالدولار
COMMENT ON COLUMN public.digital_card_orders.amount IS 'المبلغ بالدولار (نفس amount_usd)';

-- إنشاء جدول إعدادات رسوم البطاقات الرقمية
CREATE TABLE IF NOT EXISTS public.digital_card_fee_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fee_type TEXT NOT NULL DEFAULT 'percentage', -- 'percentage' أو 'fixed'
  fee_value NUMERIC NOT NULL DEFAULT 3.00, -- 3% أو مبلغ ثابت
  min_fee NUMERIC NOT NULL DEFAULT 0,
  max_fee NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.digital_card_fee_settings ENABLE ROW LEVEL SECURITY;

-- سياسات RLS لإعدادات الرسوم
CREATE POLICY "الجميع يمكنهم عرض إعدادات الرسوم"
ON public.digital_card_fee_settings
FOR SELECT
USING (true);

CREATE POLICY "المسؤولون يمكنهم إدارة إعدادات الرسوم"
ON public.digital_card_fee_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- إدراج إعدادات الرسوم الافتراضية
INSERT INTO public.digital_card_fee_settings (fee_type, fee_value, min_fee)
VALUES ('percentage', 3.00, 50.00)
ON CONFLICT DO NOTHING;

-- trigger لتحديث updated_at
CREATE TRIGGER update_digital_card_fee_settings_updated_at
BEFORE UPDATE ON public.digital_card_fee_settings
FOR EACH ROW
EXECUTE FUNCTION update_digital_cards_updated_at();

-- تحديث بيانات أنواع البطاقات بأسعار صرف وحدود
UPDATE public.digital_card_types
SET 
  exchange_rate = 200.00,
  min_amount = 5.00,
  max_amount = 500.00,
  updated_at = now()
WHERE exchange_rate IS NULL OR exchange_rate = 0;

-- إنشاء دالة لمعالجة طلب شراء بطاقة رقمية
CREATE OR REPLACE FUNCTION public.process_digital_card_order(
  _card_type_id UUID,
  _account_id TEXT,
  _amount_usd NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  IF _fee_settings.fee_type = 'percentage' THEN
    _fee_amount := (_amount_dzd * _fee_settings.fee_value / 100);
  ELSE
    _fee_amount := _fee_settings.fee_value;
  END IF;

  -- تطبيق الحد الأدنى والأقصى للرسوم
  IF _fee_settings.min_fee IS NOT NULL THEN
    _fee_amount := GREATEST(_fee_amount, _fee_settings.min_fee);
  END IF;
  IF _fee_settings.max_fee IS NOT NULL THEN
    _fee_amount := LEAST(_fee_amount, _fee_settings.max_fee);
  END IF;

  _total_dzd := _amount_dzd + _fee_amount;

  -- إعادة حساب الرصيد
  PERFORM public.recalculate_user_balance(_user_id);

  -- التحقق من الرصيد
  SELECT balance INTO _current_balance
  FROM public.user_balances
  WHERE user_id = _user_id;

  IF COALESCE(_current_balance, 0) < _total_dzd THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'الرصيد غير كافي. الرصيد المطلوب: ' || _total_dzd || ' دج'
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
    _account_id,
    _amount_usd,
    _amount_usd,
    _card_type.exchange_rate,
    _fee_amount,
    _total_dzd,
    _total_dzd,
    'pending'
  ) RETURNING id INTO _order_id;

  -- خصم المبلغ من الرصيد
  UPDATE public.user_balances
  SET balance = balance - _total_dzd,
      updated_at = now()
  WHERE user_id = _user_id;

  -- تسجيل إيرادات المنصة
  INSERT INTO public.platform_ledger (
    transaction_id,
    transaction_type,
    user_id,
    original_amount,
    fee_amount,
    fee_percentage,
    currency
  ) VALUES (
    _order_id,
    'digital_card_fee',
    _user_id,
    _amount_dzd,
    _fee_amount,
    _fee_settings.fee_value,
    'DZD'
  );

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

-- دالة لمعالجة الطلب من المشرف
CREATE OR REPLACE FUNCTION public.approve_digital_card_order(
  _order_id UUID,
  _admin_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id UUID;
  _amount NUMERIC;
BEGIN
  -- التحقق من صلاحيات المشرف
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN json_build_object('success', false, 'error', 'غير مصرح');
  END IF;

  -- الحصول على تفاصيل الطلب
  SELECT user_id, amount INTO _user_id, _amount
  FROM public.digital_card_orders
  WHERE id = _order_id AND status = 'pending';

  IF _user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'الطلب غير موجود أو تمت معالجته');
  END IF;

  -- تحديث حالة الطلب
  UPDATE public.digital_card_orders
  SET status = 'completed',
      processed_at = now(),
      processed_by = auth.uid(),
      admin_notes = _admin_notes
  WHERE id = _order_id;

  RETURN json_build_object(
    'success', true,
    'message', 'تمت الموافقة على الطلب'
  );
END;
$$;

-- دالة لرفض الطلب
CREATE OR REPLACE FUNCTION public.reject_digital_card_order(
  _order_id UUID,
  _admin_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id UUID;
  _total_dzd NUMERIC;
  _fee_amount NUMERIC;
BEGIN
  -- التحقق من صلاحيات المشرف
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN json_build_object('success', false, 'error', 'غير مصرح');
  END IF;

  -- الحصول على تفاصيل الطلب
  SELECT user_id, total_dzd INTO _user_id, _total_dzd
  FROM public.digital_card_orders
  WHERE id = _order_id AND status = 'pending';

  IF _user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'الطلب غير موجود أو تمت معالجته');
  END IF;

  -- تحديث حالة الطلب
  UPDATE public.digital_card_orders
  SET status = 'failed',
      processed_at = now(),
      processed_by = auth.uid(),
      admin_notes = _admin_notes
  WHERE id = _order_id;

  -- إرجاع المبلغ للمستخدم
  UPDATE public.user_balances
  SET balance = balance + _total_dzd,
      updated_at = now()
  WHERE user_id = _user_id;

  -- حذف سجل الإيرادات
  DELETE FROM public.platform_ledger
  WHERE transaction_id = _order_id AND transaction_type = 'digital_card_fee';

  RETURN json_build_object(
    'success', true,
    'message', 'تم رفض الطلب وإرجاع المبلغ',
    'refunded_amount', _total_dzd
  );
END;
$$;