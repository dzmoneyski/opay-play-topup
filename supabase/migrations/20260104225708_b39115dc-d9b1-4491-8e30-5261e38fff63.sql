
-- إضافة قيود أمان على مستوى قاعدة البيانات
-- قيد: المبلغ يجب أن يكون موجباً
ALTER TABLE phone_topup_orders 
ADD CONSTRAINT phone_topup_orders_amount_positive CHECK (amount > 0);

-- قيد: رقم الهاتف لا يمكن أن يكون فارغاً
ALTER TABLE phone_topup_orders 
ADD CONSTRAINT phone_topup_orders_phone_not_empty CHECK (length(trim(phone_number)) > 0);

-- قيد: الحد الأقصى للملاحظات
ALTER TABLE phone_topup_orders 
ADD CONSTRAINT phone_topup_orders_notes_length CHECK (notes IS NULL OR length(notes) <= 200);

-- تحسين دالة الرفض: استخدام الرسوم الفعلية من platform_ledger
CREATE OR REPLACE FUNCTION public.reject_phone_topup_order(_order_id uuid, _admin_notes text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _order phone_topup_orders%ROWTYPE;
  _fee numeric;
  _actual_fee numeric;
BEGIN
  -- ✅ التحقق من الصلاحيات أولاً
  IF NOT (has_role(_user_id, 'admin') OR agent_can(_user_id, 'phone_topups')) THEN
    RETURN json_build_object('success', false, 'error', 'غير مصرح لك');
  END IF;

  -- Get the order
  SELECT * INTO _order FROM phone_topup_orders WHERE id = _order_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'الطلب غير موجود');
  END IF;
  
  IF _order.status != 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'لا يمكن رفض طلب تمت معالجته');
  END IF;
  
  -- ✅ الحصول على الرسوم الفعلية من platform_ledger
  SELECT fee_amount INTO _actual_fee 
  FROM platform_ledger 
  WHERE transaction_id = _order_id AND transaction_type = 'phone_topup';
  
  -- إذا لم توجد سجل في platform_ledger، استخدم الحساب العادي
  IF _actual_fee IS NULL THEN
    IF _order.amount < 1000 THEN
      _actual_fee := 10;
    ELSE
      _actual_fee := 50;
    END IF;
  END IF;
  
  -- Update order status
  UPDATE phone_topup_orders
  SET status = 'rejected',
      admin_notes = _admin_notes,
      processed_at = now(),
      processed_by = _user_id,
      updated_at = now()
  WHERE id = _order_id;
  
  -- استرجاع المبلغ + الرسوم الفعلية
  UPDATE user_balances
  SET balance = balance + _order.amount + _actual_fee,
      updated_at = now()
  WHERE user_id = _order.user_id;
  
  -- حذف سجل الرسوم من platform_ledger لأن الطلب مرفوض
  DELETE FROM platform_ledger 
  WHERE transaction_id = _order_id AND transaction_type = 'phone_topup';
  
  RETURN json_build_object(
    'success', true, 
    'message', 'تم رفض الطلب واسترجاع المبلغ والرسوم',
    'refunded_amount', _order.amount,
    'refunded_fee', _actual_fee
  );
END;
$$;
