
-- =====================================================
-- إصلاح تحذيرات Security Definer Views
-- تحويلها إلى Security Invoker
-- =====================================================

-- حذف الـ Views القديمة
DROP VIEW IF EXISTS public.user_gift_cards_view;
DROP VIEW IF EXISTS public.user_withdrawals_view;
DROP VIEW IF EXISTS public.user_transfers_view;

-- إعادة إنشاء View لبطاقات الهدايا مع Security Invoker
CREATE VIEW public.user_gift_cards_view
WITH (security_invoker = on)
AS
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

-- إعادة إنشاء View للسحوبات مع Security Invoker
CREATE VIEW public.user_withdrawals_view
WITH (security_invoker = on)
AS
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

-- إعادة إنشاء View للتحويلات مع Security Invoker
CREATE VIEW public.user_transfers_view
WITH (security_invoker = on)
AS
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

-- إضافة تعليقات توضيحية
COMMENT ON VIEW public.user_gift_cards_view IS 'View آمن لبطاقات الهدايا - يخفي الكود بعد الاستخدام (Security Invoker)';
COMMENT ON VIEW public.user_withdrawals_view IS 'View آمن للسحوبات - يخفي أرقام الحسابات (Security Invoker)';
COMMENT ON VIEW public.user_transfers_view IS 'View آمن للتحويلات - يخفي أرقام الهواتف (Security Invoker)';
