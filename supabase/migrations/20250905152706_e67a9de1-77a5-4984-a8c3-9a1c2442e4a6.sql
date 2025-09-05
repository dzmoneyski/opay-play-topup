-- Strengthen RLS for gift_cards to prevent gift code leakage
-- 1) Allow users to ONLY view their own redeemed cards (never unused)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'gift_cards' 
      AND policyname = 'Users can view their redeemed gift cards'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can view their redeemed gift cards" ON public.gift_cards
             FOR SELECT
             USING (auth.uid() = used_by AND is_used = TRUE)';
  END IF;
END$$;

-- 2) Keep admin policies as-is (already present):
--    Admins can select/insert/update all gift cards via has_role(auth.uid(), ''admin'')

-- 3) Ensure there is NO generic SELECT for authenticated/anon on gift_cards
--    (No action needed if none exist)