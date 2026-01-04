
-- =====================================================
-- إصلاح المشاكل الأمنية المتوسطة
-- =====================================================

-- تفعيل إضافة التشفير
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================
-- 1. إخفاء أكواد بطاقات الهدايا بعد الاستخدام
-- =====================================================

-- إنشاء دالة لإخفاء الكود
CREATE OR REPLACE FUNCTION public.mask_card_code(code text, show_last int DEFAULT 4)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF code IS NULL OR length(code) <= show_last THEN
    RETURN '****';
  END IF;
  RETURN repeat('*', length(code) - show_last) || right(code, show_last);
END;
$$;

-- =====================================================
-- 2. إخفاء أرقام الحسابات البنكية في السحوبات
-- =====================================================

-- إنشاء دالة لإخفاء رقم الحساب
CREATE OR REPLACE FUNCTION public.mask_account_number(account_num text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF account_num IS NULL OR length(account_num) <= 4 THEN
    RETURN '****';
  END IF;
  RETURN repeat('*', length(account_num) - 4) || right(account_num, 4);
END;
$$;

-- =====================================================
-- 3. إخفاء أرقام الهواتف
-- =====================================================

-- إنشاء دالة لإخفاء رقم الهاتف
CREATE OR REPLACE FUNCTION public.mask_phone_number(phone text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF phone IS NULL OR length(phone) <= 4 THEN
    RETURN '****';
  END IF;
  RETURN left(phone, 3) || repeat('*', length(phone) - 6) || right(phone, 3);
END;
$$;

-- =====================================================
-- 4. إنشاء Views آمنة
-- =====================================================

-- View آمن لبطاقات الهدايا
CREATE OR REPLACE VIEW public.user_gift_cards_view AS
SELECT 
  id,
  amount,
  is_used,
  used_by,
  used_at,
  created_at,
  updated_at,
  CASE 
    WHEN is_used = true THEN public.mask_card_code(card_code, 4)
    ELSE card_code
  END as card_code
FROM public.gift_cards;

-- View آمن للسحوبات
CREATE OR REPLACE VIEW public.user_withdrawals_view AS
SELECT 
  id,
  user_id,
  amount,
  withdrawal_method,
  status,
  processed_at,
  processed_by,
  created_at,
  updated_at,
  admin_notes,
  public.mask_account_number(account_number) as account_number,
  CASE 
    WHEN account_holder_name IS NOT NULL THEN 
      left(account_holder_name, 2) || repeat('*', greatest(length(account_holder_name) - 2, 0))
    ELSE NULL
  END as account_holder_name,
  fee_amount,
  fee_percentage,
  fee_fixed,
  net_amount,
  cash_location,
  notes
FROM public.withdrawals;

-- View آمن للتحويلات
CREATE OR REPLACE VIEW public.user_transfers_view AS
SELECT 
  id,
  sender_id,
  recipient_id,
  amount,
  created_at,
  updated_at,
  CASE 
    WHEN sender_id = auth.uid() THEN sender_phone
    ELSE public.mask_phone_number(sender_phone)
  END as sender_phone,
  CASE 
    WHEN recipient_id = auth.uid() THEN recipient_phone
    ELSE public.mask_phone_number(recipient_phone)
  END as recipient_phone,
  note,
  status,
  transaction_number
FROM public.transfers
WHERE sender_id = auth.uid() OR recipient_id = auth.uid();

-- =====================================================
-- 5. دالة آمنة للحصول على بيانات طلبات التحقق
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_user_verification_request()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  full_name text,
  national_id_masked text,
  status text,
  rejection_reason text,
  submitted_at timestamptz,
  reviewed_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id,
    v.user_id,
    v.full_name,
    left(v.national_id, 4) || repeat('*', greatest(length(v.national_id) - 8, 4)) || right(v.national_id, 4) as national_id_masked,
    v.status,
    v.rejection_reason,
    v.submitted_at,
    v.reviewed_at
  FROM public.verification_requests v
  WHERE v.user_id = auth.uid();
END;
$$;

-- =====================================================
-- 6. تحديث سياسات RLS لبطاقات الهدايا
-- =====================================================

DROP POLICY IF EXISTS "Users can view own redeemed cards" ON public.gift_cards;

CREATE POLICY "Users can view own redeemed cards masked"
ON public.gift_cards
FOR SELECT
USING (used_by = auth.uid());

-- =====================================================
-- 7. إضافة تعليقات توضيحية
-- =====================================================

COMMENT ON VIEW public.user_gift_cards_view IS 'View آمن لبطاقات الهدايا - يخفي الكود بعد الاستخدام';
COMMENT ON VIEW public.user_withdrawals_view IS 'View آمن للسحوبات - يخفي أرقام الحسابات';
COMMENT ON VIEW public.user_transfers_view IS 'View آمن للتحويلات - يخفي أرقام الهواتف للأطراف الأخرى';
COMMENT ON FUNCTION public.mask_card_code IS 'إخفاء أكواد البطاقات مع إظهار آخر 4 أحرف';
COMMENT ON FUNCTION public.mask_account_number IS 'إخفاء أرقام الحسابات البنكية مع إظهار آخر 4 أرقام';
COMMENT ON FUNCTION public.mask_phone_number IS 'إخفاء أرقام الهواتف مع إظهار أول 3 وآخر 3 أرقام';
