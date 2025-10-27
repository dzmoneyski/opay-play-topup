-- Update recalculate_user_balance to include pending betting deposit holds (amount + fee)
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
  _total_betting_deposit_holds DECIMAL(10,2);
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

  -- New: Pending betting deposit holds (amount + fee)
  SELECT COALESCE(SUM(bt.amount + COALESCE(pl.fee_amount, 0)), 0.00) INTO _total_betting_deposit_holds
  FROM public.betting_transactions bt
  LEFT JOIN public.platform_ledger pl
    ON pl.transaction_id = bt.id
   AND pl.transaction_type = 'betting_deposit_fee'
  WHERE bt.user_id = _user_id
    AND bt.transaction_type = 'deposit'
    AND bt.status = 'pending';
  
  -- Final available balance now subtracts pending betting deposit holds
  _final_balance := 
    _total_approved 
    + _total_received 
    + _total_gift_cards 
    - _total_sent 
    - _total_withdrawal_holds
    - _total_betting_deposit_holds;
  
  -- Upsert user's balance
  INSERT INTO public.user_balances (user_id, balance)
  VALUES (_user_id, _final_balance)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    balance = EXCLUDED.balance,
    updated_at = now();
END;
$function$;