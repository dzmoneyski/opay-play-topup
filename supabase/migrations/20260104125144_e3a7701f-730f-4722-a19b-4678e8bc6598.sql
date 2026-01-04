-- Add RLS policy to allow authenticated users to read withdrawal_methods setting
CREATE POLICY "Authenticated can view withdrawal methods" 
ON public.platform_settings 
FOR SELECT 
TO authenticated
USING (setting_key = 'withdrawal_methods');