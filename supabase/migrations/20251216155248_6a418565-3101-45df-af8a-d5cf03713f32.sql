-- تحديث دالة إنشاء السحب لإعادة حساب الرصيد أولاً
CREATE OR REPLACE FUNCTION public.create_withdrawal(
  _amount NUMERIC,
  _withdrawal_method TEXT,
  _account_number TEXT DEFAULT NULL,
  _account_holder_name TEXT DEFAULT NULL,
  _cash_location TEXT DEFAULT NULL,
  _notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
  _current_balance DECIMAL(10,2);
  _fee_config JSONB;
  _fee_info JSONB;
  _total_deducted DECIMAL(10,2);
  _new_withdrawal_id UUID;
BEGIN
  -- Get current user
  _user_id := auth.uid();
  
  IF _user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'يجب تسجيل الدخول أولاً');
  END IF;
  
  -- Validate amount
  IF _amount <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'المبلغ يجب أن يكون أكبر من صفر');
  END IF;
  
  -- CRITICAL: إعادة حساب الرصيد قبل التحقق لضمان دقته
  PERFORM public.recalculate_user_balance(_user_id);
  
  -- Get current user balance (الآن الرصيد محدث)
  SELECT COALESCE(balance, 0) INTO _current_balance
  FROM public.user_balances
  WHERE user_id = _user_id;
  
  -- Get withdrawal fee configuration
  SELECT setting_value INTO _fee_config
  FROM public.platform_settings
  WHERE setting_key = 'withdrawal_fees';
  
  -- Calculate fees
  _fee_info := public.calculate_fee(_amount, _fee_config);
  _total_deducted := _amount + COALESCE((_fee_info->>'fee_amount')::NUMERIC, 0);
  
  -- CRITICAL: Check if user has sufficient balance (including fees)
  IF _current_balance < _total_deducted THEN
    RETURN json_build_object(
      'success', false, 
      'error', format('رصيدك غير كافي للسحب. الرصيد الحالي: %s دج، المطلوب: %s دج (المبلغ: %s + الرسوم: %s)', 
        _current_balance, _total_deducted, _amount, COALESCE((_fee_info->>'fee_amount')::NUMERIC, 0))
    );
  END IF;
  
  -- Create withdrawal request
  INSERT INTO public.withdrawals (
    user_id,
    amount,
    withdrawal_method,
    account_number,
    account_holder_name,
    cash_location,
    notes,
    status
  ) VALUES (
    _user_id,
    _amount,
    _withdrawal_method,
    _account_number,
    _account_holder_name,
    _cash_location,
    _notes,
    'pending'
  )
  RETURNING id INTO _new_withdrawal_id;
  
  RETURN json_build_object(
    'success', true, 
    'withdrawal_id', _new_withdrawal_id,
    'message', 'تم إنشاء طلب السحب بنجاح'
  );
END;
$$;