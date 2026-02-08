-- Allow authenticated users to read flexy deposit settings
CREATE POLICY "Authenticated can view flexy deposit settings"
ON public.platform_settings
FOR SELECT
TO authenticated
USING (setting_key = 'flexy_deposit_settings');
