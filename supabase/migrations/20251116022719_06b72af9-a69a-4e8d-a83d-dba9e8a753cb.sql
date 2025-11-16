
-- دالة لحظر مستخدم محتال وإلغاء إحالاته واسترجاع الأموال
CREATE OR REPLACE FUNCTION public.ban_fraudulent_user(
  _user_id UUID,
  _admin_id UUID,
  _ban_reason TEXT DEFAULT 'احتيال في نظام الإحالات'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _referral_count INTEGER;
  _total_stolen NUMERIC;
  _current_balance NUMERIC;
  _rewards_balance NUMERIC;
BEGIN
  -- التحقق من صلاحية المشرف
  IF NOT public.has_role(_admin_id, 'admin') THEN
    RETURN json_build_object('success', false, 'error', 'صلاحيات غير كافية');
  END IF;

  -- حساب الإحالات المزيفة
  SELECT COUNT(*), COALESCE(SUM(reward_amount), 0)
  INTO _referral_count, _total_stolen
  FROM public.referrals
  WHERE referrer_id = _user_id AND status IN ('pending', 'active');

  -- الحصول على الأرصدة الحالية
  SELECT balance INTO _current_balance
  FROM public.user_balances
  WHERE user_id = _user_id;

  SELECT rewards_balance INTO _rewards_balance
  FROM public.referral_rewards
  WHERE user_id = _user_id;

  -- 1. حظر الحساب
  UPDATE public.profiles
  SET 
    is_account_activated = false,
    updated_at = now()
  WHERE user_id = _user_id;

  -- 2. إلغاء جميع الإحالات
  UPDATE public.referrals
  SET status = 'cancelled'
  WHERE referrer_id = _user_id
    AND status IN ('pending', 'active');

  -- 3. إلغاء رصيد الإحالات
  UPDATE public.referral_rewards
  SET 
    rewards_balance = 0,
    active_referrals_count = 0,
    updated_at = now()
  WHERE user_id = _user_id;

  -- 4. مصادرة الرصيد المتبقي
  UPDATE public.user_balances
  SET 
    balance = 0,
    updated_at = now()
  WHERE user_id = _user_id;

  -- 5. تسجيل الحظر في جدول منفصل (اختياري للمستقبل)
  -- يمكن إنشاء جدول banned_users لتوثيق الحظر

  RETURN json_build_object(
    'success', true,
    'message', 'تم حظر المستخدم المحتال بنجاح',
    'user_id', _user_id,
    'cancelled_referrals', _referral_count,
    'total_stolen', _total_stolen,
    'confiscated_balance', _current_balance,
    'confiscated_rewards', _rewards_balance,
    'ban_reason', _ban_reason
  );
END;
$$;

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION public.ban_fraudulent_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.ban_fraudulent_user TO service_role;
