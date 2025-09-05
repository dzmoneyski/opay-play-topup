-- Tighten RLS policies for gift_cards and allow admin inserts/updates
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='gift_cards' AND policyname='Users can view and use gift cards'
  ) THEN
    DROP POLICY "Users can view and use gift cards" ON public.gift_cards;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='gift_cards' AND policyname='Users can update gift cards when using them'
  ) THEN
    DROP POLICY "Users can update gift cards when using them" ON public.gift_cards;
  END IF;
END $$;

-- Only admins can view/insert/update gift cards via direct table access
CREATE POLICY "Admins can view all gift cards"
ON public.gift_cards
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert gift cards"
ON public.gift_cards
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update gift cards"
ON public.gift_cards
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));
