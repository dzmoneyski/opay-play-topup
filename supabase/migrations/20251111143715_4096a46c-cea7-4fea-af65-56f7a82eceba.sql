-- Fix: Include game topup orders in balance calculation
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
  _total_game_topup_deductions DECIMAL(10,2);
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
  
  -- CRITICAL FIX: Game topup deductions (pending AND completed - both are deducted from balance)
  SELECT COALESCE(SUM(gto.amount + COALESCE(pl.fee_amount, 0)), 0.00) INTO _total_game_topup_deductions
  FROM public.game_topup_orders gto
  LEFT JOIN public.platform_ledger pl
    ON pl.transaction_id = gto.id
   AND pl.transaction_type = 'game_topup_fee'
  WHERE gto.user_id = _user_id
    AND gto.status IN ('pending', 'completed');
  
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
    - _total_game_topup_deductions
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

-- Also update process_game_topup_order to NOT manually deduct - let the trigger handle it
CREATE OR REPLACE FUNCTION public.process_game_topup_order(
  _platform_id UUID,
  _package_id UUID,
  _player_id TEXT,
  _amount NUMERIC,
  _notes TEXT DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  _user_id UUID;
  _current_balance NUMERIC;
  _order_id UUID;
  _fee_config JSONB;
  _fee_info JSONB;
  _total_deducted NUMERIC;
  _is_activated BOOLEAN;
BEGIN
  _user_id := auth.uid();
  
  IF _user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'المستخدم غير مسجل الدخول');
  END IF;

  -- Validate amount
  IF _amount IS NULL OR _amount <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'المبلغ غير صحيح');
  END IF;

  -- Check if account is activated
  SELECT is_account_activated INTO _is_activated
  FROM public.profiles
  WHERE user_id = _user_id;
  
  IF NOT COALESCE(_is_activated, false) THEN
    RETURN json_build_object('success', false, 'error', 'يجب تفعيل حسابك أولاً');
  END IF;

  -- Get game top-up fee configuration
  SELECT setting_value INTO _fee_config
  FROM public.platform_settings
  WHERE setting_key = 'game_topup_fees';
  
  -- If no fee config exists, use default (no fees)
  IF _fee_config IS NULL THEN
    _fee_config := jsonb_build_object('enabled', false);
  END IF;
  
  -- Calculate fees
  _fee_info := public.calculate_fee(_amount, _fee_config);
  _total_deducted := _amount + (_fee_info->>'fee_amount')::NUMERIC;

  -- CRITICAL FIX: Lock the user's balance row to prevent race conditions
  -- This ensures that only one transaction can process at a time for this user
  SELECT balance INTO _current_balance
  FROM public.user_balances
  WHERE user_id = _user_id
  FOR UPDATE;  -- This locks the row until the transaction completes

  -- If no balance record exists, recalculate to create one
  IF _current_balance IS NULL THEN
    PERFORM public.recalculate_user_balance(_user_id);
    SELECT balance INTO _current_balance
    FROM public.user_balances
    WHERE user_id = _user_id;
  END IF;

  -- Check balance (user must have enough balance for amount + fees)
  IF COALESCE(_current_balance, 0) < _total_deducted THEN
    RETURN json_build_object(
      'success', false, 
      'error', format('الرصيد غير كافي. رصيدك الحالي: %s دج، المبلغ المطلوب (مع العمولة): %s دج', 
        COALESCE(_current_balance, 0), 
        _total_deducted
      )
    );
  END IF;

  -- Create PENDING order
  INSERT INTO public.game_topup_orders (
    user_id, platform_id, package_id, player_id, amount, status, notes
  ) VALUES (
    _user_id, _platform_id, _package_id, _player_id, _amount, 'pending', _notes
  ) RETURNING id INTO _order_id;

  -- Record platform revenue (fees)
  PERFORM public.record_platform_revenue('game_topup_fee', _order_id, _user_id, _fee_info, _amount);

  -- DON'T manually update balance - the trigger will call recalculate_user_balance
  -- This ensures consistency and prevents race conditions

  RETURN json_build_object(
    'success', true,
    'message', 'تم خصم المبلغ وإرسال الطلب للمشرف',
    'order_id', _order_id,
    'fee_amount', (_fee_info->>'fee_amount')::NUMERIC,
    'total_deducted', _total_deducted,
    'remaining_balance', _current_balance - _total_deducted
  );
END;
$function$;