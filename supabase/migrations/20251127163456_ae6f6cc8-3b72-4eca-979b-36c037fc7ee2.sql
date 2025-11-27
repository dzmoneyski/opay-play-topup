-- Fix identity verification status constraint and update old data
-- First, drop the old constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_identity_verification_status_check;

-- Add new constraint that includes 'verified' for backward compatibility
ALTER TABLE profiles ADD CONSTRAINT profiles_identity_verification_status_check 
  CHECK (identity_verification_status IN ('pending', 'approved', 'rejected', 'verified'));

-- Update old 'verified' values to 'approved' for consistency
UPDATE profiles 
SET identity_verification_status = 'approved' 
WHERE identity_verification_status = 'verified';

-- Also update reject_verification function to use correct status
CREATE OR REPLACE FUNCTION public.reject_verification(request_id uuid, reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  UPDATE verification_requests
  SET 
    status = 'rejected',
    rejection_reason = reason,
    reviewed_at = now(),
    reviewed_by = auth.uid()
  WHERE id = request_id;
  
  -- تحديث حالة التحقق في الملف الشخصي
  UPDATE profiles
  SET 
    identity_verification_status = 'rejected'
  WHERE user_id = (
    SELECT user_id FROM verification_requests WHERE id = request_id
  );
END;
$function$;