-- Fix: Update approve_verification_request to activate account when both verifications are complete
CREATE OR REPLACE FUNCTION public.approve_verification_request(_request_id UUID, _admin_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _user_id UUID;
  _is_phone_verified BOOLEAN;
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
  
  -- Check if phone is verified
  SELECT is_phone_verified INTO _is_phone_verified
  FROM public.profiles
  WHERE user_id = _user_id;
  
  -- Update profile verification status AND activate account if phone is also verified
  UPDATE public.profiles 
  SET is_identity_verified = TRUE,
      identity_verification_status = 'verified',
      is_account_activated = (_is_phone_verified = TRUE)  -- Auto-activate if phone verified
  WHERE user_id = _user_id;
END;
$$;