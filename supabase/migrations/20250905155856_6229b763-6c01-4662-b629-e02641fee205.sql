-- Delete test/demo gift cards with pattern *-2024-0001
-- This removes the demo gift cards that shouldn't appear in a production financial app

-- Get affected user IDs before deletion for balance recalculation
DO $$
DECLARE
  _affected_user_id UUID;
BEGIN
  -- Get user ID who redeemed any of these test cards
  SELECT DISTINCT used_by INTO _affected_user_id
  FROM public.gift_cards 
  WHERE card_code LIKE '%-2024-0001' AND used_by IS NOT NULL;

  -- Delete the test gift cards
  DELETE FROM public.gift_cards 
  WHERE card_code LIKE '%-2024-0001';

  -- Recalculate balance for affected user if any
  IF _affected_user_id IS NOT NULL THEN
    PERFORM public.recalculate_user_balance(_affected_user_id);
  END IF;
END$$;