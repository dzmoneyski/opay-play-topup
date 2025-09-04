-- Fix the default identity verification status
-- It should be null initially, not 'pending'
ALTER TABLE public.profiles 
ALTER COLUMN identity_verification_status SET DEFAULT NULL;

-- Update existing profiles that haven't actually submitted verification requests
-- If there's no verification request record, set status to null
UPDATE public.profiles 
SET identity_verification_status = NULL
WHERE identity_verification_status = 'pending' 
AND user_id NOT IN (
  SELECT DISTINCT user_id 
  FROM public.verification_requests
);