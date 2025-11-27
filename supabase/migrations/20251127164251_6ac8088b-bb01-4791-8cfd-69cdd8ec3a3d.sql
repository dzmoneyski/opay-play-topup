-- Function without manual activation log insert (let trigger handle it with fix)
CREATE OR REPLACE FUNCTION public.activate_approved_accounts_and_process_referrals(_admin_id uuid DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  _profile RECORD;
  _referrer_id UUID;
  _activated_count INTEGER := 0;
  _referrals_processed INTEGER := 0;
  _system_admin UUID;
BEGIN
  -- If no admin_id provided, get the first admin
  IF _admin_id IS NULL THEN
    SELECT user_id INTO _system_admin
    FROM user_roles
    WHERE role = 'admin'
    LIMIT 1;
    
    _admin_id := _system_admin;
  END IF;

  -- Temporarily disable the trigger
  ALTER TABLE profiles DISABLE TRIGGER log_account_activation_trigger;

  -- Loop through all approved but not activated accounts
  FOR _profile IN 
    SELECT user_id, referred_by_code
    FROM profiles
    WHERE identity_verification_status IN ('approved', 'verified')
      AND (is_account_activated = false OR is_account_activated IS NULL)
  LOOP
    _referrer_id := NULL; -- Reset for each iteration
    
    -- Process referral first
    IF _profile.referred_by_code IS NOT NULL AND TRIM(_profile.referred_by_code) != '' THEN
      -- Find referrer by looking up the referral_code in referral_codes table
      SELECT user_id INTO _referrer_id
      FROM referral_codes
      WHERE referral_code = _profile.referred_by_code
      LIMIT 1;

      IF _referrer_id IS NOT NULL THEN
        -- Check if referral already exists
        IF NOT EXISTS (
          SELECT 1 FROM referrals 
          WHERE referrer_id = _referrer_id AND referred_user_id = _profile.user_id
        ) THEN
          -- Create referral record with 'active' status
          INSERT INTO referrals (referrer_id, referred_user_id, status, activated_at, reward_amount)
          VALUES (_referrer_id, _profile.user_id, 'active', now(), 100.00);
          
          _referrals_processed := _referrals_processed + 1;
        ELSE
          -- Update existing referral to active if it's pending
          UPDATE referrals
          SET status = 'active',
              activated_at = now()
          WHERE referrer_id = _referrer_id 
            AND referred_user_id = _profile.user_id
            AND status = 'pending';
            
          IF FOUND THEN
            _referrals_processed := _referrals_processed + 1;
          END IF;
        END IF;
      END IF;
    END IF;

    -- Insert into activation log manually
    INSERT INTO account_activation_log (
      user_id,
      activated_by,
      has_referral,
      referrer_id
    ) VALUES (
      _profile.user_id,
      _admin_id,
      (_referrer_id IS NOT NULL),
      _referrer_id
    );

    -- Activate the account
    UPDATE profiles
    SET is_account_activated = true
    WHERE user_id = _profile.user_id;
    
    _activated_count := _activated_count + 1;
  END LOOP;

  -- Re-enable the trigger
  ALTER TABLE profiles ENABLE TRIGGER log_account_activation_trigger;

  RETURN json_build_object(
    'success', true,
    'activated_accounts', _activated_count,
    'referrals_processed', _referrals_processed,
    'message', 'تم تفعيل ' || _activated_count || ' حساب ومعالجة ' || _referrals_processed || ' إحالة'
  );
END;
$function$;

-- Execute the function with admin ID
SELECT public.activate_approved_accounts_and_process_referrals('14cce3f6-fe8a-4f71-b9af-06556c6e0a01'::uuid);