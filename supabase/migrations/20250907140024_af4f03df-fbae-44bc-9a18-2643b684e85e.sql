-- Create simple policy for public read access to payment wallets setting
CREATE POLICY "payment_wallets_public_read"
ON public.platform_settings
FOR SELECT
USING (setting_key = 'payment_wallets');