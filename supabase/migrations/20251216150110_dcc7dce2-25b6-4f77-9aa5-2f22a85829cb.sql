-- حذف الدالة القديمة وإعادة إنشائها مع تحقق من الرصيد
DROP FUNCTION IF EXISTS public.approve_withdrawal(UUID, UUID, TEXT);

CREATE OR REPLACE FUNCTION public.approve_withdrawal(
  _admin_id UUID,
  _withdrawal_id UUID,
  _notes TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
  _amount DECIMAL(10,2);
  _fee_config JSONB;
  _fee_info JSONB;
  _total_deducted DECIMAL(10,2);
  _current_balance DECIMAL(10,2);
  _withdrawal_status TEXT;
BEGIN
  -- Ensure caller is admin
  IF NOT public.has_role(_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can approve withdrawals';
  END IF;
  
  -- Get withdrawal details
  SELECT user_id, amount, status INTO _user_id, _amount, _withdrawal_status
  FROM public.withdrawals
  WHERE id = _withdrawal_id;
  
  -- Check if withdrawal exists
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'طلب السحب غير موجود';
  END IF;
  
  -- Check if already processed
  IF _withdrawal_status != 'pending' THEN
    RAISE EXCEPTION 'طلب السحب تمت معالجته مسبقاً';
  END IF;
  
  -- Get withdrawal fee configuration
  SELECT setting_value INTO _fee_config
  FROM public.platform_settings
  WHERE setting_key = 'withdrawal_fees';
  
  -- Calculate fees
  _fee_info := public.calculate_fee(_amount, _fee_config);
  _total_deducted := _amount + (_fee_info->>'fee_amount')::NUMERIC;
  
  -- CRITICAL: Get current user balance
  SELECT COALESCE(balance, 0) INTO _current_balance
  FROM public.user_balances
  WHERE user_id = _user_id;
  
  -- CRITICAL: Check if user has sufficient balance (including fees)
  IF _current_balance < _total_deducted THEN
    RAISE EXCEPTION 'رصيد المستخدم غير كافي للسحب. الرصيد الحالي: % دج، المطلوب: % دج (المبلغ: % + الرسوم: %)', 
      _current_balance, _total_deducted, _amount, (_fee_info->>'fee_amount')::NUMERIC;
  END IF;
  
  -- Record platform revenue
  PERFORM public.record_platform_revenue('withdrawal_fee', _withdrawal_id, _user_id, _fee_info, _amount);
  
  -- Approve withdrawal
  UPDATE public.withdrawals 
  SET status = 'approved',
      processed_at = now(),
      processed_by = _admin_id,
      admin_notes = _notes
  WHERE id = _withdrawal_id;
  
  -- Mark as completed
  UPDATE public.withdrawals 
  SET status = 'completed'
  WHERE id = _withdrawal_id;

  -- Recalculate to persist final state
  PERFORM public.recalculate_user_balance(_user_id);
END;
$$;