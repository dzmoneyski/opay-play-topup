
-- ========================================
-- 1. Trigger: منع إنشاء طلب جديد إذا كان هناك طلب معلق
-- ========================================
CREATE OR REPLACE FUNCTION public.check_pending_verification_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.verification_requests
    WHERE user_id = NEW.user_id AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'لديك طلب تحقق معلق بالفعل. يرجى انتظار المراجعة.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS enforce_single_pending_verification ON public.verification_requests;
CREATE TRIGGER enforce_single_pending_verification
  BEFORE INSERT ON public.verification_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.check_pending_verification_limit();

-- ========================================
-- 2. تعديل approve_verification_request للتحقق من الحالة
-- ========================================
CREATE OR REPLACE FUNCTION public.approve_verification_request(_request_id UUID, _admin_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
  _current_status TEXT;
BEGIN
  -- التحقق من صلاحيات المسؤول
  IF NOT public.has_role(_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can approve verification requests';
  END IF;
  
  -- التحقق من الحالة الحالية
  SELECT status, user_id INTO _current_status, _user_id
  FROM public.verification_requests
  WHERE id = _request_id;
  
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Verification request not found';
  END IF;
  
  IF _current_status <> 'pending' THEN
    RAISE EXCEPTION 'لا يمكن الموافقة على طلب بحالة: %', _current_status;
  END IF;
  
  -- تحديث طلب التحقق
  UPDATE public.verification_requests 
  SET status = 'approved',
      reviewed_at = now(),
      reviewed_by = _admin_id
  WHERE id = _request_id;
  
  -- تحديث حالة التحقق في الملف الشخصي
  UPDATE public.profiles 
  SET is_identity_verified = TRUE,
      identity_verification_status = 'approved'
  WHERE user_id = _user_id;
  
  -- تفعيل الحساب تلقائياً
  PERFORM public.admin_activate_account(_user_id, _admin_id, 'تم تفعيل الحساب تلقائياً بعد التحقق من الهوية');
END;
$$;

-- ========================================
-- 3. تعديل reject_verification_request للتحقق من الحالة
-- ========================================
CREATE OR REPLACE FUNCTION public.reject_verification_request(_request_id UUID, _admin_id UUID, _reason TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
  _current_status TEXT;
BEGIN
  -- Check if caller is admin
  IF NOT public.has_role(_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can reject verification requests';
  END IF;
  
  -- التحقق من الحالة الحالية
  SELECT status, user_id INTO _current_status, _user_id
  FROM public.verification_requests
  WHERE id = _request_id;
  
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Verification request not found';
  END IF;
  
  IF _current_status <> 'pending' THEN
    RAISE EXCEPTION 'لا يمكن رفض طلب بحالة: %', _current_status;
  END IF;
  
  -- تحديث طلب التحقق
  UPDATE public.verification_requests 
  SET status = 'rejected',
      reviewed_at = now(),
      reviewed_by = _admin_id,
      rejection_reason = _reason
  WHERE id = _request_id;
  
  -- Update profile verification status
  UPDATE public.profiles 
  SET is_identity_verified = FALSE,
      identity_verification_status = 'rejected'
  WHERE user_id = _user_id;
END;
$$;

-- ========================================
-- 4. حذف السياسات المكررة
-- ========================================
DROP POLICY IF EXISTS "Users can create their verification request" ON public.verification_requests;

-- ========================================
-- 5. منع حذف وثائق الهوية بعد الرفع
-- ========================================
DROP POLICY IF EXISTS "Users can delete their own identity documents" ON storage.objects;
