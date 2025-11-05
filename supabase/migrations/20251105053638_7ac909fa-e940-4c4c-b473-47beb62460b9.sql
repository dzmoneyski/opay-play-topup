-- Enable realtime for user_balances table
ALTER TABLE public.user_balances REPLICA IDENTITY FULL;

-- Function to update balance on any financial transaction
CREATE OR REPLACE FUNCTION public.update_balance_on_transaction()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate balance for the affected user
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalculate_user_balance(OLD.user_id);
    RETURN OLD;
  ELSE
    PERFORM public.recalculate_user_balance(NEW.user_id);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for deposits table
DROP TRIGGER IF EXISTS trigger_update_balance_on_deposit ON public.deposits;
CREATE TRIGGER trigger_update_balance_on_deposit
AFTER INSERT OR UPDATE OR DELETE ON public.deposits
FOR EACH ROW
EXECUTE FUNCTION public.update_balance_on_transaction();

-- Trigger for withdrawals table
DROP TRIGGER IF EXISTS trigger_update_balance_on_withdrawal ON public.withdrawals;
CREATE TRIGGER trigger_update_balance_on_withdrawal
AFTER INSERT OR UPDATE OR DELETE ON public.withdrawals
FOR EACH ROW
EXECUTE FUNCTION public.update_balance_on_transaction();

-- Trigger for transfers table (both sender and recipient)
CREATE OR REPLACE FUNCTION public.update_balance_on_transfer()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    -- Update both sender and recipient balances
    PERFORM public.recalculate_user_balance(OLD.sender_id);
    PERFORM public.recalculate_user_balance(OLD.recipient_id);
    RETURN OLD;
  ELSE
    -- Update both sender and recipient balances
    PERFORM public.recalculate_user_balance(NEW.sender_id);
    PERFORM public.recalculate_user_balance(NEW.recipient_id);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_balance_on_transfer ON public.transfers;
CREATE TRIGGER trigger_update_balance_on_transfer
AFTER INSERT OR UPDATE OR DELETE ON public.transfers
FOR EACH ROW
EXECUTE FUNCTION public.update_balance_on_transfer();

-- Trigger for betting_transactions table
DROP TRIGGER IF EXISTS trigger_update_balance_on_betting ON public.betting_transactions;
CREATE TRIGGER trigger_update_balance_on_betting
AFTER INSERT OR UPDATE OR DELETE ON public.betting_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_balance_on_transaction();

-- Trigger for gift_cards table
DROP TRIGGER IF EXISTS trigger_update_balance_on_gift_card ON public.gift_cards;
CREATE TRIGGER trigger_update_balance_on_gift_card
AFTER INSERT OR UPDATE OR DELETE ON public.gift_cards
FOR EACH ROW
EXECUTE FUNCTION public.update_balance_on_transaction();

-- Trigger for game_topup_orders table
DROP TRIGGER IF EXISTS trigger_update_balance_on_game_topup ON public.game_topup_orders;
CREATE TRIGGER trigger_update_balance_on_game_topup
AFTER INSERT OR UPDATE OR DELETE ON public.game_topup_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_balance_on_transaction();