-- Allow admins to read all profiles for betting management
CREATE POLICY "Admins can view all profiles for management"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Add policy for admins to delete betting accounts if needed
CREATE POLICY "Admins can delete betting accounts"
ON public.betting_accounts
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);