-- دالة الموافقة على طلب بطاقة رقمية
CREATE OR REPLACE FUNCTION public.approve_digital_card_order(_order_id uuid, _card_code text, _card_pin text DEFAULT NULL, _admin_notes text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _user_id UUID;
  _amount NUMERIC;
BEGIN
  -- الحصول على تفاصيل الطلب
  SELECT user_id, amount INTO _user_id, _amount
  FROM public.digital_card_orders
  WHERE id = _order_id AND status = 'pending';

  IF _user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'الطلب غير موجود أو تمت معالجته مسبقاً');
  END IF;

  -- تحديث حالة الطلب وإضافة معلومات البطاقة
  UPDATE public.digital_card_orders
  SET status = 'completed',
      card_code = _card_code,
      card_pin = _card_pin,
      processed_at = now(),
      processed_by = auth.uid(),
      admin_notes = _admin_notes
  WHERE id = _order_id;

  RETURN json_build_object(
    'success', true,
    'message', 'تمت الموافقة على الطلب بنجاح'
  );
END;
$function$;

-- دالة رفض طلب بطاقة رقمية وإرجاع المبلغ
CREATE OR REPLACE FUNCTION public.reject_digital_card_order(_order_id uuid, _admin_notes text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _user_id UUID;
  _total_dzd NUMERIC;
  _fee_amount NUMERIC;
BEGIN
  -- الحصول على تفاصيل الطلب
  SELECT user_id, total_dzd, fee_amount INTO _user_id, _total_dzd, _fee_amount
  FROM public.digital_card_orders
  WHERE id = _order_id AND status = 'pending';

  IF _user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'الطلب غير موجود أو تمت معالجته مسبقاً');
  END IF;

  -- تحديث حالة الطلب
  UPDATE public.digital_card_orders
  SET status = 'rejected',
      processed_at = now(),
      processed_by = auth.uid(),
      admin_notes = _admin_notes
  WHERE id = _order_id;

  -- إرجاع المبلغ الكامل للمستخدم (المبلغ + الرسوم)
  UPDATE public.user_balances
  SET balance = balance + _total_dzd,
      updated_at = now()
  WHERE user_id = _user_id;

  -- حذف رسوم المنصة من السجل
  DELETE FROM public.platform_ledger
  WHERE transaction_id = _order_id AND transaction_type = 'digital_card_fee';

  RETURN json_build_object(
    'success', true,
    'message', 'تم رفض الطلب وإرجاع المبلغ بالكامل',
    'refunded_amount', _total_dzd
  );
END;
$function$;