-- Fix SECURITY DEFINER functions missing search_path
-- This addresses the "Function Search Path Mutable" security warning

-- Fix update_balance_on_transaction trigger function
CREATE OR REPLACE FUNCTION public.update_balance_on_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Fix update_balance_on_transfer trigger function
CREATE OR REPLACE FUNCTION public.update_balance_on_transfer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;