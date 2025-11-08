-- Create function to ensure referral record for a user based on profiles.referred_by_code
CREATE OR REPLACE FUNCTION public.ensure_user_referral(_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _profile RECORD;
  _referrer_id UUID;
  _reward_amount NUMERIC := 100.00;
  _created BOOLEAN := FALSE;
  _status TEXT := 'pending';
BEGIN
  -- Fetch profile and referral code
  SELECT user_id, referred_by_code, is_account_activated
  INTO _profile
  FROM public.profiles
  WHERE user_id = _user_id;

  IF _profile IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'profile_not_found');
  END IF;

  -- No referral code provided
  IF _profile.referred_by_code IS NULL OR trim(_profile.referred_by_code) = '' THEN
    RETURN json_build_object('success', true, 'created', false, 'message', 'no_referral_code');
  END IF;

  -- Prevent self-referral by mistake if codes somehow collide
  SELECT user_id INTO _referrer_id
  FROM public.referral_codes
  WHERE referral_code = _profile.referred_by_code;

  IF _referrer_id IS NULL OR _referrer_id = _user_id THEN
    RETURN json_build_object('success', false, 'error', 'invalid_referral_code');
  END IF;

  -- If referral already exists, nothing to do
  IF EXISTS (
    SELECT 1 FROM public.referrals WHERE referred_user_id = _user_id
  ) THEN
    RETURN json_build_object('success', true, 'created', false, 'message', 'already_exists');
  END IF;

  -- Decide status based on activation
  IF COALESCE(_profile.is_account_activated, false) THEN
    _status := 'active';
  ELSE
    _status := 'pending';
  END IF;

  -- Create referral record
  INSERT INTO public.referrals (referrer_id, referred_user_id, status, activated_at)
  VALUES (_referrer_id, _user_id, _status, CASE WHEN _status = 'active' THEN now() ELSE NULL END);

  _created := TRUE;

  -- If active immediately, grant rewards and achievements
  IF _status = 'active' THEN
    UPDATE public.referral_rewards
    SET rewards_balance = rewards_balance + _reward_amount,
        total_earned = total_earned + _reward_amount,
        active_referrals_count = active_referrals_count + 1,
        updated_at = now()
    WHERE user_id = _referrer_id;

    PERFORM public.check_and_award_achievements(_referrer_id);
  END IF;

  RETURN json_build_object('success', true, 'created', _created, 'status', _status, 'referrer_id', _referrer_id);
END;
$$;

-- Wrapper: ensure referral for current authenticated user
CREATE OR REPLACE FUNCTION public.ensure_referral_for_current_user()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not_authenticated');
  END IF;
  RETURN public.ensure_user_referral(auth.uid());
END;
$$;

-- Backfill: Create missing referrals for existing users who have a referred_by_code
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT p.user_id
    FROM public.profiles p
    LEFT JOIN public.referrals r ON r.referred_user_id = p.user_id
    WHERE p.referred_by_code IS NOT NULL
      AND trim(p.referred_by_code) <> ''
      AND r.id IS NULL
  LOOP
    PERFORM public.ensure_user_referral(rec.user_id);
  END LOOP;
END $$;