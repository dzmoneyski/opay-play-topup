-- Update approve_verification to use referral_codes table correctly
CREATE OR REPLACE FUNCTION public.approve_verification(request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  _user_id UUID;
  _referrer_id UUID;
  _referred_by_code TEXT;
BEGIN
  -- Get user_id from verification request
  SELECT user_id INTO _user_id
  FROM verification_requests
  WHERE id = request_id;

  -- Update verification request
  UPDATE verification_requests
  SET 
    status = 'approved',
    reviewed_at = now(),
    reviewed_by = auth.uid()
  WHERE id = request_id;
  
  -- Update profile: approve verification AND activate account automatically
  UPDATE profiles
  SET 
    is_identity_verified = true,
    identity_verification_status = 'approved',
    is_account_activated = true
  WHERE user_id = _user_id
  RETURNING referred_by_code INTO _referred_by_code;

  -- Process referral if exists
  IF _referred_by_code IS NOT NULL AND TRIM(_referred_by_code) != '' THEN
    -- Find referrer by looking up referral_code in referral_codes table
    SELECT user_id INTO _referrer_id
    FROM referral_codes
    WHERE referral_code = _referred_by_code
    LIMIT 1;

    IF _referrer_id IS NOT NULL THEN
      -- Check if referral already exists
      IF NOT EXISTS (
        SELECT 1 FROM referrals 
        WHERE referrer_id = _referrer_id AND referred_user_id = _user_id
      ) THEN
        -- Create referral record with 'active' status
        INSERT INTO referrals (referrer_id, referred_user_id, status, activated_at, reward_amount)
        VALUES (_referrer_id, _user_id, 'active', now(), 100.00);
      ELSE
        -- Update existing referral to active
        UPDATE referrals
        SET status = 'active',
            activated_at = now()
        WHERE referrer_id = _referrer_id 
          AND referred_user_id = _user_id
          AND status = 'pending';
      END IF;
    END IF;
  END IF;
END;
$function$;