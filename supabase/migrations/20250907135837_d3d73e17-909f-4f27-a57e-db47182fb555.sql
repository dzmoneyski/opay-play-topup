DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'platform_settings' 
      AND policyname = 'Public can view payment wallets'
  ) THEN
    EXECUTE $$CREATE POLICY "Public can view payment wallets"
      ON public.platform_settings
      FOR SELECT
      USING (setting_key = 'payment_wallets')$$;
  END IF;
END$$;