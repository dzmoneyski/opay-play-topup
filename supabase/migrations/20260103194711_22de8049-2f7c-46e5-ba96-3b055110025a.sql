-- تحديث دالة شحن الهاتف لإضافة رسوم 10 دج
CREATE OR REPLACE FUNCTION public.process_phone_topup_order(
  _operator_id uuid,
  _phone_number text,
  _amount numeric,
  _notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _balance numeric;
  _operator record;
  _order_id uuid;
  _fee numeric := 10; -- رسوم ثابتة 10 دج
  _total_amount numeric;
BEGIN
  -- Check if user is authenticated
  IF _user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'يجب تسجيل الدخول');
  END IF;
  
  -- Get operator info
  SELECT * INTO _operator FROM phone_operators WHERE id = _operator_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'شركة الاتصال غير موجودة');
  END IF;
  
  -- Validate amount
  IF _amount < _operator.min_amount THEN
    RETURN json_build_object('success', false, 'error', 'الحد الأدنى للشحن هو ' || _operator.min_amount || ' د.ج');
  END IF;
  
  IF _amount > _operator.max_amount THEN
    RETURN json_build_object('success', false, 'error', 'الحد الأقصى للشحن هو ' || _operator.max_amount || ' د.ج');
  END IF;
  
  -- Calculate total (amount + fee)
  _total_amount := _amount + _fee;
  
  -- Get user balance
  SELECT balance INTO _balance FROM user_balances WHERE user_id = _user_id;
  IF _balance IS NULL OR _balance < _total_amount THEN
    RETURN json_build_object('success', false, 'error', 'رصيدك غير كافي. المطلوب: ' || _total_amount || ' د.ج (المبلغ: ' || _amount || ' + الرسوم: ' || _fee || ')');
  END IF;
  
  -- Deduct total amount (amount + fee)
  UPDATE user_balances SET balance = balance - _total_amount, updated_at = now() WHERE user_id = _user_id;
  
  -- Create order
  INSERT INTO phone_topup_orders (user_id, operator_id, phone_number, amount, notes)
  VALUES (_user_id, _operator_id, _phone_number, _amount, _notes)
  RETURNING id INTO _order_id;
  
  -- Record platform revenue
  INSERT INTO platform_ledger (user_id, transaction_type, original_amount, fee_amount, fee_fixed, transaction_id)
  VALUES (_user_id, 'phone_topup', _amount, _fee, _fee, _order_id);
  
  RETURN json_build_object(
    'success', true,
    'order_id', _order_id,
    'message', 'تم إرسال طلب الشحن بنجاح (الرسوم: ' || _fee || ' د.ج)'
  );
END;
$$;