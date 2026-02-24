-- Revert the overly permissive policy
DROP POLICY IF EXISTS "Users can check gift cards by code" ON public.gift_cards;

-- Restore safe policies
CREATE POLICY "Users can view own redeemed cards"
ON public.gift_cards
FOR SELECT
USING (used_by = auth.uid());

CREATE POLICY "Deny anonymous access to gift cards"
ON public.gift_cards
FOR SELECT
USING (false);

-- Create a secure function to check if a card is from compromised batch
CREATE OR REPLACE FUNCTION public.check_compromised_card(_card_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _card_info record;
BEGIN
  SELECT created_at, amount, card_code
  INTO _card_info
  FROM gift_cards
  WHERE card_code = _card_code;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  RETURN jsonb_build_object(
    'found', true,
    'is_compromised', (date(_card_info.created_at) = '2025-12-06'),
    'amount', _card_info.amount,
    'card_code', _card_info.card_code
  );
END;
$$;