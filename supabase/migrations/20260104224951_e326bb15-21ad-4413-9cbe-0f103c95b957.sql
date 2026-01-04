-- إصلاح دالة الرفض لتستخدم نفس منطق الرسوم
CREATE OR REPLACE FUNCTION public.reject_phone_topup_order(_order_id uuid, _admin_notes text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _order phone_topup_orders%ROWTYPE;
  _fee numeric;
BEGIN
  -- Get the order
  SELECT * INTO _order FROM phone_topup_orders WHERE id = _order_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'الطلب غير موجود');
  END IF;
  
  IF _order.status != 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'لا يمكن رفض طلب تمت معالجته');
  END IF;
  
  -- ✅ نفس منطق الرسوم المستخدم في process_phone_topup_order
  IF _order.amount < 1000 THEN
    _fee := 10;
  ELSE
    _fee := 50;
  END IF;
  
  -- Update order status
  UPDATE phone_topup_orders
  SET status = 'rejected',
      admin_notes = _admin_notes,
      processed_at = now(),
      processed_by = auth.uid(),
      updated_at = now()
  WHERE id = _order_id;
  
  -- استرجاع المبلغ + الرسوم (بالضبط ما خُصم)
  UPDATE user_balances
  SET balance = balance + _order.amount + _fee,
      updated_at = now()
  WHERE user_id = _order.user_id;
  
  RETURN json_build_object('success', true, 'message', 'تم رفض الطلب واسترجاع المبلغ والرسوم');
END;
$$;