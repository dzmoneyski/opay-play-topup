BEGIN;

-- 1) Stop auto-recalc from interfering with create_withdrawal() on PENDING inserts
CREATE OR REPLACE FUNCTION public.update_balance_on_withdrawal_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- create_withdrawal() already deducts (amount + fee) and locks the balance;
    -- if we recalc here, it will desync/double-deduct for large amounts.
    IF COALESCE(NEW.status, 'pending') = 'pending' THEN
      RETURN NEW;
    END IF;

    PERFORM public.recalculate_user_balance(NEW.user_id);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      PERFORM public.recalculate_user_balance(OLD.user_id);
    END IF;
    PERFORM public.recalculate_user_balance(NEW.user_id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.recalculate_user_balance(OLD.user_id);
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

-- 2) Remove redundant trigger that also recalculates balance
DROP TRIGGER IF EXISTS trigger_update_balance_on_withdrawal ON public.withdrawals;

-- 3) Ensure we still recalc on UPDATE/DELETE via one trigger
DROP TRIGGER IF EXISTS trg_withdrawals_recalc_after_change ON public.withdrawals;
CREATE TRIGGER trg_withdrawals_recalc_after_change
AFTER INSERT OR UPDATE OR DELETE ON public.withdrawals
FOR EACH ROW
EXECUTE FUNCTION public.update_balance_on_withdrawal_change();

COMMIT;