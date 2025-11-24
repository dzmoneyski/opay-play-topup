-- Fix cancel_fraudulent_referral to accept pending and active referrals
CREATE OR REPLACE FUNCTION public.cancel_fraudulent_referral(
  _referral_id UUID,
  _admin_id UUID,
  _admin_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _referrer_id UUID;
  _referred_user_id UUID;
  _reward_amount NUMERIC;
  _current_status TEXT;
  _result JSON;
BEGIN
  -- Check if caller is admin
  IF NOT public.has_role(_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can cancel referrals';
  END IF;

  -- Get referral details (accept both pending and active statuses)
  SELECT referrer_id, referred_user_id, reward_amount, status
  INTO _referrer_id, _referred_user_id, _reward_amount, _current_status
  FROM public.referrals
  WHERE id = _referral_id 
    AND status IN ('pending', 'active');

  IF _referrer_id IS NULL THEN
    RAISE EXCEPTION 'Referral not found or already cancelled';
  END IF;

  -- Cancel the referral
  UPDATE public.referrals
  SET status = 'cancelled'
  WHERE id = _referral_id;

  -- Only deduct reward if referral was active (reward was already given)
  IF _current_status = 'active' THEN
    UPDATE public.referral_rewards
    SET 
      rewards_balance = GREATEST(rewards_balance - _reward_amount, 0),
      active_referrals_count = GREATEST(active_referrals_count - 1, 0),
      updated_at = now()
    WHERE user_id = _referrer_id;
  END IF;

  -- Update suspicious_referrals status to confirmed_fraud
  UPDATE public.suspicious_referrals
  SET 
    status = 'confirmed_fraud',
    reviewed_by = _admin_id,
    reviewed_at = now(),
    admin_notes = _admin_notes
  WHERE referral_id = _referral_id;

  _result := json_build_object(
    'success', true,
    'message', 'Referral cancelled successfully',
    'referrer_id', _referrer_id,
    'amount_deducted', CASE WHEN _current_status = 'active' THEN _reward_amount ELSE 0 END
  );

  RETURN _result;
END;
$function$;