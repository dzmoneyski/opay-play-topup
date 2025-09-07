-- Allow public read access to payment wallet settings only
CREATE POLICY IF NOT EXISTS "Public can view payment wallets"
ON public.platform_settings
FOR SELECT
USING (setting_key = 'payment_wallets');