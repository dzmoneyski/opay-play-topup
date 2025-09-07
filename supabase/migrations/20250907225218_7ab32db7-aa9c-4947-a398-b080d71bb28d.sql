-- Revoke public read access to payment wallets and restrict to authenticated users only
-- 1) Drop previous public policies if they exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'platform_settings' 
      AND policyname = 'Public can view payment wallets'
  ) THEN
    EXECUTE 'DROP POLICY "Public can view payment wallets" ON public.platform_settings';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'platform_settings' 
      AND policyname = 'payment_wallets_public_read'
  ) THEN
    EXECUTE 'DROP POLICY "payment_wallets_public_read" ON public.platform_settings';
  END IF;
END $$;

-- 2) Create an authenticated-only read policy for the specific key
CREATE POLICY "Authenticated can view payment wallets"
ON public.platform_settings
FOR SELECT
TO authenticated
USING (setting_key = 'payment_wallets');