-- Update approve_verification_request function to activate account automatically
CREATE OR REPLACE FUNCTION public.approve_verification_request(_request_id uuid, _admin_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  
  -- Update profile: verify identity AND activate account
  UPDATE public.profiles 
  SET is_identity_verified = TRUE,
      identity_verification_status = 'verified',
      is_account_activated = TRUE
  WHERE user_id = _user_id;
END;
$function$;