-- تحديث دالة الموافقة على طلبات شحن الهاتف لاقتطاع الرسوم من الطلبات القديمة
CREATE OR REPLACE FUNCTION public.approve_phone_topup_order(
  _order_id uuid,
  _admin_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _order record;
  _fee numeric;
  _fee_already_charged boolean;
  _user_balance numeric;
BEGIN
  -- Check admin/agent permission
  IF NOT (has_role(_user_id, 'admin') OR agent_can(_user_id, 'phone_topups')) THEN
    RETURN json_build_object('success', false, 'error', 'غير مصرح لك');
  END IF;
  
  -- Get order
  SELECT * INTO _order FROM phone_topup_orders WHERE id = _order_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'الطلب غير موجود');
  END IF;
  
  IF _order.status != 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'الطلب تمت معالجته مسبقاً');
  END IF;
  
  -- Check if fee was already charged (exists in platform_ledger)
  SELECT EXISTS(
    SELECT 1 FROM platform_ledger 
    WHERE transaction_id = _order_id AND transaction_type = 'phone_topup'
  ) INTO _fee_already_charged;
  
  -- If fee not charged yet (old order), charge it now
  IF NOT _fee_already_charged THEN
    -- Calculate fee based on amount
    IF _order.amount < 1000 THEN
      _fee := 10;
    ELSE
      _fee := 50;
    END IF;
    
    -- Check user balance for fee
    SELECT balance INTO _user_balance FROM user_balances WHERE user_id = _order.user_id;
    IF _user_balance IS NULL OR _user_balance < _fee THEN
      RETURN json_build_object('success', false, 'error', 'رصيد العميل غير كافي للرسوم (' || _fee || ' د.ج)');
    END IF;
    
    -- Deduct fee from user balance
    UPDATE user_balances 
    SET balance = balance - _fee, updated_at = now() 
    WHERE user_id = _order.user_id;
    
    -- Record fee in platform ledger
    INSERT INTO platform_ledger (user_id, transaction_type, original_amount, fee_amount, fee_fixed, transaction_id)
    VALUES (_order.user_id, 'phone_topup', _order.amount, _fee, _fee, _order_id);
  END IF;
  
  -- Update order status
  UPDATE phone_topup_orders
  SET 
    status = 'approved',
    admin_notes = _admin_notes,
    processed_by = _user_id,
    processed_at = now(),
    updated_at = now()
  WHERE id = _order_id;
  
  RETURN json_build_object('success', true, 'message', 'تمت الموافقة على الطلب');
END;
$$;