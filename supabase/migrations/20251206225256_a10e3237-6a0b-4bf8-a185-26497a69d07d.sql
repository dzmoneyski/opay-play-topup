-- Remove the incorrect trigger that references non-existent user_id column
DROP TRIGGER IF EXISTS trigger_update_balance_on_gift_card ON public.gift_cards;

-- Create a proper trigger function for gift cards that uses the correct column (used_by)
CREATE OR REPLACE FUNCTION public.update_balance_on_gift_card_redemption()
RETURNS TRIGGER AS $$
BEGIN
  -- Only recalculate when a gift card is redeemed (used_by is set)
  IF TG_OP = 'UPDATE' AND NEW.used_by IS NOT NULL AND OLD.used_by IS NULL THEN
    PERFORM public.recalculate_user_balance(NEW.used_by);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create the new trigger for gift card redemption
CREATE TRIGGER trigger_update_balance_on_gift_card_redemption
AFTER UPDATE ON public.gift_cards
FOR EACH ROW
EXECUTE FUNCTION public.update_balance_on_gift_card_redemption();