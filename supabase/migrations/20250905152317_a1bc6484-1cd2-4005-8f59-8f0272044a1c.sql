-- Secure RPC: return only safe gift card redemption info for current user
CREATE OR REPLACE FUNCTION public.get_user_gift_card_redemptions()
RETURNS TABLE(
  id uuid,
  amount numeric,
  used_at timestamptz,
  created_at timestamptz
) AS $$
  SELECT id, amount, used_at, created_at
  FROM public.gift_cards
  WHERE used_by = auth.uid() AND is_used = TRUE
  ORDER BY COALESCE(used_at, created_at) DESC;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;