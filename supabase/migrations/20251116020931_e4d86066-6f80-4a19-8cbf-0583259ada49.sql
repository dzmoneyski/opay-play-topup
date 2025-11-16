
-- =====================================================
-- إلغاء التفعيل التلقائي للحسابات
-- =====================================================

-- 1. إلغاء trigger التفعيل التلقائي
DROP TRIGGER IF EXISTS update_account_activation_trigger ON public.profiles;
DROP FUNCTION IF EXISTS public.update_account_activation_status();

-- 2. تعديل دالة الموافقة على التحقق لإزالة التفعيل التلقائي
CREATE OR REPLACE FUNCTION public.approve_verification_request(_request_id uuid, _admin_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _user_id UUID;
BEGIN
  -- Check if caller is admin
  IF NOT public.has_role(_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can approve verification requests';
  END IF;
  
  -- Get user_id from verification request and update it
  UPDATE public.verification_requests 
  SET status = 'approved',
      reviewed_at = now(),
      reviewed_by = _admin_id
  WHERE id = _request_id
  RETURNING user_id INTO _user_id;
  
  -- ✅ Update profile verification status WITHOUT auto-activating account
  UPDATE public.profiles 
  SET is_identity_verified = TRUE,
      identity_verification_status = 'approved'
  WHERE user_id = _user_id;
  
  -- Note: Account activation must be done manually by admin in users page
END;
$function$;

COMMENT ON FUNCTION public.approve_verification_request IS 'الموافقة على طلب التحقق من الهوية - لا يفعّل الحساب تلقائياً';

-- 3. إنشاء دالة لتفعيل الحساب يدوياً
CREATE OR REPLACE FUNCTION public.admin_activate_account(
  _user_id uuid,
  _admin_id uuid,
  _admin_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _profile RECORD;
  _has_pending_referral BOOLEAN;
  _referrer_name TEXT;
BEGIN
  -- Check admin permission
  IF NOT has_role(_admin_id, 'admin') THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Get profile info
  SELECT * INTO _profile
  FROM public.profiles
  WHERE user_id = _user_id;

  IF _profile IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Check if already activated
  IF _profile.is_account_activated = TRUE THEN
    RETURN json_build_object('success', false, 'error', 'Account already activated');
  END IF;

  -- ⚠️ Check if user is part of a referral system
  SELECT EXISTS (
    SELECT 1 FROM public.referrals WHERE referred_user_id = _user_id
  ) INTO _has_pending_referral;

  IF _has_pending_referral THEN
    -- Get referrer name for warning
    SELECT p.full_name INTO _referrer_name
    FROM public.referrals r
    JOIN public.profiles p ON r.referrer_id = p.user_id
    WHERE r.referred_user_id = _user_id;
  END IF;

  -- Activate account
  UPDATE public.profiles
  SET is_account_activated = TRUE,
      updated_at = now()
  WHERE user_id = _user_id;

  -- This will trigger the referral activation if exists
  -- (via the existing trigger on profiles)

  RETURN json_build_object(
    'success', true,
    'message', 'تم تفعيل الحساب بنجاح',
    'has_referral', _has_pending_referral,
    'referrer_name', _referrer_name
  );
END;
$function$;

COMMENT ON FUNCTION public.admin_activate_account IS 'تفعيل الحساب يدوياً من قبل المشرف - مع تحذير عن الإحالات';

-- 4. إنشاء جدول لتسجيل تفعيلات الحسابات
CREATE TABLE IF NOT EXISTS public.account_activation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  activated_by uuid NOT NULL REFERENCES profiles(user_id),
  activation_reason text,
  admin_notes text,
  has_referral boolean DEFAULT false,
  referrer_id uuid REFERENCES profiles(user_id),
  activated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.account_activation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage activation log"
ON public.account_activation_log
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- 5. Trigger لتسجيل التفعيلات
CREATE OR REPLACE FUNCTION public.log_account_activation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _referrer_id UUID;
BEGIN
  -- Only log when account is activated (from false to true)
  IF NEW.is_account_activated = TRUE AND OLD.is_account_activated = FALSE THEN
    
    -- Check if user has referral
    SELECT referrer_id INTO _referrer_id
    FROM public.referrals
    WHERE referred_user_id = NEW.user_id;
    
    -- Log the activation
    INSERT INTO public.account_activation_log (
      user_id,
      activated_by,
      has_referral,
      referrer_id
    ) VALUES (
      NEW.user_id,
      auth.uid(),
      (_referrer_id IS NOT NULL),
      _referrer_id
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE TRIGGER log_account_activation_trigger
AFTER UPDATE OF is_account_activated ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.log_account_activation();
