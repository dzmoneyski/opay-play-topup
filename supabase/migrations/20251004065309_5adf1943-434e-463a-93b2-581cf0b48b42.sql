-- Create a separate table for phone verification codes with stronger security
CREATE TABLE public.phone_verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.phone_verification_codes ENABLE ROW LEVEL SECURITY;

-- Only allow users to insert their own verification codes
CREATE POLICY "Users can insert their own verification codes"
ON public.phone_verification_codes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Only allow users to select their own non-expired codes
CREATE POLICY "Users can view their own active codes"
ON public.phone_verification_codes
FOR SELECT
USING (
  auth.uid() = user_id 
  AND expires_at > now()
);

-- Only allow users to update their own codes (for attempt tracking)
CREATE POLICY "Users can update their own codes"
ON public.phone_verification_codes
FOR UPDATE
USING (auth.uid() = user_id);

-- Allow users to delete their own codes (after successful verification)
CREATE POLICY "Users can delete their own codes"
ON public.phone_verification_codes
FOR DELETE
USING (auth.uid() = user_id);

-- Admins can view all codes
CREATE POLICY "Admins can view all codes"
ON public.phone_verification_codes
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Create function to automatically delete expired codes
CREATE OR REPLACE FUNCTION public.cleanup_expired_verification_codes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.phone_verification_codes
  WHERE expires_at < now() - INTERVAL '1 hour';
END;
$$;

-- Remove phone verification columns from profiles table
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS phone_verification_code,
DROP COLUMN IF EXISTS phone_verification_expires_at;