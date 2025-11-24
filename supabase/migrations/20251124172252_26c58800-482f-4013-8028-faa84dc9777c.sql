-- تحديث وظيفة حظر المستخدم المحتال لتحديث حالة الإحالات المشبوهة
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
  _cancelled_count INTEGER := 0;
  _confiscated_balance NUMERIC := 0;
  _user_balance NUMERIC := 0;
  _rewards_balance NUMERIC := 0;
BEGIN
  -- التحقق من صلاحيات المسؤول
  IF NOT has_role(_admin_id, 'admin') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'غير مصرح لك بتنفيذ هذا الإجراء'
    );
  END IF;

  -- الحصول على أرصدة المستخدم قبل المصادرة
  SELECT balance INTO _user_balance
  FROM user_balances
  WHERE user_id = _user_id;

  SELECT rewards_balance INTO _rewards_balance
  FROM referral_rewards
  WHERE user_id = _user_id;

  _confiscated_balance := COALESCE(_user_balance, 0) + COALESCE(_rewards_balance, 0);

  -- إلغاء جميع الإحالات النشطة والمعلقة للمستخدم
  WITH cancelled_referrals AS (
    UPDATE referrals
    SET status = 'cancelled'
    WHERE referrer_id = _user_id 
    AND status IN ('active', 'pending')
    RETURNING id
  )
  SELECT COUNT(*) INTO _cancelled_count FROM cancelled_referrals;

  -- تحديث حالة جميع الإحالات المشبوهة إلى cancelled
  UPDATE suspicious_referrals
  SET 
    status = 'cancelled',
    admin_notes = COALESCE(admin_notes || E'\n', '') || 'تم حظر المستخدم بواسطة المسؤول',
    reviewed_by = _admin_id,
    reviewed_at = NOW()
  WHERE referrer_id = _user_id;

  -- إعادة تعيين رصيد الإحالات إلى صفر
  UPDATE referral_rewards
  SET 
    rewards_balance = 0,
    active_referrals_count = 0,
    updated_at = NOW()
  WHERE user_id = _user_id;

  -- مصادرة رصيد المستخدم الرئيسي
  UPDATE user_balances
  SET 
    balance = 0,
    updated_at = NOW()
  WHERE user_id = _user_id;

  -- تسجيل الحظر في جدول account_activation_log
  INSERT INTO account_activation_log (
    user_id,
    activated_by,
    activation_reason,
    admin_notes
  ) VALUES (
    _user_id,
    _admin_id,
    'user_banned',
    _ban_reason
  );

  -- تعطيل الحساب
  UPDATE profiles
  SET 
    is_account_activated = false,
    updated_at = NOW()
  WHERE user_id = _user_id;

  RETURN json_build_object(
    'success', true,
    'cancelled_referrals', _cancelled_count,
    'confiscated_balance', _confiscated_balance
  );
END;
$$;