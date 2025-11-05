-- Enable real-time updates for user_balances
ALTER TABLE public.user_balances REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_balances;

-- Create trigger function for deposits
CREATE OR REPLACE FUNCTION public.update_balance_on_deposit_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    PERFORM public.recalculate_user_balance(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger function for transfers
CREATE OR REPLACE FUNCTION public.update_balance_on_transfer_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    PERFORM public.recalculate_user_balance(NEW.sender_id);
    PERFORM public.recalculate_user_balance(NEW.recipient_id);
  ELSIF (TG_OP = 'UPDATE') THEN
    IF NEW.sender_id IS DISTINCT FROM OLD.sender_id THEN
      PERFORM public.recalculate_user_balance(OLD.sender_id);
    END IF;
    IF NEW.recipient_id IS DISTINCT FROM OLD.recipient_id THEN
      PERFORM public.recalculate_user_balance(OLD.recipient_id);
    END IF;
    PERFORM public.recalculate_user_balance(NEW.sender_id);
    PERFORM public.recalculate_user_balance(NEW.recipient_id);
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger function for betting transactions
CREATE OR REPLACE FUNCTION public.update_balance_on_betting_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    PERFORM public.recalculate_user_balance(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger function for gift cards
CREATE OR REPLACE FUNCTION public.update_balance_on_gift_card_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND NEW.is_used = TRUE AND OLD.is_used = FALSE) THEN
    PERFORM public.recalculate_user_balance(NEW.used_by);
  END IF;
  RETURN NEW;
END;
$$;

-- Create triggers on deposits table
CREATE TRIGGER trigger_update_balance_on_deposit
AFTER INSERT OR UPDATE ON public.deposits
FOR EACH ROW
EXECUTE FUNCTION public.update_balance_on_deposit_change();

-- Create triggers on withdrawals table
CREATE TRIGGER trigger_update_balance_on_withdrawal
AFTER INSERT OR UPDATE ON public.withdrawals
FOR EACH ROW
EXECUTE FUNCTION public.update_balance_on_withdrawal_change();

-- Create triggers on transfers table
CREATE TRIGGER trigger_update_balance_on_transfer
AFTER INSERT OR UPDATE ON public.transfers
FOR EACH ROW
EXECUTE FUNCTION public.update_balance_on_transfer_change();

-- Create triggers on betting_transactions table
CREATE TRIGGER trigger_update_balance_on_betting
AFTER INSERT OR UPDATE ON public.betting_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_balance_on_betting_change();

-- Create triggers on gift_cards table
CREATE TRIGGER trigger_update_balance_on_gift_card
AFTER UPDATE ON public.gift_cards
FOR EACH ROW
EXECUTE FUNCTION public.update_balance_on_gift_card_change();