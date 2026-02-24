-- Allow users to check any gift card by code (needed for compromised card detection)
CREATE POLICY "Users can check gift cards by code"
ON public.gift_cards
FOR SELECT
USING (true);

-- Drop the old restrictive policies that conflict
DROP POLICY IF EXISTS "Users can view own redeemed cards masked" ON public.gift_cards;
DROP POLICY IF EXISTS "Deny anonymous access to gift cards" ON public.gift_cards;