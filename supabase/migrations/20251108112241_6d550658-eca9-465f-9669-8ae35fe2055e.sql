-- Improve referral robustness: fallback to auth metadata, auto-ensure on profile changes, and backfill

-- 1) Update ensure_user_referral to fallback to auth.users metadata when profiles.referred_by_code is missing
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
  _ref_code TEXT;
BEGIN
  -- Fetch profile
  SELECT user_id, referred_by_code, is_account_activated
  INTO _profile
  FROM public.profiles
  WHERE user_id = _user_id;

  IF _profile IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'profile_not_found');
  END IF;

  -- If no referral code on profile, try to read from auth.users metadata and persist it
  IF _profile.referred_by_code IS NULL OR TRIM(_profile.referred_by_code) = '' THEN
    SELECT NULLIF(TRIM(u.raw_user_meta_data->>'referred_by_code'), '')
      INTO _ref_code
    FROM auth.users u
    WHERE u.id = _user_id;

    IF _ref_code IS NOT NULL THEN
      UPDATE public.profiles
      SET referred_by_code = _ref_code,
          updated_at = now()
      WHERE user_id = _user_id;

      -- reflect in local variable so we continue the flow
      _profile.referred_by_code := _ref_code;
    END IF;
  END IF;

  -- Still no referral code
  IF _profile.referred_by_code IS NULL OR TRIM(_profile.referred_by_code) = '' THEN
    RETURN json_build_object('success', true, 'created', false, 'message', 'no_referral_code');
  END IF;

  -- Prevent self-referral or invalid code
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

-- 2) Create trigger to auto-ensure referral when referred_by_code changes or on insert
CREATE OR REPLACE FUNCTION public.ensure_referral_on_profile_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    PERFORM public.ensure_user_referral(NEW.user_id);
  ELSIF (TG_OP = 'UPDATE') THEN
    IF NEW.referred_by_code IS DISTINCT FROM OLD.referred_by_code AND COALESCE(TRIM(NEW.referred_by_code), '') <> '' THEN
      PERFORM public.ensure_user_referral(NEW.user_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger after insert
DROP TRIGGER IF EXISTS trg_profiles_after_insert_ensure_referral ON public.profiles;
CREATE TRIGGER trg_profiles_after_insert_ensure_referral
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_referral_on_profile_change();

-- Trigger after update of referred_by_code
DROP TRIGGER IF EXISTS trg_profiles_after_update_ensure_referral ON public.profiles;
CREATE TRIGGER trg_profiles_after_update_ensure_referral
  AFTER UPDATE OF referred_by_code ON public.profiles
  FOR EACH ROW
  WHEN (NEW.referred_by_code IS DISTINCT FROM OLD.referred_by_code)
  EXECUTE FUNCTION public.ensure_referral_on_profile_change();

-- 3) Backfill: try to ensure referrals for users missing a referral row (pulling code from auth metadata if needed)
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT p.user_id
    FROM public.profiles p
    LEFT JOIN public.referrals r ON r.referred_user_id = p.user_id
    WHERE r.id IS NULL
  LOOP
    PERFORM public.ensure_user_referral(rec.user_id);
  END LOOP;
END $$;