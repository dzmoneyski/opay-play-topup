-- Fix search_path security warning
CREATE OR REPLACE FUNCTION public.calculate_fee(
  _amount NUMERIC,
  _fee_config JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _percentage NUMERIC;
  _fixed NUMERIC;
  _min_fee NUMERIC;
  _max_fee NUMERIC;
  _calculated_fee NUMERIC;
  _enabled BOOLEAN;
BEGIN
  -- Extract fee configuration
  _enabled := COALESCE((_fee_config->>'enabled')::BOOLEAN, false);
  
  IF NOT _enabled THEN
    RETURN jsonb_build_object(
      'fee_amount', 0,
      'net_amount', _amount,
      'fee_percentage', 0,
      'fee_fixed', 0
    );
  END IF;
  
  _percentage := COALESCE((_fee_config->>'percentage')::NUMERIC, 0);
  _fixed := COALESCE((_fee_config->>'fixed_amount')::NUMERIC, 0);
  _min_fee := COALESCE((_fee_config->>'min_fee')::NUMERIC, 0);
  _max_fee := COALESCE((_fee_config->>'max_fee')::NUMERIC, 999999);
  
  -- Calculate fee: percentage + fixed
  _calculated_fee := (_amount * _percentage / 100) + _fixed;
  
  -- Apply min/max limits
  _calculated_fee := GREATEST(_calculated_fee, _min_fee);
  _calculated_fee := LEAST(_calculated_fee, _max_fee);
  
  RETURN jsonb_build_object(
    'fee_amount', _calculated_fee,
    'net_amount', _amount - _calculated_fee,
    'fee_percentage', _percentage,
    'fee_fixed', _fixed
  );
END;
$$;

-- Update existing functions to apply fees
CREATE OR REPLACE FUNCTION public.approve_deposit(_deposit_id uuid, _admin_id uuid, _notes text DEFAULT NULL::text, _adjusted_amount numeric DEFAULT NULL::numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id UUID;
  _final_amount DECIMAL(10,2);
  _fee_config JSONB;
  _fee_info JSONB;
  _net_amount DECIMAL(10,2);
BEGIN
  -- Check if caller is admin
  IF NOT public.has_role(_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can approve deposits';
  END IF;
  
  -- Get deposit details and update it
  UPDATE public.deposits 
  SET status = 'approved',
      processed_at = now(),
      processed_by = _admin_id,
      admin_notes = _notes,
      amount = COALESCE(_adjusted_amount, amount)
  WHERE id = _deposit_id
  RETURNING user_id, amount INTO _user_id, _final_amount;
  
  -- Get deposit fee configuration
  SELECT setting_value INTO _fee_config
  FROM public.platform_settings
  WHERE setting_key = 'deposit_fees';
  
  -- Calculate fees
  _fee_info := public.calculate_fee(_final_amount, _fee_config);
  _net_amount := (_fee_info->>'net_amount')::NUMERIC;
  
  -- Record platform revenue
  PERFORM public.record_platform_revenue('deposit_fee', _deposit_id, _user_id, _fee_info, _final_amount);
  
  -- Create user balance if it doesn't exist
  INSERT INTO public.user_balances (user_id, balance)
  VALUES (_user_id, 0.00)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Add the NET amount to user balance (after deducting fees)
  UPDATE public.user_balances 
  SET balance = balance + _net_amount,
      updated_at = now()
  WHERE user_id = _user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_withdrawal(_withdrawal_id uuid, _admin_id uuid, _notes text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id UUID;
  _amount DECIMAL(10,2);
  _fee_config JSONB;
  _fee_info JSONB;
  _total_deducted DECIMAL(10,2);
BEGIN
  -- Ensure caller is admin
  IF NOT public.has_role(_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can approve withdrawals';
  END IF;
  
  -- Get withdrawal details
  SELECT user_id, amount INTO _user_id, _amount
  FROM public.withdrawals
  WHERE id = _withdrawal_id;
  
  -- Get withdrawal fee configuration
  SELECT setting_value INTO _fee_config
  FROM public.platform_settings
  WHERE setting_key = 'withdrawal_fees';
  
  -- Calculate fees
  _fee_info := public.calculate_fee(_amount, _fee_config);
  _total_deducted := _amount + (_fee_info->>'fee_amount')::NUMERIC;
  
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

  -- Recalculate to persist final state (total amount + fees already deducted)
  PERFORM public.recalculate_user_balance(_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.process_transfer(recipient_phone_param text, amount_param numeric, note_param text DEFAULT NULL::text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  sender_user_id UUID;
  recipient_user_id UUID;
  sender_balance_record RECORD;
  recipient_balance_record RECORD;
  transfer_id UUID;
  sender_phone_record TEXT;
  _fee_config JSONB;
  _fee_info JSONB;
  _total_deducted NUMERIC;
BEGIN
  -- Get current user
  sender_user_id := auth.uid();
  
  IF sender_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not authenticated');
  END IF;

  -- Recalculate sender balance to include latest holds
  PERFORM public.recalculate_user_balance(sender_user_id);

  -- Get sender's phone
  SELECT phone INTO sender_phone_record 
  FROM public.profiles 
  WHERE user_id = sender_user_id;

  -- Find recipient by phone
  SELECT user_id INTO recipient_user_id
  FROM public.profiles 
  WHERE phone = recipient_phone_param;
  
  IF recipient_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Recipient not found');
  END IF;

  IF sender_user_id = recipient_user_id THEN
    RETURN json_build_object('success', false, 'error', 'Cannot transfer to yourself');
  END IF;

  -- Get transfer fee configuration
  SELECT setting_value INTO _fee_config
  FROM public.platform_settings
  WHERE setting_key = 'transfer_fees';
  
  -- Calculate fees (sender pays by default)
  _fee_info := public.calculate_fee(amount_param, _fee_config);
  _total_deducted := amount_param + (_fee_info->>'fee_amount')::NUMERIC;

  -- Get sender balance
  SELECT * INTO sender_balance_record 
  FROM public.user_balances 
  WHERE user_id = sender_user_id;
  
  IF sender_balance_record IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Sender balance not found');
  END IF;

  -- Check if sender has enough balance (amount + fees)
  IF sender_balance_record.balance < _total_deducted THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient balance (including fees)');
  END IF;

  -- Get or create recipient balance
  SELECT * INTO recipient_balance_record 
  FROM public.user_balances 
  WHERE user_id = recipient_user_id;
  
  IF recipient_balance_record IS NULL THEN
    INSERT INTO public.user_balances (user_id, balance)
    VALUES (recipient_user_id, 0)
    RETURNING * INTO recipient_balance_record;
  END IF;

  -- Create transfer record
  INSERT INTO public.transfers (sender_id, recipient_id, sender_phone, recipient_phone, amount, note)
  VALUES (sender_user_id, recipient_user_id, sender_phone_record, recipient_phone_param, amount_param, note_param)
  RETURNING id INTO transfer_id;

  -- Record platform revenue
  PERFORM public.record_platform_revenue('transfer_fee', transfer_id, sender_user_id, _fee_info, amount_param);

  -- Update balances: sender pays amount + fees, recipient receives only amount
  UPDATE public.user_balances 
  SET balance = balance - _total_deducted, updated_at = now()
  WHERE user_id = sender_user_id;

  UPDATE public.user_balances 
  SET balance = balance + amount_param, updated_at = now()
  WHERE user_id = recipient_user_id;

  RETURN json_build_object(
    'success', true, 
    'transfer_id', transfer_id,
    'recipient_id', recipient_user_id,
    'fee_amount', (_fee_info->>'fee_amount')::NUMERIC,
    'total_deducted', _total_deducted
  );
END;
$$;