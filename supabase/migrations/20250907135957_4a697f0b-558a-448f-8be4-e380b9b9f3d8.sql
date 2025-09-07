-- Create policy to allow public read access to payment wallets setting
CREATE POLICY "Public can view payment wallets"
ON public.platform_settings
FOR SELECT
USING (setting_key = 'payment_wallets');