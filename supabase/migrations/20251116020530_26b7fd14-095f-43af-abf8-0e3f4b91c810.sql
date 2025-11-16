
-- =====================================================
-- 1. إصلاح دالة ensure_user_referral لمنع تكرار الهواتف
-- =====================================================
CREATE OR REPLACE FUNCTION public.ensure_user_referral(_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _profile RECORD;
  _referrer_id UUID;
  _reward_amount NUMERIC := 100.00;
  _created BOOLEAN := FALSE;
  _status TEXT := 'pending';
  _ref_code TEXT;
  _referred_phone TEXT;
  _duplicate_count INTEGER;
BEGIN
  -- Fetch profile
  SELECT user_id, referred_by_code, is_account_activated, phone
  INTO _profile
  FROM public.profiles
  WHERE user_id = _user_id;

  IF _profile IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'profile_not_found');
  END IF;

  _referred_phone := _profile.phone;

  -- If no referral code on profile, try to read from auth.users metadata
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

      _profile.referred_by_code := _ref_code;
    END IF;
  END IF;

  -- Still no referral code
  IF _profile.referred_by_code IS NULL OR TRIM(_profile.referred_by_code) = '' THEN
    RETURN json_build_object('success', true, 'created', false, 'message', 'no_referral_code');
  END IF;

  -- Get referrer ID
  SELECT user_id INTO _referrer_id
  FROM public.referral_codes
  WHERE referral_code = _profile.referred_by_code;

  IF _referrer_id IS NULL OR _referrer_id = _user_id THEN
    RETURN json_build_object('success', false, 'error', 'invalid_referral_code');
  END IF;

  -- ✅ NEW: Check if this phone number was already referred by the same referrer
  SELECT COUNT(*) INTO _duplicate_count
  FROM public.referrals r
  JOIN public.profiles p ON r.referred_user_id = p.user_id
  WHERE r.referrer_id = _referrer_id 
    AND p.phone = _referred_phone;

  IF _duplicate_count > 0 THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'duplicate_phone_referral',
      'message', 'هذا الرقم تمت إحالته من قبل لنفس المُحيل'
    );
  END IF;

  -- If referral already exists for this user, skip
  IF EXISTS (SELECT 1 FROM public.referrals WHERE referred_user_id = _user_id) THEN
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

  -- If active immediately, grant rewards
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
$function$;

-- =====================================================
-- 2. إنشاء جدول لتتبع الإحالات المشبوهة
-- =====================================================
CREATE TABLE IF NOT EXISTS public.suspicious_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  referred_user_id uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  referral_id uuid NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
  suspicious_reason text NOT NULL,
  duplicate_phone text,
  duplicate_count integer,
  flagged_at timestamp with time zone NOT NULL DEFAULT now(),
  reviewed_by uuid REFERENCES profiles(user_id),
  reviewed_at timestamp with time zone,
  status text NOT NULL DEFAULT 'pending', -- pending, confirmed_fraud, false_positive
  admin_notes text,
  UNIQUE(referral_id)
);

ALTER TABLE public.suspicious_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage suspicious referrals"
ON public.suspicious_referrals
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- =====================================================
-- 3. دالة للكشف عن الإحالات المشبوهة
-- =====================================================
CREATE OR REPLACE FUNCTION public.flag_suspicious_referrals()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _suspicious_record RECORD;
  _flagged_count INTEGER := 0;
BEGIN
  -- Find referrals with duplicate phone numbers
  FOR _suspicious_record IN
    SELECT 
      r.referrer_id,
      r.referred_user_id,
      r.id as referral_id,
      p.phone,
      COUNT(*) OVER (PARTITION BY r.referrer_id, p.phone) as duplicate_count
    FROM public.referrals r
    JOIN public.profiles p ON r.referred_user_id = p.user_id
    WHERE r.status IN ('active', 'pending')
  LOOP
    IF _suspicious_record.duplicate_count > 1 THEN
      INSERT INTO public.suspicious_referrals (
        referrer_id,
        referred_user_id,
        referral_id,
        suspicious_reason,
        duplicate_phone,
        duplicate_count
      ) VALUES (
        _suspicious_record.referrer_id,
        _suspicious_record.referred_user_id,
        _suspicious_record.referral_id,
        'duplicate_phone_number',
        _suspicious_record.phone,
        _suspicious_record.duplicate_count
      )
      ON CONFLICT (referral_id) DO NOTHING;
      
      _flagged_count := _flagged_count + 1;
    END IF;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'flagged_count', _flagged_count
  );
END;
$function$;

-- =====================================================
-- 4. دالة لإلغاء الإحالات المزيفة واسترجاع الأموال
-- =====================================================
CREATE OR REPLACE FUNCTION public.cancel_fraudulent_referral(
  _referral_id uuid,
  _admin_id uuid,
  _admin_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _referral RECORD;
  _reward_amount NUMERIC := 100.00;
BEGIN
  -- Check admin permission
  IF NOT has_role(_admin_id, 'admin') THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Get referral details
  SELECT * INTO _referral
  FROM public.referrals
  WHERE id = _referral_id;

  IF _referral IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Referral not found');
  END IF;

  -- Only cancel active referrals
  IF _referral.status != 'active' THEN
    RETURN json_build_object('success', false, 'error', 'Referral is not active');
  END IF;

  -- Deduct rewards from referrer
  UPDATE public.referral_rewards
  SET rewards_balance = GREATEST(0, rewards_balance - _reward_amount),
      total_earned = GREATEST(0, total_earned - _reward_amount),
      active_referrals_count = GREATEST(0, active_referrals_count - 1),
      updated_at = now()
  WHERE user_id = _referral.referrer_id;

  -- Mark referral as cancelled
  UPDATE public.referrals
  SET status = 'cancelled',
      activated_at = NULL
  WHERE id = _referral_id;

  -- Update suspicious referral record
  UPDATE public.suspicious_referrals
  SET status = 'confirmed_fraud',
      reviewed_by = _admin_id,
      reviewed_at = now(),
      admin_notes = _admin_notes
  WHERE referral_id = _referral_id;

  RETURN json_build_object(
    'success', true,
    'message', 'تم إلغاء الإحالة واسترجاع الأموال',
    'referral_id', _referral_id
  );
END;
$function$;

-- =====================================================
-- 5. تعديل دالة withdraw_referral_rewards لتتطلب مراجعة
-- =====================================================
CREATE OR REPLACE FUNCTION public.withdraw_referral_rewards(_amount numeric)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _user_id UUID;
  _rewards RECORD;
  _fee_percentage NUMERIC;
  _fee_amount NUMERIC;
  _net_amount NUMERIC;
  _withdrawal_id UUID;
BEGIN
  _user_id := auth.uid();
  
  IF _user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'المستخدم غير مسجل الدخول');
  END IF;

  -- Validate amount
  IF _amount IS NULL OR _amount <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'المبلغ غير صحيح');
  END IF;

  -- Get user rewards
  SELECT * INTO _rewards
  FROM public.referral_rewards
  WHERE user_id = _user_id;

  IF _rewards IS NULL OR _rewards.rewards_balance < _amount THEN
    RETURN json_build_object('success', false, 'error', 'رصيد المكافآت غير كافي');
  END IF;

  -- Calculate withdrawal fee (80% for less than 30 active referrals)
  _fee_percentage := calculate_withdrawal_fee_percentage(_rewards.active_referrals_count);
  _fee_amount := (_amount * _fee_percentage / 100);
  _net_amount := _amount - _fee_amount;

  -- ✅ NEW: Create PENDING withdrawal request instead of auto-approve
  INSERT INTO public.withdrawals (
    user_id,
    amount,
    withdrawal_method,
    status,
    notes,
    account_holder_name
  ) VALUES (
    _user_id,
    _net_amount,
    'referral_reward',
    'pending',
    'سحب من رصيد المكافآت - مبلغ قبل الخصم: ' || _amount || ' دج - عمولة: ' || _fee_amount || ' دج',
    'Referral Rewards Withdrawal'
  ) RETURNING id INTO _withdrawal_id;

  -- Deduct from rewards balance IMMEDIATELY (to prevent double withdrawal)
  UPDATE public.referral_rewards
  SET rewards_balance = rewards_balance - _amount,
      total_withdrawn = total_withdrawn + _amount,
      updated_at = now()
  WHERE user_id = _user_id;

  -- Record the withdrawal
  INSERT INTO public.referral_withdrawals (
    user_id,
    amount,
    fee_amount,
    net_amount,
    fee_percentage,
    active_referrals_count,
    status
  ) VALUES (
    _user_id,
    _amount,
    _fee_amount,
    _net_amount,
    _fee_percentage,
    _rewards.active_referrals_count,
    'pending'
  );

  RETURN json_build_object(
    'success', true,
    'message', 'تم إرسال طلب السحب للمراجعة',
    'withdrawal_id', _withdrawal_id,
    'amount', _amount,
    'fee_amount', _fee_amount,
    'net_amount', _net_amount,
    'fee_percentage', _fee_percentage
  );
END;
$function$;

COMMENT ON FUNCTION public.withdraw_referral_rewards IS 'طلب سحب من رصيد المكافآت - يتطلب مراجعة إدارية';
