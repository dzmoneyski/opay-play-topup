-- Create referral codes and rewards for existing users who don't have them yet
DO $$
DECLARE
  _profile RECORD;
  _referral_code TEXT;
BEGIN
  FOR _profile IN 
    SELECT user_id FROM public.profiles
    WHERE user_id NOT IN (SELECT user_id FROM public.referral_codes)
  LOOP
    -- Generate unique code
    _referral_code := public.generate_unique_referral_code();
    
    -- Insert referral code
    INSERT INTO public.referral_codes (user_id, referral_code)
    VALUES (_profile.user_id, _referral_code)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Initialize rewards balance
    INSERT INTO public.referral_rewards (user_id)
    VALUES (_profile.user_id)
    ON CONFLICT (user_id) DO NOTHING;
  END LOOP;
END $$;

-- Create function to ensure referral code exists
CREATE OR REPLACE FUNCTION public.ensure_referral_code(_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _code TEXT;
BEGIN
  -- Try to get existing code
  SELECT referral_code INTO _code
  FROM public.referral_codes
  WHERE user_id = _user_id;
  
  -- If no code exists, create one
  IF _code IS NULL THEN
    _code := public.generate_unique_referral_code();
    
    INSERT INTO public.referral_codes (user_id, referral_code)
    VALUES (_user_id, _code)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Also ensure rewards balance exists
    INSERT INTO public.referral_rewards (user_id)
    VALUES (_user_id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  RETURN _code;
END;
$$;