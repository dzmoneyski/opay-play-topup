-- Fix critical vulnerability: Users can insert deposits with 'approved' status
-- Drop the old permissive policy
DROP POLICY IF EXISTS "Users can create their own deposits" ON public.deposits;

-- Create a secure policy that forces status to be 'pending' only
CREATE POLICY "Users can create their own pending deposits"
ON public.deposits
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND status = 'pending'
  AND amount > 0
  AND amount <= 50000
);

-- Also prevent users from updating their own deposits (only admins should)
DROP POLICY IF EXISTS "Users can update own deposits" ON public.deposits;
