-- Fix approve_verification function to use 'approved' instead of 'verified'
CREATE OR REPLACE FUNCTION public.approve_verification(request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  UPDATE verification_requests
  SET 
    status = 'approved',
    reviewed_at = now(),
    reviewed_by = auth.uid()
  WHERE id = request_id;
  
  -- تحديث حالة التحقق في الملف الشخصي - استخدام 'approved' بدلاً من 'verified'
  UPDATE profiles
  SET 
    is_identity_verified = true,
    identity_verification_status = 'approved'
  WHERE user_id = (
    SELECT user_id FROM verification_requests WHERE id = request_id
  );
END;
$function$;