
-- Drop the conflicting INSERT policy that blocks all inserts
DROP POLICY IF EXISTS "Only system can insert verification codes" ON public.phone_verification_codes;

-- The existing policy "Users can insert their own verification codes" is correct
-- But let's verify it exists and is properly configured
-- Recreate it to ensure it works correctly
DROP POLICY IF EXISTS "Users can insert their own verification codes" ON public.phone_verification_codes;

CREATE POLICY "Users can insert their own verification codes" 
ON public.phone_verification_codes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Also need to allow users to update their own codes (for attempts increment and upsert)
DROP POLICY IF EXISTS "Only system can update verification codes" ON public.phone_verification_codes;

CREATE POLICY "Users can update their own verification codes" 
ON public.phone_verification_codes 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Also need to allow users to delete their own codes after verification
DROP POLICY IF EXISTS "Only system can delete verification codes" ON public.phone_verification_codes;

CREATE POLICY "Users can delete their own verification codes" 
ON public.phone_verification_codes 
FOR DELETE 
USING (auth.uid() = user_id);

-- Allow users to select their own verification codes
DROP POLICY IF EXISTS "Admins can view all codes" ON public.phone_verification_codes;
DROP POLICY IF EXISTS "Only admins can view verification codes" ON public.phone_verification_codes;

CREATE POLICY "Users can view their own verification codes" 
ON public.phone_verification_codes 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all verification codes" 
ON public.phone_verification_codes 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));
