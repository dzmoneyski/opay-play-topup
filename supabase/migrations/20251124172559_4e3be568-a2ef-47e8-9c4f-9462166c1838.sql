-- تحديث وظيفة قبول التحقق من الهوية لتفعيل الحساب وإضافة الإحالة تلقائياً
CREATE OR REPLACE FUNCTION public.approve_verification_request(
  _request_id UUID, 
  _admin_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
BEGIN
  -- التحقق من صلاحيات المسؤول
  IF NOT public.has_role(_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can approve verification requests';
  END IF;
  
  -- الحصول على معرف المستخدم وتحديث طلب التحقق
  UPDATE public.verification_requests 
  SET status = 'approved',
      reviewed_at = now(),
      reviewed_by = _admin_id
  WHERE id = _request_id
  RETURNING user_id INTO _user_id;
  
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Verification request not found';
  END IF;
  
  -- تحديث حالة التحقق في الملف الشخصي
  UPDATE public.profiles 
  SET is_identity_verified = TRUE,
      identity_verification_status = 'approved'
  WHERE user_id = _user_id;
  
  -- تفعيل الحساب تلقائياً
  PERFORM public.admin_activate_account(_user_id, _admin_id, 'تم تفعيل الحساب تلقائياً بعد التحقق من الهوية');
END;
$$;