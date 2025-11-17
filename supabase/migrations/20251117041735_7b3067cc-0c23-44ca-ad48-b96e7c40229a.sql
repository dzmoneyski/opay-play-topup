-- Fix approve_verification_request to use correct status value
CREATE OR REPLACE FUNCTION public.approve_verification_request(
  _request_id UUID,
  _admin_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
BEGIN
  -- Check if caller is admin
  IF NOT public.has_role(_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can approve verification requests';
  END IF;
  
  -- Get user_id from verification request and update it
  UPDATE public.verification_requests 
  SET status = 'approved',
      reviewed_at = now(),
      reviewed_by = _admin_id
  WHERE id = _request_id
  RETURNING user_id INTO _user_id;
  
  -- Update profile verification status with correct 'verified' value
  UPDATE public.profiles 
  SET is_identity_verified = TRUE,
      identity_verification_status = 'verified'
  WHERE user_id = _user_id;
END;
$$;