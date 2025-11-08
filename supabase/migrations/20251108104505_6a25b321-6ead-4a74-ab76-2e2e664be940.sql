-- إضافة سجل الإحالة المفقود
DO $$
DECLARE
  _referrer_id UUID := '14cce3f6-fe8a-4f71-b9af-06556c6e0a01';
  _referred_id UUID := 'fad2a354-d182-4df7-9fc1-a67a32f2db23';
  _reward_amount NUMERIC := 100.00;
BEGIN
  -- إنشاء سجل الإحالة إذا لم يكن موجوداً
  INSERT INTO public.referrals (referrer_id, referred_user_id, status, activated_at, created_at)
  SELECT 
    _referrer_id,
    _referred_id,
    'active',  -- مُفعّل مباشرة لأن الحساب مُفعّل
    '2025-11-08 10:41:34+00',
    '2025-11-08 10:41:34+00'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.referrals 
    WHERE referrer_id = _referrer_id AND referred_user_id = _referred_id
  );

  -- إضافة المكافأة للمُحيل
  UPDATE public.referral_rewards
  SET 
    rewards_balance = rewards_balance + _reward_amount,
    total_earned = total_earned + _reward_amount,
    active_referrals_count = active_referrals_count + 1,
    updated_at = now()
  WHERE user_id = _referrer_id;

  -- التحقق من الأوسمة
  PERFORM public.check_and_award_achievements(_referrer_id);
END $$;