
-- Fix the recalculate_user_balance function to include 'completed' status
CREATE OR REPLACE FUNCTION public.recalculate_user_balance(_user_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _total_deposits NUMERIC;
  _total_gift_cards NUMERIC;
  _total_transfers_sent NUMERIC;
  _total_transfers_received NUMERIC;
  _total_withdrawals NUMERIC;
  _total_withdrawal_fees NUMERIC;
  _total_transfer_fees NUMERIC;
  _total_game_topups NUMERIC;
  _total_game_topup_fees NUMERIC;
  _total_phone_topups NUMERIC;
  _total_phone_topup_fees NUMERIC;
  _total_digital_cards NUMERIC;
  _total_betting NUMERIC;
  _final_balance NUMERIC;
BEGIN
  -- Approved deposits (net after deposit fees)
  SELECT COALESCE(SUM(d.amount), 0) 
    - COALESCE(SUM(COALESCE(pl.fee_amount, 0)), 0)
  INTO _total_deposits
  FROM public.deposits d
  LEFT JOIN public.platform_ledger pl
    ON pl.transaction_id = d.id AND pl.transaction_type = 'deposit_fee'
  WHERE d.user_id = _user_id AND d.status = 'approved';

  -- Redeemed gift cards
  SELECT COALESCE(SUM(amount), 0) INTO _total_gift_cards
  FROM public.gift_cards
  WHERE used_by = _user_id AND is_used = true;

  -- Completed outgoing transfers
  SELECT COALESCE(SUM(amount), 0) INTO _total_transfers_sent
  FROM public.transfers
  WHERE sender_id = _user_id AND status = 'completed';

  -- Completed incoming transfers
  SELECT COALESCE(SUM(amount), 0) INTO _total_transfers_received
  FROM public.transfers
  WHERE recipient_id = _user_id AND status = 'completed';

  -- Transfer fees
  SELECT COALESCE(SUM(fee_amount), 0) INTO _total_transfer_fees
  FROM public.platform_ledger
  WHERE user_id = _user_id AND transaction_type = 'transfer_fee';

  -- Withdrawals (pending + approved + completed)
  SELECT COALESCE(SUM(amount), 0) INTO _total_withdrawals
  FROM public.withdrawals
  WHERE user_id = _user_id AND status IN ('pending', 'approved', 'completed');

  -- Withdrawal fees
  SELECT COALESCE(SUM(pl.fee_amount), 0) INTO _total_withdrawal_fees
  FROM public.platform_ledger pl
  INNER JOIN public.withdrawals w ON pl.transaction_id = w.id
  WHERE pl.user_id = _user_id 
    AND pl.transaction_type = 'withdrawal_fee'
    AND w.status IN ('pending', 'approved', 'completed');

  -- ✅ FIXED: Game topups (pending + approved + completed)
  SELECT COALESCE(SUM(amount), 0) INTO _total_game_topups
  FROM public.game_topup_orders
  WHERE user_id = _user_id AND status IN ('pending', 'approved', 'completed');

  -- Game topup fees
  SELECT COALESCE(SUM(fee_amount), 0) INTO _total_game_topup_fees
  FROM public.platform_ledger
  WHERE user_id = _user_id AND transaction_type = 'game_topup';

  -- ✅ FIXED: Phone topups (pending + approved + completed)
  SELECT COALESCE(SUM(amount), 0) INTO _total_phone_topups
  FROM public.phone_topup_orders
  WHERE user_id = _user_id AND status IN ('pending', 'approved', 'completed');

  -- Phone topup fees
  SELECT COALESCE(SUM(fee_amount), 0) INTO _total_phone_topup_fees
  FROM public.platform_ledger
  WHERE user_id = _user_id AND transaction_type = 'phone_topup';

  -- ✅ FIXED: Digital cards (pending + approved + completed)
  SELECT COALESCE(SUM(total_dzd), 0) INTO _total_digital_cards
  FROM public.digital_card_orders
  WHERE user_id = _user_id AND status IN ('pending', 'approved', 'completed');

  -- ✅ FIXED: Betting deposits (pending + approved + completed)
  SELECT COALESCE(SUM(amount), 0) INTO _total_betting
  FROM public.betting_transactions
  WHERE user_id = _user_id AND transaction_type = 'deposit' AND status IN ('pending', 'approved', 'completed');

  -- Calculate final balance
  _final_balance := _total_deposits
                  + _total_gift_cards
                  + _total_transfers_received
                  - _total_transfers_sent
                  - _total_transfer_fees
                  - _total_withdrawals
                  - _total_withdrawal_fees
                  - _total_game_topups
                  - _total_game_topup_fees
                  - _total_phone_topups
                  - _total_phone_topup_fees
                  - _total_digital_cards
                  - _total_betting;

  -- Prevent negative balances
  _final_balance := GREATEST(COALESCE(_final_balance, 0), 0);

  -- Upsert balance
  INSERT INTO public.user_balances (user_id, balance, updated_at)
  VALUES (_user_id, _final_balance, now())
  ON CONFLICT (user_id)
  DO UPDATE SET balance = EXCLUDED.balance, updated_at = EXCLUDED.updated_at;

  RETURN _final_balance;
END;
$$;
