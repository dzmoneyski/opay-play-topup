
-- Fix: Include digital card orders in balance calculation
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
  _total_digital_card_deductions DECIMAL(10,2);
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
  
  -- Game topup deductions (pending AND completed - both are deducted from balance)
  SELECT COALESCE(SUM(gto.amount + COALESCE(pl.fee_amount, 0)), 0.00) INTO _total_game_topup_deductions
  FROM public.game_topup_orders gto
  LEFT JOIN public.platform_ledger pl
    ON pl.transaction_id = gto.id
   AND pl.transaction_type = 'game_topup_fee'
  WHERE gto.user_id = _user_id
    AND gto.status IN ('pending', 'completed');
  
  -- CRITICAL FIX: Digital card order deductions (pending AND completed - both are deducted from balance)
  SELECT COALESCE(SUM(dco.total_dzd), 0.00) INTO _total_digital_card_deductions
  FROM public.digital_card_orders dco
  WHERE dco.user_id = _user_id
    AND dco.status IN ('pending', 'completed');
  
  -- Total fees paid by user (from platform_ledger) - EXCLUDING digital card fees since they're included in total_dzd
  SELECT COALESCE(SUM(fee_amount), 0.00) INTO _total_fees_paid
  FROM public.platform_ledger
  WHERE user_id = _user_id
    AND transaction_type NOT IN ('digital_card_fee');
  
  -- Final available balance
  _final_balance := 
    _total_approved 
    + _total_received 
    + _total_gift_cards 
    - _total_sent 
    - _total_withdrawal_holds
    - _total_betting_deposit_deductions
    - _total_game_topup_deductions
    - _total_digital_card_deductions
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

-- Recalculate balances for all affected users
DO $$
DECLARE
  _user_record RECORD;
BEGIN
  FOR _user_record IN 
    SELECT DISTINCT user_id FROM public.digital_card_orders WHERE status IN ('pending', 'completed')
  LOOP
    PERFORM public.recalculate_user_balance(_user_record.user_id);
  END LOOP;
END $$;
