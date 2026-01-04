-- إصلاح ثغرة استرجاع الرسوم عند رفض الطلب
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
  
  -- حساب الرسوم (نفس المنطق في process_phone_topup_order)
  IF _order.amount >= 1000 THEN
    _fee := 50;
  ELSEIF _order.amount >= 500 THEN
    _fee := 30;
  ELSEIF _order.amount >= 200 THEN
    _fee := 20;
  ELSE
    _fee := 10;
  END IF;
  
  -- Update order status
  UPDATE phone_topup_orders
  SET status = 'rejected',
      admin_notes = _admin_notes,
      processed_at = now(),
      processed_by = auth.uid(),
      updated_at = now()
  WHERE id = _order_id;
  
  -- استرجاع المبلغ + الرسوم (الإصلاح المهم)
  UPDATE user_balances
  SET balance = balance + _order.amount + _fee,
      updated_at = now()
  WHERE user_id = _order.user_id;
  
  RETURN json_build_object('success', true, 'message', 'تم رفض الطلب واسترجاع المبلغ والرسوم');
END;
$$;

-- إضافة سياسة RLS للإدخال
CREATE POLICY "Users can insert their own phone topup orders"
ON public.phone_topup_orders
FOR INSERT
WITH CHECK (auth.uid() = user_id);