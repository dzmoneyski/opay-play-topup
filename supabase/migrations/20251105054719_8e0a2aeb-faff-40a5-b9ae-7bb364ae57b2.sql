-- Fix double balance update in transfers
-- The issue: process_transfer updates user_balances directly, 
-- then the trigger also calls recalculate_user_balance, causing double update for recipient

-- First, update recalculate_user_balance to deduct transfer fees from platform_ledger
CREATE OR REPLACE FUNCTION public.recalculate_user_balance(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _total_approved DECIMAL(10,2);
  _total_sent DECIMAL(10,2);
  _total_received DECIMAL(10,2);
  _total_withdrawal_holds DECIMAL(10,2);
  _total_gift_cards DECIMAL(10,2);
  _total_betting_deposit_deductions DECIMAL(10,2);
  _total_fees_paid DECIMAL(10,2);
  _final_balance DECIMAL(10,2);
BEGIN
  -- Total approved deposits
  SELECT COALESCE(SUM(amount), 0.00) INTO _total_approved
  FROM public.deposits 
  WHERE user_id = _user_id AND status = 'approved';
  
  -- Total sent transfers
  SELECT COALESCE(SUM(amount), 0.00) INTO _total_sent
  FROM public.transfers 
  WHERE sender_id = _user_id AND status = 'completed';
  
  -- Total received transfers
  SELECT COALESCE(SUM(amount), 0.00) INTO _total_received
  FROM public.transfers 
  WHERE recipient_id = _user_id AND status = 'completed';

  -- Total withdrawal holds (pending/approved/completed are considered held)
  SELECT COALESCE(SUM(amount), 0.00) INTO _total_withdrawal_holds
  FROM public.withdrawals
  WHERE user_id = _user_id AND status IN ('pending','approved','completed');

  -- Total redeemed gift cards
  SELECT COALESCE(SUM(amount), 0.00) INTO _total_gift_cards
  FROM public.gift_cards
  WHERE used_by = _user_id;

  -- Betting deposit deductions (pending AND completed - both are deducted from balance)
  SELECT COALESCE(SUM(bt.amount + COALESCE(pl.fee_amount, 0)), 0.00) INTO _total_betting_deposit_deductions
  FROM public.betting_transactions bt
  LEFT JOIN public.platform_ledger pl
    ON pl.transaction_id = bt.id
   AND pl.transaction_type = 'betting_deposit_fee'
  WHERE bt.user_id = _user_id
    AND bt.transaction_type = 'deposit'
    AND bt.status IN ('pending', 'completed');
  
  -- Total fees paid by user (from platform_ledger)
  SELECT COALESCE(SUM(fee_amount), 0.00) INTO _total_fees_paid
  FROM public.platform_ledger
  WHERE user_id = _user_id;
  
  -- Final available balance
  _final_balance := 
    _total_approved 
    + _total_received 
    + _total_gift_cards 
    - _total_sent 
    - _total_withdrawal_holds
    - _total_betting_deposit_deductions
    - _total_fees_paid;
  
  -- Upsert user's balance
  INSERT INTO public.user_balances (user_id, balance)
  VALUES (_user_id, _final_balance)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    balance = EXCLUDED.balance,
    updated_at = now();
END;
$function$;

-- Now update process_transfer to NOT update balances directly
-- Let the trigger handle everything through recalculate_user_balance
CREATE OR REPLACE FUNCTION public.process_transfer(
  recipient_phone_param text, 
  amount_param numeric, 
  note_param text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  sender_user_id UUID;
  recipient_user_id UUID;
  sender_balance_record RECORD;
  transfer_id UUID;
  sender_phone_record TEXT;
  _fee_config JSONB;
  _fee_info JSONB;
  _total_deducted NUMERIC;
  _is_activated BOOLEAN;
  _current_balance NUMERIC;
BEGIN
  -- Get current user
  sender_user_id := auth.uid();
  
  IF sender_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not authenticated');
  END IF;

  -- Check if sender account is activated
  SELECT is_account_activated INTO _is_activated
  FROM public.profiles
  WHERE user_id = sender_user_id;
  
  IF NOT COALESCE(_is_activated, false) THEN
    RETURN json_build_object('success', false, 'error', 'يجب تفعيل حسابك أولاً لإجراء التحويلات');
  END IF;

  -- Check rate limit: 10 transfers per hour
  IF NOT check_rate_limit(sender_user_id, 'transfer', 10, 60) THEN
    RETURN json_build_object('success', false, 'error', 'تجاوزت الحد الأقصى للتحويلات. حاول مرة أخرى لاحقاً');
  END IF;

  -- INPUT VALIDATION
  IF amount_param IS NULL OR amount_param <= 0 OR amount_param > 1000000 THEN
    RETURN json_build_object('success', false, 'error', 'Invalid amount: must be between 0.01 and 1,000,000 DZD');
  END IF;

  IF recipient_phone_param IS NULL OR recipient_phone_param !~ '^[0-9+]{10,15}$' THEN
    RETURN json_build_object('success', false, 'error', 'Invalid phone number format');
  END IF;

  IF note_param IS NOT NULL AND LENGTH(note_param) > 500 THEN
    RETURN json_build_object('success', false, 'error', 'Note too long: maximum 500 characters');
  END IF;

  -- Recalculate sender balance
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
  
  -- Calculate fees
  _fee_info := public.calculate_fee(amount_param, _fee_config);
  _total_deducted := amount_param + (_fee_info->>'fee_amount')::NUMERIC;

  -- Check sender balance
  SELECT balance INTO _current_balance
  FROM public.user_balances 
  WHERE user_id = sender_user_id;
  
  IF COALESCE(_current_balance, 0) < _total_deducted THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient balance (including fees)');
  END IF;

  -- Create transfer record
  INSERT INTO public.transfers (sender_id, recipient_id, sender_phone, recipient_phone, amount, note)
  VALUES (sender_user_id, recipient_user_id, sender_phone_record, recipient_phone_param, amount_param, note_param)
  RETURNING id INTO transfer_id;

  -- Record platform revenue (fees)
  PERFORM public.record_platform_revenue('transfer_fee', transfer_id, sender_user_id, _fee_info, amount_param);

  -- DON'T update user_balances directly - the trigger will call recalculate_user_balance
  -- This prevents double updates

  RETURN json_build_object(
    'success', true, 
    'transfer_id', transfer_id,
    'recipient_id', recipient_user_id,
    'fee_amount', (_fee_info->>'fee_amount')::NUMERIC,
    'total_deducted', _total_deducted
  );
END;
$function$;