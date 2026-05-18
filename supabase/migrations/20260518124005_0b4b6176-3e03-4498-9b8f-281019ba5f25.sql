CREATE POLICY "Users can insert their own verification codes"
ON public.phone_verification_codes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);