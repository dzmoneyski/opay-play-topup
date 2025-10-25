-- Fix approve_betting_deposit to properly deduct balance
CREATE OR REPLACE FUNCTION public.approve_betting_deposit(_transaction_id uuid, _admin_notes text DEFAULT NULL::text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _user_id UUID;
  _amount NUMERIC;
  _fee_config JSONB;
  _fee_info JSONB;
  _total_deducted NUMERIC;
  _current_balance NUMERIC;
BEGIN
  -- Get transaction details
  SELECT user_id, amount INTO _user_id, _amount
  FROM public.betting_transactions
  WHERE id = _transaction_id AND transaction_type = 'deposit' AND status = 'pending';

  IF _user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'المعاملة غير موجودة أو تمت معالجتها مسبقاً');
  END IF;

  -- Get betting deposit fee configuration (use deposit_fees for now)
  SELECT setting_value INTO _fee_config
  FROM public.platform_settings
  WHERE setting_key = 'betting_fees';
  
  -- If no betting_fees, use deposit_fees
  IF _fee_config IS NULL THEN
    SELECT setting_value INTO _fee_config
    FROM public.platform_settings
    WHERE setting_key = 'deposit_fees';
  END IF;
  
  -- Calculate fees
  _fee_info := public.calculate_fee(_amount, _fee_config);
  _total_deducted := _amount + (_fee_info->>'fee_amount')::NUMERIC;

  -- Check balance again
  SELECT balance INTO _current_balance
  FROM public.user_balances
  WHERE user_id = _user_id;

  IF COALESCE(_current_balance, 0) < _total_deducted THEN
    RETURN json_build_object('success', false, 'error', 'الرصيد غير كافي لإتمام العملية');
  END IF;

  -- Update transaction status
  UPDATE public.betting_transactions
  SET status = 'completed',
      processed_at = now(),
      admin_notes = _admin_notes
  WHERE id = _transaction_id;

  -- Deduct from balance (amount + fees)
  UPDATE public.user_balances
  SET balance = balance - _total_deducted,
      updated_at = now()
  WHERE user_id = _user_id;

  -- Record platform revenue
  PERFORM public.record_platform_revenue('betting_deposit_fee', _transaction_id, _user_id, _fee_info, _amount);

  RETURN json_build_object(
    'success', true,
    'message', 'تمت الموافقة على الإيداع بنجاح',
    'fee_amount', (_fee_info->>'fee_amount')::NUMERIC,
    'total_deducted', _total_deducted
  );
END;
$function$;

-- Create betting_fees setting if it doesn't exist
INSERT INTO public.platform_settings (setting_key, setting_value, description)
VALUES (
  'betting_fees',
  '{"enabled": true, "percentage": 2, "fixed_amount": 0, "min_fee": 10, "max_fee": 500}'::jsonb,
  'رسوم إيداعات المراهنات - 2% مع حد أدنى 10 دج وحد أقصى 500 دج'
)
ON CONFLICT (setting_key) DO NOTHING;